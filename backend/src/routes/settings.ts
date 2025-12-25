import { Hono } from 'hono'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { success, error, ErrorCodes } from '../utils/response'
import { users, settings } from '../db/schema'
import { AuthService } from '../services/auth'
import type { DrizzleInstance } from '../db'

/**
 * 更新设置 schema
 */
const updateSettingsSchema = z.object({
  maxTaskInterval: z.number().optional(),
  defaultTaskDeadline: z.number().optional(),
  dataRetentionDays: z.number().optional(),
  config: z.record(z.unknown()).optional(),
})

/**
 * 修改用户密码 schema（管理员）
 */
const changeUserPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

/**
 * 设置路由
 */
export function createSettingsRoutes(db: DrizzleInstance, jwtSecret: string) {
  const app = new Hono()
  const authService = new AuthService(db, jwtSecret)

  /**
   * 中间件：验证管理员权限
   */
  const requireAdmin = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(c, ErrorCodes.UNAUTHORIZED, 'Missing or invalid Authorization header', undefined, 401)
    }

    const token = authHeader.substring(7)
    const payload = await authService.verifyToken(token)

    if (!payload) {
      return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', undefined, 401)
    }

    if (payload.role !== 'admin') {
      return error(c, ErrorCodes.FORBIDDEN, 'Admin access required', undefined, 403)
    }

    // 将 payload 附加到 context
    c.set('user', payload)
    await next()
  }

  /**
   * GET /api/v1/settings - 获取系统设置
   */
  app.get('/', async (c) => {
    try {
      const settingsList = await db.select().from(settings).limit(1)

      if (settingsList.length === 0) {
        // 返回默认设置
        return success(c, {
          maxTaskInterval: 1440, // 1 天
          defaultTaskDeadline: 90, // 90 天
          dataRetentionDays: 365, // 1 年
          config: {},
        })
      }

      return success(c, settingsList[0])
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get settings', undefined, 500)
    }
  })

  /**
   * POST /api/v1/settings - 更新系统设置（需要管理员权限）
   */
  app.post('/', requireAdmin, async (c) => {
    try {
      const body = await c.req.json()
      const data = updateSettingsSchema.parse(body)

      // 检查是否已有设置
      const settingsList = await db.select().from(settings).limit(1)

      if (settingsList.length === 0) {
        // 创建新设置
        await db.insert(settings).values({
          id: 'default',
          maxTaskInterval: data.maxTaskInterval,
          defaultTaskDeadline: data.defaultTaskDeadline,
          dataRetentionDays: data.dataRetentionDays,
          config: data.config || {},
          updatedAt: new Date(),
        })
      } else {
        // 更新现有设置
        await db
          .update(settings)
          .set({
            maxTaskInterval: data.maxTaskInterval,
            defaultTaskDeadline: data.defaultTaskDeadline,
            dataRetentionDays: data.dataRetentionDays,
            config: data.config,
            updatedAt: new Date(),
          })
          .where(eq(settings.id, 'default'))
      }

      return success(c, { updated: true }, 'Settings updated successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to update settings', undefined, 500)
    }
  })

  /**
   * GET /api/v1/settings/users - 获取用户列表（需要管理员权限）
   */
  app.get('/users', requireAdmin, async (c) => {
    try {
      const userList = await db.select().from(users)

      // 不返回密码哈希
      const safeUsers = userList.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))

      return success(c, safeUsers)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get users', undefined, 500)
    }
  })

  /**
   * POST /api/v1/settings/users/:id/password - 修改用户密码（需要管理员权限）
   */
  app.post('/users/:id/password', requireAdmin, async (c) => {
    try {
      const userId = c.req.param('id')
      const body = await c.req.json()
      const data = changeUserPasswordSchema.parse(body)

      // 检查用户是否存在
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1)

      if (userList.length === 0) {
        return error(c, ErrorCodes.NOT_FOUND, 'User not found', undefined, 404)
      }

      // 生成新密码哈希
      const passwordHash = await bcrypt.hash(data.password, 10)

      // 更新密码
      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      return success(c, { updated: true }, 'Password updated successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to update password', undefined, 500)
    }
  })

  return app
}

