import { z } from 'zod'

/**
 * Cookie绑定验证Schema
 */
export const cookieBindingSchema = z.object({
  cookie: z
    .string()
    .min(1, 'Cookie不能为空')
    .refine(
      (val) => val.includes('SESSDATA='),
      { message: 'Cookie必须包含SESSDATA字段' }
    ),
})

export type CookieBindingForm = z.infer<typeof cookieBindingSchema>

