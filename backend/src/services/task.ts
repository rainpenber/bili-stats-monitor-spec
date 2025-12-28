import { nanoid } from 'nanoid'
import { eq, and, or, like, desc, asc, SQL, sql } from 'drizzle-orm'
import { tasks } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * 任务类型
 */
export type TaskType = 'video' | 'author'

/**
 * 任务状态
 */
export type TaskStatus = 'running' | 'stopped' | 'completed' | 'failed' | 'paused'

/**
 * 定时策略模式
 */
export type ScheduleMode = 'fixed' | 'smart_video'

/**
 * 定时策略
 */
export interface TaskStrategy {
  mode: ScheduleMode
  value?: number
  unit?: 'minute' | 'hour' | 'day'
}

/**
 * 创建任务数据
 */
export interface CreateTaskData {
  type: TaskType
  targetId: string
  title: string
  accountId?: string | null
  strategy: TaskStrategy
  deadline?: Date
  tags?: string[]
}

/**
 * 更新任务数据
 */
export interface UpdateTaskData {
  title?: string
  accountId?: string | null
  strategy?: TaskStrategy
  deadline?: Date
  tags?: string[]
  status?: TaskStatus
  pauseReason?: string | null
}

/**
 * 任务查询过滤条件
 */
export interface TaskFilters {
  type?: TaskType
  status?: TaskStatus
  search?: string // 搜索标题或 targetId
  tags?: string[] // 标签过滤（AND 逻辑）
  accountId?: string
  authorUid?: string // 按作者UID过滤
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'nextRunAt'
  orderDir?: 'asc' | 'desc'
}

/**
 * 任务服务
 */
export class TaskService {
  constructor(private db: DrizzleInstance) {}

  /**
   * 创建任务
   */
  async create(data: CreateTaskData): Promise<string> {
    const taskId = nanoid()
    const now = new Date()

    // 默认截止时间为 3 个月后
    const deadline = data.deadline || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // 计算下次运行时间
    const nextRun = this.calculateNextRun(now, data.strategy)

    await this.db.insert(tasks).values({
      id: taskId,
      type: data.type,
      targetId: data.targetId,
      title: data.title,
      cid: null,
      cidRetries: 0,
      accountId: data.accountId || null,
      strategy: data.strategy,
      deadline,
      status: 'running',
      reason: null,
      tags: data.tags || [],
      nextRunAt: nextRun,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    return taskId
  }

  /**
   * 根据 ID 查找任务
   */
  async findById(id: string) {
    const result = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    return result.length > 0 ? result[0] : null
  }

  /**
   * 查询任务列表
   */
  async findMany(filters: TaskFilters = {}) {
    const conditions: SQL[] = []

    // 类型过滤
    if (filters.type) {
      conditions.push(eq(tasks.type, filters.type))
    }

    // 状态过滤
    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status))
    }

    // 账号过滤
    if (filters.accountId) {
      conditions.push(eq(tasks.accountId, filters.accountId))
    }

    // 作者UID过滤
    if (filters.authorUid) {
      conditions.push(eq(tasks.authorUid, filters.authorUid))
    }

    // 搜索（标题或 targetId）
    if (filters.search) {
      conditions.push(
        or(
          like(tasks.title, `%${filters.search}%`),
          like(tasks.targetId, `%${filters.search}%`)
        )!
      )
    }

    // 标签过滤（使用 JSON 函数）
    // 注意：这里简化处理，实际需要根据数据库类型使用不同的 JSON 查询
    // SQLite: json_each, PostgreSQL: jsonb_array_elements
    if (filters.tags && filters.tags.length > 0) {
      // 简单实现：要求所有标签都存在
      for (const tag of filters.tags) {
        conditions.push(sql`json_type(${tasks.tags}) = 'array' AND ${tasks.tags} LIKE ${'%"' + tag + '"%'}`)
      }
    }

    // 排序
    const orderBy = filters.orderBy || 'createdAt'
    const orderDir = filters.orderDir || 'desc'
    const orderFn = orderDir === 'asc' ? asc : desc
    
