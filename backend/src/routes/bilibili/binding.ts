import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import { accountBindingService } from '../../services/bilibili/binding'
import { cookieBindingSchema, qrCodePollQuerySchema } from '../../validations/bilibili-binding'
import { loadEnv } from '../../config/env'

const env = loadEnv()
const app = new Hono()

// JWT中间件
app.use('/*', jwt({ secret: env.JWT_SECRET }))

/**
 * POST /api/v1/bilibili/bind/cookie
 * 通过Cookie绑定B站账号
 */
app.post(
  '/bind/cookie',
  zValidator('json', cookieBindingSchema),
  async (c) => {
    try {
      const { cookie } = c.req.valid('json')
      const payload = c.get('jwtPayload')
      const userId = payload.userId as string

      const result = await accountBindingService.bindByCookie(cookie, userId)

      if (!result.success) {
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
      console.error('Error in POST /bind/cookie:', error)
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
  try {
    const payload = c.get('jwtPayload')
    const userId = payload.userId as string

    const result = await accountBindingService.generateQRCode(userId)

    if (!result.success) {
      return c.json(
        { error: 'QRCODE_GENERATION_FAILED', message: result.error || '生成二维码失败' },
        500
      )
    }

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
    console.error('Error in POST /bind/qrcode/generate:', error)
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

export default app

