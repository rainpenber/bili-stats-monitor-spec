import { Hono } from 'hono'
import { z } from 'zod'
import { success, error, ErrorCodes } from '../utils/response'
import { AuthService } from '../services/auth'
import type { DrizzleInstance } from '../db'

/**
 * 登录 schema
 */
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * 修改密码 schema
 */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

/**
 * 认证路由
 */
export function createAuthRoutes(db: DrizzleInstance, jwtSecret: string) {
  const app = new Hono()
  const authService = new AuthService(db, jwtSecret)

  /**
   * POST /api/v1/auth/login - 用户登录
   */
  app.post('/login', async (c) => {
    try {
      const body = await c.req.json()
      const data = loginSchema.parse(body)

      const result = await authService.login(data.username, data.password)

      if (!result) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid username or password', undefined, 401)
      }

      return success(c, result, 'Login successful')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Login failed', undefined, 500)
    }
  })

  /**
   * POST /api/v1/auth/logout - 用户登出
   * 
   * 注意：JWT 是无状态的，登出主要在客户端删除 token
   * 服务端可以选择实现 token 黑名单（未实现）
   */
  app.post('/logout', async (c) => {
    return success(c, { logged_out: true }, 'Logout successful')
  })

  /**
   * GET /api/v1/auth/profile - 获取当前用户信息
   * 
   * 需要 Authorization header: Bearer <token>
   */
  app.get('/profile', async (c) => {
    try {
      const authHeader = c.req.header('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Missing or invalid Authorization header', undefined, 401)
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      const payload = await authService.verifyToken(token)

      if (!payload) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', undefined, 401)
      }

      // 获取完整用户信息
      const user = await authService.getUserById(payload.userId)

      if (!user) {
        return error(c, ErrorCodes.NOT_FOUND, 'User not found', undefined, 404)
      }

      return success(c, user)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get profile', undefined, 500)
    }
  })

  /**
   * POST /api/v1/auth/change-password - 修改密码
   * 
   * 需要 Authorization header
   */
  app.post('/change-password', async (c) => {
    try {
      const authHeader = c.req.header('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Missing or invalid Authorization header', undefined, 401)
      }

      const token = authHeader.substring(7)
      const payload = await authService.verifyToken(token)

      if (!payload) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', undefined, 401)
      }

      const body = await c.req.json()
      const data = changePasswordSchema.parse(body)

      const result = await authService.changePassword(payload.userId, data.oldPassword, data.newPassword)

      if (!result) {
        return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid old password', undefined, 401)
      }

      return success(c, { changed: true }, 'Password changed successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to change password', undefined, 500)
    }
  })

  return app
}

