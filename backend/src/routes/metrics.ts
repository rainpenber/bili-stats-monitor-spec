import { Hono } from 'hono'
import { success, error, ErrorCodes } from '../utils/response'
import { MetricsService } from '../services/metrics'
import { TaskService } from '../services/task'
import type { DrizzleInstance } from '../db'

/**
 * 指标查询路由
 */
export function createMetricsRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const metricsService = new MetricsService(db)
  const taskService = new TaskService(db)

  /**
   * GET /api/v1/tasks/:id/metrics - 查询任务指标
   */
  app.get('/:id/metrics', async (c) => {
    try {
      const taskId = c.req.param('id')

      // 检查任务是否存在
      const task = await taskService.findById(taskId)
      if (!task) {
        return error(c, ErrorCodes.NOT_FOUND, 'Task not found', undefined, 404)
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

      // 根据任务类型查询指标
      let metrics
      if (task.type === 'video') {
        metrics = await metricsService.getVideoMetrics(taskId, timeRange)
      } else if (task.type === 'author') {
        metrics = await metricsService.getAuthorMetrics(taskId, timeRange)
      } else {
        return error(c, ErrorCodes.INTERNAL_ERROR, 'Unknown task type', undefined, 500)
      }

      return success(c, {
        taskId,
        type: task.type,
        metrics,
      })
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get metrics', undefined, 500)
    }
  })

  return app
}

