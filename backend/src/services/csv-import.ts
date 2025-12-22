/**
 * CSV 导入服务
 * 处理 CSV 文件解析、数据验证、任务管理和数据库导入
 */

import { parseTime } from '../utils/time-parser'
import { CSVRow, parseCSVFile } from '../utils/csv-parser'
import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import type { DrizzleInstance } from '../db'
import { tasks, authorMetrics, videoMetrics } from '../db/schema'

/**
 * 文件名解析结果
 */
export interface FilenameParseResult {
  type: 'author' | 'video'
  targetId: string
  uid?: string
  bvid?: string
}

/**
 * 验证错误
 */
export interface ValidationError {
  row: number
  field?: string
  message: string
  data?: CSVRow
}

/**
 * 粉丝数据验证结果
 */
export interface FollowerValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: {
    collectedAt: Date
    follower: number
  }
}

/**
 * 视频数据验证结果
 */
export interface VideoValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: {
    collectedAt: Date
    view: number
    online: number | null
    like: number
    coin: number
    favorite: number
    share: number
    danmaku: number
  }
}

/**
 * 从文件名解析任务类型和标识符
 * @param filename 文件名（如 "28457_follower.csv" 或 "BV11A7fzTEti_views.csv"）
 * @returns 解析结果
 */
export function parseFilename(filename: string): FilenameParseResult | null {
  // 移除路径，只保留文件名
  const basename = filename.split(/[/\\]/).pop() || filename

  // 匹配 _follower.csv 格式
  const followerMatch = basename.match(/^(\d+)_follower\.csv$/i)
  if (followerMatch) {
    const uid = followerMatch[1]
    return {
      type: 'author',
      targetId: uid,
      uid,
    }
  }

  // 匹配 _views.csv 格式
  const viewsMatch = basename.match(/^(BV\w+)_views\.csv$/i)
  if (viewsMatch) {
    const bvid = viewsMatch[1]
    return {
      type: 'video',
      targetId: bvid,
      bvid,
    }
  }

  return null
}

/**
 * 解析整数，无效值返回默认值
 */
function parseInteger(value: string | undefined, defaultValue: number = 0): number {
  if (!value || value.trim() === '') {
    return defaultValue
  }
  const parsed = parseInt(value.trim(), 10)
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed) // 确保非负
}

/**
 * 解析可选的整数，无效值返回 null
 */
function parseOptionalInteger(value: string | undefined): number | null {
  if (!value || value.trim() === '') {
    return null
  }
  const parsed = parseInt(value.trim(), 10)
  return isNaN(parsed) ? null : Math.max(0, parsed)
}

/**
 * 验证粉丝数据行
 * @param row CSV 行数据
 * @param rowNumber 行号（用于错误报告）
 * @returns 验证结果
 */
export function validateFollowerRow(
  row: CSVRow,
  rowNumber: number
): FollowerValidationResult {
  const errors: ValidationError[] = []

  // 验证时间字段
  const timeStr = row['时间'] || row['时间戳'] || ''
  const collectedAt = parseTime(timeStr)
  if (!collectedAt) {
    errors.push({
      row: rowNumber,
      field: '时间',
      message: `时间格式无效: "${timeStr}"`,
      data: row,
    })
  }

  // 验证粉丝数字段
  const followerStr = row['粉丝数'] || row['follower'] || ''
  const follower = parseInteger(followerStr, 0)

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    }
  }

  return {
    valid: true,
    errors: [],
    data: {
      collectedAt: collectedAt!,
      follower,
    },
  }
}

/**
 * 验证视频数据行
 * @param row CSV 行数据
 * @param rowNumber 行号（用于错误报告）
 * @returns 验证结果
 */
export function validateVideoRow(
  row: CSVRow,
  rowNumber: number
): VideoValidationResult {
  const errors: ValidationError[] = []

  // 验证时间字段
  const timeStr = row['时间'] || row['时间戳'] || ''
  const collectedAt = parseTime(timeStr)
  if (!collectedAt) {
    errors.push({
      row: rowNumber,
      field: '时间',
      message: `时间格式无效: "${timeStr}"`,
      data: row,
    })
  }

  // 验证数值字段
  const view = parseInteger(row['播放量'] || row['view'] || '', 0)
  const online = parseOptionalInteger(row['在线观看人数'] || row['online'] || '')
  const like = parseInteger(row['点赞'] || row['like'] || '', 0)
  const coin = parseInteger(row['投币'] || row['coin'] || '', 0)
  const favorite = parseInteger(row['收藏'] || row['favorite'] || '', 0)
  const share = parseInteger(row['分享'] || row['share'] || '', 0)
  const danmaku = parseInteger(row['弹幕'] || row['danmaku'] || '', 0)

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    }
  }

  return {
    valid: true,
    errors: [],
    data: {
      collectedAt: collectedAt!,
      view,
      online,
      like,
      coin,
      favorite,
      share,
      danmaku,
    },
  }
}

