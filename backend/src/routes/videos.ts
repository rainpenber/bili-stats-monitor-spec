import { Hono } from 'hono'
import { success, error, ErrorCodes } from '../utils/response'
import { MetricsService } from '../services/metrics'
import { TaskService } from '../services/task'
import type { DrizzleInstance } from '../db'

/**
 * 视频相关路由
 */
export function createVideosRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const metricsService = new MetricsService(db)
  const taskService = new TaskService(db)

  /**
   * GET /api/v1/videos/:bv/metrics
   * 
   * 通过BV号获取视频指标
   * 
   * Query参数:
   * - from: 起始时间（ISO 8601）
   * - to: 结束时间（ISO 8601）
   * - fields: 字段列表（逗号分隔）
   * 
   * Response:
   * {
   *   "code": 0,
   *   "message": "success",
   *   "data": {
   *     "series": [
   *       {
   *         "ts": "2024-01-01T00:00:00Z",
   *         "play": 1000,
   *         "watching": 50,
   *         "danmaku": 100,
   *         "comment": 50,
   *         "coin": 20,
   *         "like": 80
   *       }
   *     ]
   *   }
   * }
   */
  app.get('/:bv/metrics', async (c) => {
    try {
      const bv = c.req.param('bv')

      if (!bv || !bv.startsWith('BV')) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid BV number', undefined, 400)
      }

      // 查找对应的任务
      const task = await taskService.findByTargetId(bv, 'video')
      if (!task) {
        return error(c, ErrorCodes.NOT_FOUND, 'Video task not found', undefined, 404)
      }

      // 解析时间范围参数
      const fromStr = c.req.query('from')
      const toStr = c.req.query('to')

      const timeRange: { from?: Date; to?: Date } = {}
      if (fromStr) {
        timeRange.from = new Date(fromStr)
        if (isNaN(timeRange.from.getTime())) {
          return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid from date', undefined, 400)
        }
      }
      if (toStr) {
        timeRange.to = new Date(toStr)
        if (isNaN(timeRange.to.getTime())) {
          return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid to date', undefined, 400)
        }
      }

      // 获取指标数据
      const metrics = await metricsService.getVideoMetrics(task.id, timeRange)

      // 转换为前端需要的格式（数据已经是按时间升序排列）
      const series = metrics.map(m => ({
        ts: m.collectedAt.toISOString(),
        play: m.view,
        watching: m.online || 0,
        danmaku: m.danmaku,
        comment: m.reply || 0,
        coin: m.coin,
        like: m.like,
      }))

      return success(c, { series })
    } catch (err: any) {
      console.error('Failed to get video metrics:', err)
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get video metrics', undefined, 500)
    }
  })

  return app
}

