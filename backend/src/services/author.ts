import { eq, sql, inArray, like, or, isNotNull, and } from 'drizzle-orm'
import { authorMetrics, tasks, authors, accounts } from '../db/schema'
import { biliClient } from './bili/client'
import type { DrizzleInstance } from '../db'

/**
 * 作者粉丝数据点
 */
export interface AuthorMetricDataPoint {
  collected_at: string // ISO 8601 timestamp
  follower: number
}

/**
 * 作者粉丝历史响应
 */
export interface AuthorMetricsResponse {
  uid: string
  metrics: AuthorMetricDataPoint[]
}

/**
 * AuthorService - 作者数据服务
 * 
 * 负责聚合和查询作者相关的粉丝数据
 */
export class AuthorService {
  constructor(private db: DrizzleInstance) {}

  /**
   * 获取指定作者的粉丝历史数据
   * 
   * 实现逻辑（参考research.md R2）：
   * - 查询所有关联该作者的tasks（通过author_uid）
   * - 聚合所有tasks的author_metrics记录
   * - 按collected_at分组，取MAX(follower)以避免重复时间戳
   * - 按时间升序排序
   * 
   * @param uid - 作者UID
   * @returns 粉丝历史数据点数组
   */
  async getAuthorMetrics(uid: string): Promise<AuthorMetricsResponse> {
    // Step 1: 查询该作者关联的所有task_ids
    const authorTasks = await this.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.authorUid, uid))

    const taskIds = authorTasks.map(t => t.id)

    // Step 2: 如果没有关联任务，返回空数据
    if (taskIds.length === 0) {
      return {
        uid,
        metrics: []
      }
    }

    // Step 3: 聚合查询author_metrics
    // 使用GROUP BY + MAX避免同一时间戳的重复记录
    const rawMetrics = await this.db
      .select({
        collected_at: sql<number>`strftime('%s', ${authorMetrics.collectedAt})`.as('collected_at'),
        follower: sql<number>`MAX(${authorMetrics.follower})`.as('follower')
      })
      .from(authorMetrics)
      .where(inArray(authorMetrics.taskId, taskIds))
      .groupBy(sql`strftime('%s', ${authorMetrics.collectedAt})`)
      .orderBy(sql`collected_at ASC`)

    // Step 4: 转换为ISO 8601格式
    const metrics: AuthorMetricDataPoint[] = rawMetrics.map(row => ({
      collected_at: new Date(row.collected_at * 1000).toISOString(),
      follower: row.follower
    }))

    return {
      uid,
      metrics
    }
  }

  /**
   * 获取指定作者的最新粉丝数
   * 
   * @param uid - 作者UID
   * @returns 最新粉丝数，如果没有数据则返回null
   */
  async getLatestFollowerCount(uid: string): Promise<number | null> {
    const result = await this.getAuthorMetrics(uid)
    
    if (result.metrics.length === 0) {
      return null
    }

    // 返回最后一个数据点的粉丝数
    return result.metrics[result.metrics.length - 1].follower
  }

  /**
   * 获取博主列表（从authors表查询，仅显示有监控任务的博主）
   * 
   * @param search 搜索关键词（支持按昵称和UID搜索）
   * @returns 博主列表，包含uid、nickname、avatar、hasBoundAccount
   */
  async getAuthorList(search?: string): Promise<Array<{
    uid: string
    nickname: string | null
    avatar: string | null
    hasBoundAccount: boolean
  }>> {
    // 查询所有在tasks表中出现过的author_uid（仅显示有监控任务的博主）
    const authorUids = await this.db
      .selectDistinct({ authorUid: tasks.authorUid })
      .from(tasks)
      .where(isNotNull(tasks.authorUid))

    const uids = authorUids.map(t => t.authorUid).filter((uid): uid is string => !!uid)

    if (uids.length === 0) {
      return []
    }

    // 构建查询条件
    let query = this.db
      .select({
        uid: authors.uid,
        nickname: authors.nickname,
        avatar: authors.avatar,
      })
      .from(authors)
      .where(inArray(authors.uid, uids))

    // 如果提供了搜索关键词，添加搜索条件
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`
      query = query.where(
        or(
          like(authors.nickname, searchPattern),
          like(authors.uid, searchPattern)
        )
      ) as any
    }

    const authorList = await query

    // 检查每个博主是否有对应的已绑定账号
    const result = await Promise.all(
      authorList.map(async (author) => {
        // 查询accounts表中是否有对应UID的有效账号
        const boundAccount = await this.db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.uid, author.uid), eq(accounts.status, 'valid')))
          .limit(1)

        return {
          uid: author.uid,
          nickname: author.nickname || null,
          avatar: author.avatar || null,
          hasBoundAccount: boundAccount.length > 0,
        }
      })
    )

    return result
  }

  /**
   * 获取单个博主信息（从authors表查询）
   * 
   * @param uid 博主UID
   * @returns 博主信息，如果不存在则返回null
   */
  async getAuthorInfo(uid: string): Promise<{
    uid: string
    nickname: string | null
    avatar: string | null
    hasBoundAccount: boolean
  } | null> {
    const author = await this.db
      .select({
        uid: authors.uid,
        nickname: authors.nickname,
        avatar: authors.avatar,
      })
      .from(authors)
      .where(eq(authors.uid, uid))
      .limit(1)

    if (author.length === 0) {
      return null
    }

    // 检查是否有对应的已绑定账号
    const boundAccount = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.uid, uid), eq(accounts.status, 'valid')))
      .limit(1)

    return {
      uid: author[0].uid,
      nickname: author[0].nickname || null,
      avatar: author[0].avatar || null,
      hasBoundAccount: boundAccount.length > 0,
    }
  }

  /**
   * 同步博主信息（调用B站API获取博主信息并更新authors表）
   * 
   * @param uid 博主UID
   * @returns 更新后的博主信息
   */
  async syncAuthorInfo(uid: string): Promise<{ nickname: string; avatar: string }> {
    // 调用B站API获取用户信息
    const userInfo = await biliClient.getUserInfo(parseInt(uid, 10))

    // 更新或插入authors表
    const now = new Date()
    await this.db
      .insert(authors)
      .values({
        uid,
        nickname: userInfo.nickname || null,
        avatar: userInfo.avatar || null,
        updatedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: authors.uid,
        set: {
          nickname: userInfo.nickname || null,
          avatar: userInfo.avatar || null,
          updatedAt: now,
        },
      })

    return {
      nickname: userInfo.nickname,
      avatar: userInfo.avatar,
    }
  }
}