/**
 * 验证 CSV 文件列名
 * @param headers CSV 表头
 * @param expectedColumns 期望的列名数组
 * @returns 是否有效
 */
export function validateCSVHeaders(
  headers: string[],
  expectedColumns: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  for (const col of expectedColumns) {
    if (!headers.includes(col)) {
      missing.push(col)
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * 任务创建选项
 */
export interface TaskCreateOptions {
  /** 是否激活任务（enabled=true 时 status='running'，否则 status='stopped'） */
  enabled?: boolean
}

/**
 * 查找或创建监控任务
 * @param db 数据库实例
 * @param type 任务类型（'video' 或 'author'）
 * @param targetId 目标 ID（BV 号或 UID）
 * @param title 任务标题（默认为 targetId）
 * @param options 任务创建选项
 * @returns 任务 ID
 */
export async function findOrCreateTask(
  db: DrizzleInstance,
  type: 'video' | 'author',
  targetId: string,
  title?: string,
  options: TaskCreateOptions = {}
): Promise<string> {
  const { enabled = false } = options

  // 查找现有任务
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.type, type), eq(tasks.targetId, targetId)))
    .limit(1)

  if (existing.length > 0) {
    // 返回现有任务 ID
    return existing[0].id
  }

  // 创建新任务
  const taskId = nanoid()
  const taskTitle = title || targetId

  // 设置默认值
  const strategy = {
    mode: 'fixed' as const,
    value: 240, // 4 小时（分钟）
    unit: 'minute' as const,
  }

  // 根据 enabled 设置 status
  // enabled=true → status='running', enabled=false → status='stopped'
  const status = enabled ? 'running' : 'stopped'

  // deadline 设置为很远的未来日期（表示无限制）
  // schema 要求 notNull，所以不能设置为 null，使用 2099-12-31 作为"无限制"的表示
  const unlimitedDeadline = new Date('2099-12-31T23:59:59Z')

  await db.insert(tasks).values({
    id: taskId,
    type,
    targetId,
    title: taskTitle,
    strategy: strategy as any, // JSON 类型
    deadline: unlimitedDeadline,
    status,
    tags: [] as any, // JSON 类型
    accountId: null,
    cid: null,
    cidRetries: 0,
    nextRunAt: null,
    publishedAt: null,
  })

  return taskId
}

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 是否激活任务 */
  enabled?: boolean
  /** 是否更新已存在的记录 */
  updateExisting?: boolean
  /** 批量插入大小 */
  batchSize?: number
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 成功插入的记录数 */
  inserted: number
  /** 跳过的记录数（重复数据） */
  skipped: number
  /** 更新的记录数（updateExisting=true 时） */
  updated: number
  /** 错误列表 */
  errors: ValidationError[]
  /** 任务 ID */
  taskId: string
}

/**
 * 检查作者指标记录是否已存在
 */
async function checkAuthorRecordExists(
  db: DrizzleInstance,
  taskId: string,
  collectedAt: Date
): Promise<boolean> {
  const result = await db
    .select()
    .from(authorMetrics)
    .where(
      and(
        eq(authorMetrics.taskId, taskId),
        eq(authorMetrics.collectedAt, collectedAt)
      )
    )
    .limit(1)
  
  return result.length > 0
}

/**
 * 检查视频指标记录是否已存在
 */
async function checkVideoRecordExists(
  db: DrizzleInstance,
  taskId: string,
  collectedAt: Date
): Promise<boolean> {
  const result = await db
    .select()
    .from(videoMetrics)
    .where(
      and(
        eq(videoMetrics.taskId, taskId),
        eq(videoMetrics.collectedAt, collectedAt)
      )
    )
    .limit(1)
  
  return result.length > 0
}

