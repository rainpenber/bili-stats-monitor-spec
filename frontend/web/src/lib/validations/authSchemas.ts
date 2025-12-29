/**
 * 登录表单Zod验证schema
 */
import { z } from 'zod'

export const loginFormSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

