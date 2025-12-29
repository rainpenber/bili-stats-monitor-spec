import { z } from 'zod'

// 通知规则 Schema
export const notificationRuleSchema = z.object({
  name: z.string()
    .min(1, '规则名称不能为空')
    .max(100, '规则名称长度不能超过100个字符'),
  enabled: z.boolean().default(true),
  triggers: z.array(z.string())
    .min(1, '至少选择一个触发器'),
  channels: z.array(z.string())
    .min(1, '至少选择一个渠道'),
})

// 渠道配置 Schema（根据渠道类型验证）
export const channelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  target: z.string().optional(),
  token: z.string().optional(),
}).refine(
  (data) => {
    // 如果启用，target 必须填写
    if (data.enabled && !data.target) {
      return false
    }
    return true
  },
  { message: '启用渠道时必须填写目标', path: ['target'] }
)

// 邮箱渠道配置
export const emailChannelSchema = channelConfigSchema.refine(
  (data) => {
    if (data.enabled && data.target) {
      return z.string().email().safeParse(data.target).success
    }
    return true
  },
  { message: '邮箱格式不正确', path: ['target'] }
)

// Webhook 渠道配置
export const webhookChannelSchema = channelConfigSchema.refine(
  (data) => {
    if (data.enabled && data.target) {
      return z.string().url().safeParse(data.target).success
    }
    return true
  },
  { message: 'Webhook URL 格式不正确', path: ['target'] }
)

// 导出类型
export type NotificationRuleFormData = z.infer<typeof notificationRuleSchema>
export type ChannelConfigFormData = z.infer<typeof channelConfigSchema>