/**
 * 导入粉丝数据文件
 * @param db 数据库实例
 * @param filePath CSV 文件路径
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importFollowerFile(
  db: DrizzleInstance,
  filePath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    enabled = false,
    updateExisting = false,
    batchSize = 100,
  } = options

  const result: ImportResult = {
    inserted: 0,
    skipped: 0,
    updated: 0,
    errors: [],
    taskId: '',
  }

  try {
    // 解析文件名获取任务信息
    const fileInfo = parseFilename(filePath)
    if (!fileInfo || fileInfo.type !== 'author') {
      throw new Error(`无效的文件名格式: ${filePath}`)
    }

    // 查找或创建任务
    const taskId = await findOrCreateTask(db, 'author', fileInfo.targetId, undefined, {
      enabled,
    })
    result.taskId = taskId

    // 批量缓冲区
    const batch: Array<{
      id: string
      taskId: string
      collectedAt: Date
      follower: number
    }> = []

    let rowNumber = 1 // 从 1 开始（表头是第 0 行）

    // 流式解析 CSV 文件
    for await (const rows of parseCSVFile(filePath, { batchSize: 100 })) {
      for (const row of rows) {
        rowNumber++

        // 验证数据
        const validation = validateFollowerRow(row, rowNumber)
        
        if (!validation.valid) {
          result.errors.push(...validation.errors)
          continue
        }

        const { collectedAt, follower } = validation.data!

        // 检查重复数据
        const exists = await checkAuthorRecordExists(db, taskId, collectedAt)
        
        if (exists && !updateExisting) {
          result.skipped++
          continue
        }

        if (exists && updateExisting) {
          // 更新现有记录
          await db
            .update(authorMetrics)
            .set({ follower })
            .where(
              and(
                eq(authorMetrics.taskId, taskId),
                eq(authorMetrics.collectedAt, collectedAt)
              )
            )
          result.updated++
        } else {
          // 添加到批量缓冲区
          batch.push({
            id: nanoid(),
            taskId,
            collectedAt,
            follower,
          })

          // 批量插入
          if (batch.length >= batchSize) {
            await db.insert(authorMetrics).values(batch as any)
            result.inserted += batch.length
            batch.length = 0
          }
        }
      }
    }

    // 插入剩余数据
    if (batch.length > 0) {
      await db.insert(authorMetrics).values(batch as any)
      result.inserted += batch.length
    }
  } catch (error) {
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : String(error),
    })
  }

  return result
}

/**
 * 导入视频数据文件
 * @param db 数据库实例
 * @param filePath CSV 文件路径
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importVideoFile(
  db: DrizzleInstance,
  filePath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    enabled = false,
    updateExisting = false,
    batchSize = 100,
  } = options

  const result: ImportResult = {
    inserted: 0,
    skipped: 0,
    updated: 0,
    errors: [],
    taskId: '',
  }

  try {
    // 解析文件名获取任务信息
    const fileInfo = parseFilename(filePath)
    if (!fileInfo || fileInfo.type !== 'video') {
      throw new Error(`无效的文件名格式: ${filePath}`)
    }

    // 查找或创建任务
    const taskId = await findOrCreateTask(db, 'video', fileInfo.targetId, undefined, {
      enabled,
    })
    result.taskId = taskId

    // 批量缓冲区
    const batch: Array<{
      id: string
      taskId: string
      collectedAt: Date
      view: number
      online: number | null
      like: number
      coin: number
      favorite: number
      share: number
      danmaku: number
      reply: number | null
    }> = []

    let rowNumber = 1 // 从 1 开始（表头是第 0 行）

    // 流式解析 CSV 文件
    for await (const rows of parseCSVFile(filePath, { batchSize: 100 })) {
      for (const row of rows) {
        rowNumber++

        // 验证数据
        const validation = validateVideoRow(row, rowNumber)
        
        if (!validation.valid) {
          result.errors.push(...validation.errors)
          continue
        }

        const { collectedAt, view, online, like, coin, favorite, share, danmaku } = validation.data!

        // 检查重复数据
        const exists = await checkVideoRecordExists(db, taskId, collectedAt)
        
        if (exists && !updateExisting) {
          result.skipped++
          continue
        }

        if (exists && updateExisting) {
          // 更新现有记录
          await db
            .update(videoMetrics)
            .set({
              view,
              online,
              like,
              coin,
              favorite,
              share,
              danmaku,
            })
            .where(
              and(
                eq(videoMetrics.taskId, taskId),
                eq(videoMetrics.collectedAt, collectedAt)
              )
            )
          result.updated++
        } else {
          // 添加到批量缓冲区
          batch.push({
            id: nanoid(),
            taskId,
            collectedAt,
            view,
            online,
            like,
            coin,
            favorite,
            share,
            danmaku,
            reply: null, // CSV 中不包含回复数
          })

          // 批量插入
          if (batch.length >= batchSize) {
            await db.insert(videoMetrics).values(batch as any)
            result.inserted += batch.length
            batch.length = 0
          }
        }
      }
    }

    // 插入剩余数据
    if (batch.length > 0) {
      await db.insert(videoMetrics).values(batch as any)
      result.inserted += batch.length
    }
  } catch (error) {
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : String(error),
    })
  }

  return result
}

