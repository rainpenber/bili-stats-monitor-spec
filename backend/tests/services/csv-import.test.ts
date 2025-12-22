import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  parseFilename,
  validateFollowerRow,
  validateVideoRow,
  validateCSVHeaders,
  findOrCreateTask,
} from '../../src/services/csv-import'
import { CSVRow } from '../../src/utils/csv-parser'
import { createDb } from '../../src/db'
import { getDbConfig } from '../../src/config/database'
import { loadEnv } from '../../src/config/env'
import { tasks } from '../../src/db/schema'
import { eq, and } from 'drizzle-orm'

describe('CSV Import Service', () => {
  describe('parseFilename', () => {
    test('解析粉丝数据文件名', () => {
      const result = parseFilename('28457_follower.csv')
      expect(result).not.toBeNull()
      expect(result?.type).toBe('author')
      expect(result?.targetId).toBe('28457')
      expect(result?.uid).toBe('28457')
    })

    test('解析视频数据文件名', () => {
      const result = parseFilename('BV11A7fzTEti_views.csv')
      expect(result).not.toBeNull()
      expect(result?.type).toBe('video')
      expect(result?.targetId).toBe('BV11A7fzTEti')
      expect(result?.bvid).toBe('BV11A7fzTEti')
    })

    test('处理带路径的文件名', () => {
      const result = parseFilename('backend/data/old-migrate/28457_follower.csv')
      expect(result).not.toBeNull()
      expect(result?.type).toBe('author')
      expect(result?.targetId).toBe('28457')
    })

    test('处理无效文件名', () => {
      expect(parseFilename('invalid.csv')).toBeNull()
      expect(parseFilename('28457.csv')).toBeNull()
      expect(parseFilename('BV11A7fzTEti.csv')).toBeNull()
    })

    test('处理大小写不敏感', () => {
      const result1 = parseFilename('28457_FOLLOWER.CSV')
      expect(result1).not.toBeNull()
      expect(result1?.type).toBe('author')

      const result2 = parseFilename('BV11A7fzTEti_VIEWS.CSV')
      expect(result2).not.toBeNull()
      expect(result2?.type).toBe('video')
    })
  })

  describe('validateFollowerRow', () => {
    test('验证有效的粉丝数据', () => {
      const row: CSVRow = {
        时间: '2025-11-28 16:43',
        粉丝数: '321753',
      }
      const result = validateFollowerRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).not.toBeUndefined()
      expect(result.data?.follower).toBe(321753)
      expect(result.data?.collectedAt).toBeInstanceOf(Date)
    })

    test('处理无效时间', () => {
      const row: CSVRow = {
        时间: 'invalid-time',
        粉丝数: '321753',
      }
      const result = validateFollowerRow(row, 1)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('时间')
    })

    test('处理缺失粉丝数字段', () => {
      const row: CSVRow = {
        时间: '2025-11-28 16:43',
        粉丝数: '',
      }
      const result = validateFollowerRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.data?.follower).toBe(0) // 默认值
    })

    test('处理无效粉丝数', () => {
      const row: CSVRow = {
        时间: '2025-11-28 16:43',
        粉丝数: 'not-a-number',
      }
      const result = validateFollowerRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.data?.follower).toBe(0) // 默认值
    })

    test('处理负数粉丝数', () => {
      const row: CSVRow = {
        时间: '2025-11-28 16:43',
        粉丝数: '-100',
      }
      const result = validateFollowerRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.data?.follower).toBe(0) // 负数会被转换为 0
    })
  })

  describe('validateVideoRow', () => {
    test('验证有效的视频数据', () => {
      const row: CSVRow = {
        时间: '2025-05-13 18:09',
        播放量: '88',
        在线观看人数: '6',
        点赞: '13',
        投币: '10',
        收藏: '2',
        分享: '0',
        弹幕: '0',
      }
      const result = validateVideoRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).not.toBeUndefined()
      expect(result.data?.view).toBe(88)
      expect(result.data?.online).toBe(6)
      expect(result.data?.like).toBe(13)
      expect(result.data?.coin).toBe(10)
      expect(result.data?.favorite).toBe(2)
      expect(result.data?.share).toBe(0)
      expect(result.data?.danmaku).toBe(0)
    })

    test('处理缺失在线观看人数', () => {
      const row: CSVRow = {
        时间: '2025-05-13 18:09',
        播放量: '88',
        在线观看人数: '',
        点赞: '13',
        投币: '10',
        收藏: '2',
        分享: '0',
        弹幕: '0',
      }
      const result = validateVideoRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.data?.online).toBeNull()
    })

    test('处理无效时间', () => {
      const row: CSVRow = {
        时间: 'invalid-time',
        播放量: '88',
        在线观看人数: '6',
        点赞: '13',
        投币: '10',
        收藏: '2',
        分享: '0',
        弹幕: '0',
      }
      const result = validateVideoRow(row, 1)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    test('处理缺失数值字段', () => {
      const row: CSVRow = {
        时间: '2025-05-13 18:09',
        播放量: '',
        在线观看人数: '',
        点赞: '',
        投币: '',
        收藏: '',
        分享: '',
        弹幕: '',
      }
      const result = validateVideoRow(row, 1)
      expect(result.valid).toBe(true)
      expect(result.data?.view).toBe(0)
      expect(result.data?.online).toBeNull()
      expect(result.data?.like).toBe(0)
    })
  })

  describe('validateCSVHeaders', () => {
    test('验证有效的表头', () => {
      const headers = ['时间', '粉丝数']
      const result = validateCSVHeaders(headers, ['时间', '粉丝数'])
      expect(result.valid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    test('检测缺失的列', () => {
      const headers = ['时间']
      const result = validateCSVHeaders(headers, ['时间', '粉丝数'])
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('粉丝数')
    })

    test('验证视频数据表头', () => {
      const headers = ['时间', '播放量', '在线观看人数', '点赞', '投币', '收藏', '分享', '弹幕']
      const result = validateCSVHeaders(headers, [
        '时间',
        '播放量',
        '在线观看人数',
        '点赞',
        '投币',
        '收藏',
        '分享',
        '弹幕',
      ])
      expect(result.valid).toBe(true)
    })
  })

  describe('findOrCreateTask', () => {
    let db: ReturnType<typeof createDb>

    beforeEach(async () => {
      // 使用测试数据库（SQLite 内存数据库）
      const env = loadEnv()
      const dbConfig = getDbConfig(env)
      // 如果配置是 PostgreSQL，跳过测试（需要真实数据库）
      if (dbConfig.type === 'postgres') {
        return
      }
      db = createDb(dbConfig)
    })

    afterEach(async () => {
      if (db) {
        // 清理测试数据
        try {
          await db.delete(tasks).where(eq(tasks.type, 'author'))
          await db.delete(tasks).where(eq(tasks.type, 'video'))
        } catch (error) {
          // 忽略清理错误
        }
      }
    })

    test('创建新任务（作者）', async () => {
      if (!db) {
        return // 跳过 PostgreSQL 测试
      }

      const taskId = await findOrCreateTask(db, 'author', '28457', '测试作者', {
        enabled: false,
      })

      expect(taskId).toBeTruthy()

      // 验证任务已创建
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.type, 'author'), eq(tasks.targetId, '28457')))
        .limit(1)

      expect(task).toHaveLength(1)
      expect(task[0].id).toBe(taskId)
      expect(task[0].title).toBe('测试作者')
      expect(task[0].status).toBe('stopped') // enabled=false
      expect(task[0].targetId).toBe('28457')
    })

    test('创建新任务（视频）', async () => {
      if (!db) {
        return // 跳过 PostgreSQL 测试
      }

      const taskId = await findOrCreateTask(db, 'video', 'BV11A7fzTEti', undefined, {
        enabled: true,
      })

      expect(taskId).toBeTruthy()

      // 验证任务已创建
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.type, 'video'), eq(tasks.targetId, 'BV11A7fzTEti')))
        .limit(1)

      expect(task).toHaveLength(1)
      expect(task[0].id).toBe(taskId)
      expect(task[0].title).toBe('BV11A7fzTEti') // 默认使用 targetId
      expect(task[0].status).toBe('running') // enabled=true
    })

    test('查找已存在的任务', async () => {
      if (!db) {
        return // 跳过 PostgreSQL 测试
      }

      // 先创建一个任务
      const firstTaskId = await findOrCreateTask(db, 'author', '28457', '测试作者', {
        enabled: false,
      })

      // 再次调用应该返回相同的任务 ID
      const secondTaskId = await findOrCreateTask(db, 'author', '28457', '新标题', {
        enabled: true,
      })

      expect(firstTaskId).toBe(secondTaskId)

      // 验证任务没有被重复创建
      const allTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.type, 'author'), eq(tasks.targetId, '28457')))

      expect(allTasks).toHaveLength(1)
    })

    test('任务默认值设置', async () => {
      if (!db) {
        return // 跳过 PostgreSQL 测试
      }

      const taskId = await findOrCreateTask(db, 'author', '99999', undefined, {
        enabled: false,
      })

      const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)

      expect(task).toHaveLength(1)
      const t = task[0]

      // 验证默认值
      expect(t.title).toBe('99999') // 默认使用 targetId
      expect(t.status).toBe('stopped') // enabled=false
      expect(t.accountId).toBeNull()
      expect(t.cid).toBeNull()
      expect(t.cidRetries).toBe(0)
      expect(t.nextRunAt).toBeNull()
      expect(t.publishedAt).toBeNull()
      expect(t.tags).toEqual([])

      // 验证 strategy
      const strategy = t.strategy as any
      expect(strategy.mode).toBe('fixed')
      expect(strategy.value).toBe(240) // 4 小时
      expect(strategy.unit).toBe('minute')

      // 验证 deadline（应该是很远的未来日期）
      expect(t.deadline).toBeInstanceOf(Date)
      expect(t.deadline.getFullYear()).toBeGreaterThan(2090)
    })
  })
})

