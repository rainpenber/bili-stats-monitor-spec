import { Hono } from 'hono'
import { z } from 'zod'
import { success, error, ErrorCodes } from '../utils/response'
import { TaskService } from '../services/task'
import { biliClient } from '../services/bili/client'
import type { DrizzleInstance } from '../db'

/**
 * 任务策略 schema
 */
const taskStrategySchema = z.object({
  mode: z.enum(['fixed', 'smart_video']),
  value: z.number().optional(),
  unit: z.enum(['minute', 'hour', 'day']).optional(),
})

/**
 * 创建任务 schema
 */
const createTaskSchema = z.object({
  type: z.enum(['video', 'author']),
  targetId: z.string().min(1, 'Target ID is required'),
  title: z.string().min(1, 'Title is required'),
  accountId: z.string().optional().nullable(),
  strategy: taskStrategySchema,
  deadline: z.string().datetime().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
})

/**
 * 更新任务 schema
 */
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  accountId: z.string().optional().nullable(),
  strategy: taskStrategySchema.optional(),
  deadline: z.string().datetime().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  status: z.enum(['running', 'stopped', 'completed', 'failed', 'paused']).optional(),
  pauseReason: z.string().optional().nullable(),
})

/**
 * Lookup schema
 */
const lookupSchema = z.object({
  url: z.string().url().optional(),
  id: z.string().optional(),
  type: z.enum(['video', 'author']).optional(),
})

/**
 * 批量操作 schema
 */
const batchOperationSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
  operation: z.enum(['start', 'stop', 'delete']),
})

/**
 * 任务管理路由
 */
