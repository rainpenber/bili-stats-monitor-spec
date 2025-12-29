import { eq, and, gte, lte, desc, asc } from 'drizzle-orm'
import { videoMetrics, authorMetrics } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * 时间范围查询参数
 */
export interface TimeRange {
  from?: Date
  to?: Date
}

/**
 * 指标服务
 */
export class MetricsService {
  constructor(private db: DrizzleInstance) {}

  /**
   * 查询视频指标
   */
  async getVideoMetrics(taskId: string, timeRange: TimeRange = {}) {
    const conditions = [eq(videoMetrics.taskId, taskId)]

    if (timeRange.from) {
      conditions.push(gte(videoMetrics.collectedAt, timeRange.from))
    }

    if (timeRange.to) {
      conditions.push(lte(videoMetrics.collectedAt, timeRange.to))
    }

    const metrics = await this.db
      .select()
      .from(videoMetrics)
      .where(and(...conditions)!)
      .orderBy(asc(videoMetrics.collectedAt)) // 改为升序，便于前端按时间顺序显示

    return metrics
  }

  /**
   * 查询博主指标
   */
  async getAuthorMetrics(taskId: string, timeRange: TimeRange = {}) {
    const conditions = [eq(authorMetrics.taskId, taskId)]

    if (timeRange.from) {
      conditions.push(gte(authorMetrics.collectedAt, timeRange.from))
    }

    if (timeRange.to) {
      conditions.push(lte(authorMetrics.collectedAt, timeRange.to))
    }

    const metrics = await this.db
      .select()
      .from(authorMetrics)
      .where(and(...conditions)!)
      .orderBy(desc(authorMetrics.collectedAt))

    return metrics
  }

  /**
   * 获取最新的视频指标
   */
  async getLatestVideoMetrics(taskId: string) {
    const metrics = await this.db
      .select()
      .from(videoMetrics)
      .where(eq(videoMetrics.taskId, taskId))
      .orderBy(desc(videoMetrics.collectedAt))
      .limit(1)

    return metrics.length > 0 ? metrics[0] : null
  }

  /**
   * 获取最新的博主指标
   */
  async getLatestAuthorMetrics(taskId: string) {
    const metrics = await this.db
      .select()
      .from(authorMetrics)
      .where(eq(authorMetrics.taskId, taskId))
      .orderBy(desc(authorMetrics.collectedAt))
      .limit(1)

    return metrics.length > 0 ? metrics[0] : null
  }

}

