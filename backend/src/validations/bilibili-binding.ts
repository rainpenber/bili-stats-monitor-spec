import { z } from 'zod'

// Cookie绑定输入验证
export const cookieBindingSchema = z.object({
  cookie: z.string().min(1, 'Cookie不能为空').refine(
    (val) => val.includes('SESSDATA='),
    { message: 'Cookie必须包含SESSDATA字段' }
  ),
})

// 二维码轮询查询参数验证
export const qrCodePollQuerySchema = z.object({
  qrcodeKey: z.string().min(1, 'qrcodeKey不能为空'),
})

// 账号ID路径参数验证
export const accountIdParamSchema = z.object({
  accountId: z.string().min(1, '账号ID不能为空'),
})

// API响应类型定义
export const bilibiliAccountSchema = z.object({
  accountId: z.string(),
  uid: z.string(),
  nickname: z.string(),
  bindMethod: z.enum(['cookie', 'qrcode']),
  boundAt: z.string(),
  status: z.enum(['valid', 'expired']),
})

export const qrCodeSessionSchema = z.object({
  qrcodeKey: z.string(),
  qrUrl: z.string(),
  expireAt: z.string(),
})

export const qrCodePollResponseSchema = z.object({
  status: z.enum(['pending', 'scanned', 'confirmed', 'expired']),
  message: z.string(),
  account: bilibiliAccountSchema.optional(),
})

// 类型导出
export type CookieBindingInput = z.infer<typeof cookieBindingSchema>
export type QRCodePollQuery = z.infer<typeof qrCodePollQuerySchema>
export type AccountIdParam = z.infer<typeof accountIdParamSchema>
export type BilibiliAccountDTO = z.infer<typeof bilibiliAccountSchema>
export type QRCodeSessionDTO = z.infer<typeof qrCodeSessionSchema>
export type QRCodePollResponseDTO = z.infer<typeof qrCodePollResponseSchema>