export function createTasksRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const taskService = new TaskService(db)

  /**
   * GET /api/v1/tasks - 获取任务列表
   */
  app.get('/', async (c) => {
    try {
      const type = c.req.query('type') as 'video' | 'author' | undefined
      const status = c.req.query('status') as any
      const search = c.req.query('search')
      const tags = c.req.query('tags')?.split(',').filter(Boolean)
      const accountId = c.req.query('accountId')
      const authorUid = c.req.query('author_uid') || c.req.query('authorUid') // 支持两种命名格式
      
      // 支持两种分页参数格式
      // 1. page + page_size (前端使用)
      // 2. limit + offset (传统格式)
      const page = parseInt(c.req.query('page') || '1')
      const pageSize = parseInt(c.req.query('page_size') || '20')
      const limit = parseInt(c.req.query('limit') || String(pageSize))
      const offset = parseInt(c.req.query('offset') || String((page - 1) * pageSize))
      
      const orderBy = (c.req.query('orderBy') || 'createdAt') as any
      const orderDir = (c.req.query('orderDir') || 'desc') as 'asc' | 'desc'

      const tasks = await taskService.findMany({
        type,
        status,
        search,
        tags,
        accountId,
        authorUid,
        limit,
        offset,
        orderBy,
        orderDir,
      })

      // 获取总数（不带分页限制）
      const totalTasks = await taskService.findMany({
        type,
        status,
        search,
        tags,
        accountId,
        authorUid,
        // 不传 limit 和 offset
      })

      // 计算分页参数
      const responsePage = page
      const responsePageSize = limit

      return success(c, {
        items: tasks,
        page: responsePage,
        page_size: responsePageSize,
        total: totalTasks.length,
      })
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get tasks', undefined, 500)
    }
  })

  /**
   * POST /api/v1/tasks - 创建任务
   */
  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      const data = createTaskSchema.parse(body)

      // 转换 deadline 字符串为 Date
      const deadline = data.deadline ? new Date(data.deadline) : undefined

      const taskId = await taskService.create({
        type: data.type,
        targetId: data.targetId,
        title: data.title,
        accountId: data.accountId,
        strategy: data.strategy,
        deadline,
        tags: data.tags,
      })

      return success(c, { taskId }, 'Task created successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to create task', undefined, 500)
    }
  })

  /**
   * GET /api/v1/tasks/:id - 获取任务详情
   */
  app.get('/:id', async (c) => {
    try {
      const taskId = c.req.param('id')
      const task = await taskService.findById(taskId)

      if (!task) {
        return error(c, ErrorCodes.NOT_FOUND, 'Task not found', undefined, 404)
      }

      return success(c, task)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get task', undefined, 500)
    }
  })

  /**
   * PUT /api/v1/tasks/:id - 更新任务
   */
  app.put('/:id', async (c) => {
    try {
      const taskId = c.req.param('id')
      const body = await c.req.json()
      const data = updateTaskSchema.parse(body)

      // 检查任务是否存在
      const task = await taskService.findById(taskId)
      if (!task) {
        return error(c, ErrorCodes.NOT_FOUND, 'Task not found', undefined, 404)
      }

      // 转换 deadline 字符串为 Date
      const deadline = data.deadline ? new Date(data.deadline) : undefined

      await taskService.update(taskId, {
        title: data.title,
        accountId: data.accountId,
        strategy: data.strategy,
        deadline,
        tags: data.tags,
        status: data.status,
        pauseReason: data.pauseReason,
      })

      return success(c, { taskId }, 'Task updated successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to update task', undefined, 500)
    }
  })

  /**
   * DELETE /api/v1/tasks/:id - 删除任务
   */
  app.delete('/:id', async (c) => {
    try {
      const taskId = c.req.param('id')

      // 检查任务是否存在
      const task = await taskService.findById(taskId)
      if (!task) {
        return error(c, ErrorCodes.NOT_FOUND, 'Task not found', undefined, 404)
      }

      await taskService.delete(taskId)

      return success(c, { deleted: true }, 'Task deleted successfully')
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to delete task', undefined, 500)
    }
  })

  /**
   * POST /api/v1/tasks/lookup - 从链接或 ID 获取信息
   */
  app.post('/lookup', async (c) => {
    try {
      const body = await c.req.json()
      const data = lookupSchema.parse(body)

      let targetId: string
      let type: 'video' | 'author'
      let title: string

      // 从 URL 解析
      if (data.url) {
        const url = new URL(data.url)

        // 视频链接: https://www.bilibili.com/video/BVxxx
        if (url.pathname.startsWith('/video/')) {
          const bvid = url.pathname.split('/')[2]
          if (!bvid || !bvid.startsWith('BV')) {
            return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid video URL', undefined, 400)
          }

          targetId = bvid
          type = 'video'

          // 获取视频信息
          const videoInfo = await biliClient.getVideoView(bvid)
          title = videoInfo.title
        }
        // 用户空间链接: https://space.bilibili.com/123456
        else if (url.hostname === 'space.bilibili.com') {
          const uid = url.pathname.split('/')[1]
          if (!uid || !/^\d+$/.test(uid)) {
            return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid user space URL', undefined, 400)
          }

          targetId = uid
          type = 'author'

          // 获取用户信息
          const userInfo = await biliClient.getUserStat(parseInt(uid, 10))

          // 注意：getUserStat 不返回昵称，需要额外调用或从其他接口获取
          // 这里简化处理，使用 UID 作为标题
          title = `UP主 ${uid}`
        } else {
          return error(c, ErrorCodes.VALIDATION_ERROR, 'Unsupported URL format', undefined, 400)
        }
      }
      // 从 ID 直接查询
      else if (data.id && data.type) {
        targetId = data.id
        type = data.type

        if (type === 'video') {
          if (!targetId.startsWith('BV')) {
            return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid BV ID', undefined, 400)
          }

          const videoInfo = await biliClient.getVideoView(targetId)
          title = videoInfo.title
        } else {
          if (!/^\d+$/.test(targetId)) {
            return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid UID', undefined, 400)
          }

          const userInfo = await biliClient.getUserStat(parseInt(targetId, 10))
          title = `UP主 ${targetId}`
        }
      } else {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Either url or (id + type) is required', undefined, 400)
      }

      return success(c, {
        type,
        targetId,
        title,
      })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to lookup', undefined, 500)
    }
  })

  /**
   * POST /api/v1/tasks/batch - 批量操作
   */
  app.post('/batch', async (c) => {
    try {
      const body = await c.req.json()
      const data = batchOperationSchema.parse(body)

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ id: string; error: string }>,
      }

      for (const id of data.ids) {
        try {
          const task = await taskService.findById(id)
          if (!task) {
            results.failed++
            results.errors.push({ id, error: 'Task not found' })
            continue
          }

          switch (data.operation) {
            case 'start':
              await taskService.update(id, { status: 'running' })
              break
            case 'stop':
              await taskService.update(id, { status: 'stopped' })
              break
            case 'delete':
              await taskService.delete(id)
              break
          }

          results.success++
        } catch (err: any) {
          results.failed++
          results.errors.push({ id, error: err.message || 'Unknown error' })
        }
      }

      return success(c, results)
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to perform batch operation', undefined, 500)
    }
  })

  return app
}

