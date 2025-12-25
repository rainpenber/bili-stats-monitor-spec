import { Hono } from 'hono'
import { success, error, ErrorCodes } from '../utils/response'
import { SchedulerService } from '../services/scheduler'

/**
 * 调度器管理路由
 */
export function createSchedulerRoutes(scheduler: SchedulerService) {
  const app = new Hono()

  /**
   * GET /api/v1/scheduler/status - 获取调度器状态
   */
  app.get('/status', (c) => {
    const status = scheduler.getStatus()
    return success(c, status)
  })

  /**
   * POST /api/v1/scheduler/start - 启动调度器
   */
  app.post('/start', (c) => {
    scheduler.start()
    return success(c, { started: true }, 'Scheduler started')
  })

  /**
   * POST /api/v1/scheduler/stop - 停止调度器
   */
  app.post('/stop', (c) => {
    scheduler.stop()
    return success(c, { stopped: true }, 'Scheduler stopped')
  })

  /**
   * POST /api/v1/scheduler/trigger/:taskId - 手动触发任务
   */
  app.post('/trigger/:taskId', async (c) => {
    try {
      const taskId = c.req.param('taskId')
      await scheduler.triggerTask(taskId)
      return success(c, { triggered: true }, 'Task triggered successfully')
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to trigger task', undefined, 500)
    }
  })

  /**
   * POST /api/v1/scheduler/initialize - 初始化任务调度时间
   */
  app.post('/initialize', async (c) => {
    try {
      const count = await scheduler.initializeTaskSchedules()
      return success(c, { initialized: count }, `Initialized ${count} task schedules`)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to initialize', undefined, 500)
    }
  })

  return app
}

