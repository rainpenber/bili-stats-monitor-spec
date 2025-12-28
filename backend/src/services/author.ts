import { eq, sql, inArray } from 'drizzle-orm'
import { authorMetrics, tasks } from '../db/schema'
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
}

