import { Hono } from 'hono'
import { z } from 'zod'
import { success, error, ErrorCodes } from '../utils/response'
import { NotifyService } from '../services/notify/service'
import type { DrizzleInstance } from '../db'

/**
 * 测试渠道 schema
 */
const testChannelSchema = z.object({
  channelName: z.string().min(1, 'Channel name is required'),
  config: z.unknown(),
})

/**
 * 通知路由
 */
export function createNotificationsRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const notifyService = new NotifyService()

  /**
   * GET /api/v1/notifications/channels - 获取可用的通知渠道列表
   */
  app.get('/channels', async (c) => {
    try {
      const channels = notifyService.getAvailableChannels()
      return success(c, { channels })
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get channels', undefined, 500)
    }
  })

  /**
   * POST /api/v1/notifications/test - 测试通知渠道
   */
  app.post('/test', async (c) => {
    try {
      const body = await c.req.json()
      const data = testChannelSchema.parse(body)

      const result = await notifyService.testChannel(data.channelName, data.config)

      if (result) {
        return success(c, { tested: true }, 'Test notification sent successfully')
      } else {
        return error(c, ErrorCodes.INTERNAL_ERROR, 'Test notification failed', undefined, 500)
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to test channel', undefined, 500)
    }
  })

  /**
   * GET /api/v1/notifications/channels/:name/schema - 获取渠道配置 schema
   */
  app.get('/channels/:name/schema', async (c) => {
    try {
      const channelName = c.req.param('name')
      const channel = notifyService.getChannel(channelName)

      if (!channel) {
        return error(c, ErrorCodes.NOT_FOUND, 'Channel not found', undefined, 404)
      }

      // 返回 schema 的 JSON 表示（简化版）
      // 实际使用时可能需要更详细的 schema 描述
      return success(c, {
        name: channel.name,
        schema: channel.configSchema.description || 'Config schema',
      })
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get schema', undefined, 500)
    }
  })

  return app
}