    let orderByColumn
    switch (orderBy) {
      case 'updatedAt':
        orderByColumn = orderFn(tasks.updatedAt)
        break
      case 'nextRunAt':
        orderByColumn = orderFn(tasks.nextRunAt)
        break
      case 'createdAt':
      default:
        orderByColumn = orderFn(tasks.createdAt)
        break
    }

    // 构建完整的查询（一次性）
    let query = this.db
      .select()
      .from(tasks)
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!) as any
    }
    
    let result: Task[] = await (query as any).orderBy(orderByColumn)
    
    // 手动实现分页（因为Drizzle query builder链式调用有类型问题）
    if (filters.offset) {
      result = Array.from(result).slice(filters.offset)
    }
    if (filters.limit) {
      result = Array.from(result).slice(0, filters.limit)
    }

    return result
  }

  /**
   * 按作者UID查询任务列表
   * 
   * @param authorUid - 作者UID
   * @param options - 可选的排序和分页选项
   * @returns 任务列表
   */
  async getTasksByAuthorUid(
    authorUid: string,
    options: {
      orderBy?: 'createdAt' | 'updatedAt' | 'nextRunAt'
      orderDir?: 'asc' | 'desc'
      limit?: number
      offset?: number
    } = {}
  ): Promise<Task[]> {
    const orderBy = options.orderBy || 'createdAt'
    const orderDir = options.orderDir || 'desc'
    const orderFn = orderDir === 'asc' ? asc : desc
    
    let orderByColumn
    switch (orderBy) {
      case 'updatedAt':
        orderByColumn = orderFn(tasks.updatedAt)
        break
      case 'nextRunAt':
        orderByColumn = orderFn(tasks.nextRunAt)
        break
      case 'createdAt':
      default:
        orderByColumn = orderFn(tasks.createdAt)
        break
    }

    // 查询该作者发布的所有任务
    let query = this.db
      .select()
      .from(tasks)
      .where(eq(tasks.authorUid, authorUid))

    let result: Task[] = await (query as any).orderBy(orderByColumn)
    
    // 手动实现分页
    if (options.offset) {
      result = Array.from(result).slice(options.offset)
    }
    if (options.limit) {
      result = Array.from(result).slice(0, options.limit)
    }

    return result
  }

  /**
   * 更新任务
   */
  async update(id: string, data: UpdateTaskData): Promise<void> {
    const updates: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updates.title = data.title
    if (data.accountId !== undefined) updates.accountId = data.accountId
    if (data.strategy !== undefined) {
      updates.strategy = data.strategy
      // 如果策略改变，重新计算下次运行时间
      const task = await this.findById(id)
      if (task) {
        updates.nextRunAt = this.calculateNextRun(new Date(), data.strategy)
      }
    }
    if (data.deadline !== undefined) updates.deadline = data.deadline
    if (data.tags !== undefined) updates.tags = data.tags
    if (data.status !== undefined) updates.status = data.status
    if (data.pauseReason !== undefined) updates.reason = data.pauseReason

    await this.db.update(tasks).set(updates).where(eq(tasks.id, id))
  }

  /**
   * 删除任务（软删除，保留历史数据）
   */
  async delete(id: string): Promise<void> {
    // 将任务标记为已停止，而不是物理删除
    await this.update(id, { status: 'stopped' })
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRun(from: Date, strategy: TaskStrategy): Date {
    if (strategy.mode === 'fixed') {
      const value = strategy.value || 240 // 默认 240 分钟
      const unit = strategy.unit || 'minute'

      let milliseconds = 0
      switch (unit) {
        case 'minute':
          milliseconds = value * 60 * 1000
          break
        case 'hour':
          milliseconds = value * 60 * 60 * 1000
          break
        case 'day':
          milliseconds = value * 24 * 60 * 60 * 1000
          break
      }

      return new Date(from.getTime() + milliseconds)
    }

    // smart_video 模式将在 scheduler 中处理
    return new Date(from.getTime() + 10 * 60 * 1000) // 默认 10 分钟
  }
}

