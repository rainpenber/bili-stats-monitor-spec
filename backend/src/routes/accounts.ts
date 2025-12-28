import { Hono } from 'hono'
import { z } from 'zod'
import { success, error, ErrorCodes } from '../utils/response'
import { AccountService } from '../services/account'
import { SettingsService } from '../services/settings'
import { biliClient } from '../services/bili/client'
import type { DrizzleInstance } from '../db'

const accountService = (db: DrizzleInstance) => new AccountService(db)
const settingsService = (db: DrizzleInstance) => new SettingsService(db)

// 请求验证 schema
const bindCookieSchema = z.object({
  cookie: z.string().min(1, 'Cookie is required'),
})

const setDefaultSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
})

/**
 * 账号管理路由
 */
export function createAccountsRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const service = accountService(db)
  const settings = settingsService(db)

  /**
   * GET /api/v1/accounts - 获取账号列表
   */
  app.get('/', async (c) => {
    try {
      const accountList = await service.listAccounts()
      return success(c, accountList)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get accounts', undefined, 500)
    }
  })

  /**
   * POST /api/v1/accounts/cookie - Cookie 绑定
   */
  app.post('/cookie', async (c) => {
    try {
      const body = await c.req.json()
      const { cookie } = bindCookieSchema.parse(body)

      const accountId = await service.bindByCookie(cookie)

      return success(c, { accountId }, 'Account bound successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to bind account', undefined, 500)
    }
  })

  /**
   * POST /api/v1/accounts/qrcode - 生成二维码
   */
  app.post('/qrcode', async (c) => {
    try {
      const qrInfo = await biliClient.generateQrCode()

      // TODO: 在数据库中创建 QR 会话记录（如果需要持久化）
      // 目前先返回二维码信息

      return success(c, qrInfo)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to generate QR code', undefined, 500)
    }
  })

  /**
   * GET /api/v1/accounts/qrcode/status - 轮询二维码状态
   */
  app.get('/qrcode/status', async (c) => {
    try {
      const qrcodeKey = c.req.query('qrcode_key')
      if (!qrcodeKey) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'qrcode_key is required', undefined, 400)
      }

      const status = await biliClient.pollQrCodeStatus(qrcodeKey)

      // 如果登录成功，自动绑定账号
      if (status.code === 0 && status.cookie) {
        try {
          const accountId = await service.bindByCookie(status.cookie)
          return success(
            c,
            {
              ...status,
              accountId,
            },
            'Login successful and account bound'
          )
        } catch (bindErr: any) {
          // 绑定失败，但登录状态仍然返回
          return success(
            c,
            {
              ...status,
              bindError: bindErr.message,
            },
            'Login successful but account binding failed'
          )
        }
      }

      return success(c, status)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to poll QR code status', undefined, 500)
    }
  })

  /**
   * DELETE /api/v1/accounts/:id - 删除账号
   */
  app.delete('/:id', async (c) => {
    try {
      const accountId = c.req.param('id')
      await service.deleteAccount(accountId)
      return success(c, { deleted: true }, 'Account deleted successfully')
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to delete account', undefined, 500)
    }
  })

  /**
   * GET /api/v1/accounts/default - 获取默认账号
   */
  app.get('/default', async (c) => {
    try {
      // 从settings表读取默认账号ID
      const defaultAccountId = await settings.getDefaultAccountId()
      
      if (!defaultAccountId) {
        return success(c, null, 'No default account set')
      }

      // 获取账号详情
      const account = await service.findAccountById(defaultAccountId)
      
      if (!account) {
        // 默认账号已被删除，清除设置
        await settings.saveDefaultAccountId(null)
        return success(c, null, 'Default account not found (cleaned up)')
      }

      return success(c, account)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get default account', undefined, 500)
    }
  })

  /**
   * POST /api/v1/accounts/default - 设置默认账号
   */
  app.post('/default', async (c) => {
    try {
      const body = await c.req.json()
      const { accountId } = setDefaultSchema.parse(body)

      // 验证账号存在
      const account = await service.findAccountById(accountId)
      if (!account) {
        return error(c, ErrorCodes.NOT_FOUND, 'Account not found', undefined, 404)
      }

      // 保存到settings表
      const saved = await settings.saveDefaultAccountId(accountId)
      
      if (!saved) {
        return error(c, ErrorCodes.INTERNAL_ERROR, 'Failed to save default account', undefined, 500)
      }

      return success(c, { accountId }, 'Default account set successfully')
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'Invalid request', err.errors, 400)
      }
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to set default account', undefined, 500)
    }
  })

  return app
}

