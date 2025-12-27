import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import type { ServiceContainer } from '../../services/container'
import { cookieBindingSchema, qrCodePollQuerySchema, accountIdParamSchema } from '../../validations/bilibili-binding'

/**
 * 创建B站账号绑定路由
 */
export function createBilibiliBindingRoutes(container: ServiceContainer) {
  const app = new Hono()
  const { accountBindingService, config } = container

  // JWT中间件
  app.use('/*', jwt({ secret: config.jwt.secret }))

/**
 * POST /api/v1/bilibili/bind/cookie
 * 通过Cookie绑定B站账号
 */
app.post(
  '/bind/cookie',
  zValidator('json', cookieBindingSchema),
  async (c) => {
    const payload = c.get('jwtPayload')
    const userId = payload.userId as string
    
    console.log(`[Bilibili Binding] Cookie binding attempt - userId: ${userId}`)
    
    try {
      const { cookie } = c.req.valid('json')

      const result = await accountBindingService.bindByCookie(cookie, userId)

      if (!result.success) {
        console.log(`[Bilibili Binding] Cookie binding failed - userId: ${userId}, reason: ${result.error}`)
        
        // 错误码映射
        const errorMap: Record<string, { code: string; status: number }> = {
          '无效的Cookie或Cookie已过期': { code: 'COOKIE_INVALID', status: 400 },
          '该账号已被绑定': { code: 'ACCOUNT_ALREADY_BOUND', status: 409 },
          'Cookie格式错误：缺少SESSDATA': { code: 'INVALID_COOKIE_FORMAT', status: 400 },
        }

        const errorInfo = errorMap[result.error || ''] || { code: 'BIND_FAILED', status: 500 }

        return c.json(
          { error: errorInfo.code, message: result.error || '绑定失败' },
          errorInfo.status as 400 | 409 | 500
        )
      }

      console.log(`[Bilibili Binding] Cookie binding success - userId: ${userId}, accountId: ${result.account!.id}, uid: ${result.account!.uid}`)

      // 成功响应
      return c.json(
        {
          account: {
            accountId: result.account!.id,
            uid: result.account!.uid,
            nickname: result.account!.nickname,
            bindMethod: result.account!.bindMethod,
            boundAt: result.account!.boundAt.toISOString(),
            status: result.account!.status,
          },
        },
        201
      )
    } catch (error) {
      console.error(`[Bilibili Binding] Cookie binding error - userId: ${userId}`, error)
      return c.json(
        { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
        500
      )
    }
  }
)

/**
 * POST /api/v1/bilibili/bind/qrcode/generate
 * 生成二维码
 */
app.post('/bind/qrcode/generate', async (c) => {
  const payload = c.get('jwtPayload')
  const userId = payload.userId as string
  
  console.log(`[Bilibili Binding] QR code generation attempt - userId: ${userId}`)
  
  try {
    const result = await accountBindingService.generateQRCode(userId)

    if (!result.success) {
      console.log(`[Bilibili Binding] QR code generation failed - userId: ${userId}, reason: ${result.error}`)
      return c.json(
        { error: 'QRCODE_GENERATION_FAILED', message: result.error || '生成二维码失败' },
        500
      )
    }

    console.log(`[Bilibili Binding] QR code generated - userId: ${userId}, qrcodeKey: ${result.session!.qrcodeKey}`)

    // 成功响应
    return c.json(
      {
        qrcodeKey: result.session!.qrcodeKey,
        qrUrl: result.session!.qrUrl,
        expireAt: result.session!.expireAt.toISOString(),
      },
      201
    )
  } catch (error) {
    console.error(`[Bilibili Binding] QR code generation error - userId: ${userId}`, error)
    return c.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      500
    )
  }
})

/**
 * GET /api/v1/bilibili/bind/qrcode/poll
 * 轮询二维码状态
 */
app.get(
  '/bind/qrcode/poll',
  zValidator('query', qrCodePollQuerySchema),
  async (c) => {
    try {
      const { qrcodeKey } = c.req.valid('query')
      const payload = c.get('jwtPayload')
      const userId = payload.userId as string

      const result = await accountBindingService.pollQRCode(qrcodeKey, userId)

      // 构建响应
      const response: any = {
        status: result.status,
        message: result.message,
      }

      // 如果绑定成功，包含账号信息
      if (result.account) {
        response.account = {
          accountId: result.account.id,
          uid: result.account.uid,
          nickname: result.account.nickname,
          bindMethod: result.account.bindMethod,
          boundAt: result.account.boundAt.toISOString(),
          status: result.account.status,
        }
      }

      return c.json(response, 200)
    } catch (error) {
      console.error('Error in GET /bind/qrcode/poll:', error)
      return c.json(
        { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
        500
      )
    }
  }
)

/**
 * GET /api/v1/bilibili/accounts
 * 获取已绑定的B站账号列表
 */
app.get('/accounts', async (c) => {
  try {
    const accounts = await accountBindingService.listAccounts()

    return c.json(
      {
        accounts: accounts.map(account => ({
          accountId: account.id,
          uid: account.uid,
          nickname: account.nickname,
          bindMethod: account.bindMethod,
          boundAt: account.boundAt.toISOString(),
          status: account.status,
        })),
      },
      200
    )
  } catch (error) {
    console.error('Error in GET /accounts:', error)
    return c.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      500 as 500
    )
  }
})

/**
 * DELETE /api/v1/bilibili/accounts/:accountId
 * 解绑B站账号
 */
app.delete(
  '/accounts/:accountId',
  zValidator('param', accountIdParamSchema),
  async (c) => {
    try {
      const { accountId } = c.req.valid('param')

      const success = await accountBindingService.unbindAccount(accountId)

      if (!success) {
        return c.json(
          { error: 'UNBIND_FAILED', message: '解绑失败，账号不存在或已被删除' },
          404 as 404
        )
      }

      return c.json({ message: '解绑成功' }, 200)
    } catch (error) {
      console.error('Error in DELETE /accounts/:accountId:', error)
      return c.json(
        { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
        500 as 500
      )
    }
  }
)

  return app
}

