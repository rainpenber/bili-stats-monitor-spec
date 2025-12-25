/**
 * 通知渠道配置Schema
 * 
 * 与后端配置schema保持一致
 */
import { z } from 'zod'

// ==================== Email渠道 ====================
export const emailChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().min(1, 'SMTP服务器地址不能为空'),
  port: z.number().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1, 'SMTP用户名不能为空'),
  pass: z.string().min(1, 'SMTP密码不能为空'),
  from: z.string().email('发件人邮箱格式不正确'),
  to: z.string().email('收件人邮箱格式不正确'),
})

export type EmailChannelConfig = z.infer<typeof emailChannelConfigSchema>

// ==================== Webhook渠道 ====================
export const webhookChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().url('Webhook URL格式不正确'),
  method: z.enum(['GET', 'POST']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
})

export type WebhookChannelConfig = z.infer<typeof webhookChannelConfigSchema>

// ==================== 钉钉渠道 ====================
export const dingtalkChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  webhook: z.string().url('Webhook URL格式不正确'),
  secret: z.string().optional(),
})

export type DingTalkChannelConfig = z.infer<typeof dingtalkChannelConfigSchema>

// ==================== 飞书渠道 ====================
export const feishuChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  webhook: z.string().url('Webhook URL格式不正确'),
  secret: z.string().optional(),
})

export type FeishuChannelConfig = z.infer<typeof feishuChannelConfigSchema>

// ==================== 企业微信渠道 ====================
export const wecomChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(['bot', 'app']).default('bot'),
  // Bot Webhook配置
  webhook: z.string().url('Webhook URL格式不正确').optional(),
  // App配置
  corpId: z.string().optional(),
  corpSecret: z.string().optional(),
  agentId: z.string().optional(),
  toUser: z.string().optional(),
  // 代理配置
  proxyUrl: z.string().url('代理URL格式不正确').optional(),
}).refine(
  (data) => {
    if (!data.enabled) return true
    if (data.type === 'bot') {
      return !!data.webhook
    } else {
      return !!data.corpId && !!data.corpSecret && !!data.agentId
    }
  },
  {
    message: 'Bot模式需要填写webhook，App模式需要填写corpId、corpSecret和agentId',
    path: ['type'],
  }
)

export type WecomChannelConfig = z.infer<typeof wecomChannelConfigSchema>

// ==================== Telegram渠道 ====================
export const telegramChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  botToken: z.string().min(1, 'Bot Token不能为空'),
  chatId: z.string().min(1, 'Chat ID不能为空'),
  apiHost: z.string().url('API Host格式不正确').optional(),
  proxyHost: z.string().optional(),
  proxyPort: z.number().min(1).max(65535).optional(),
  proxyAuth: z.string().optional(),
})

export type TelegramChannelConfig = z.infer<typeof telegramChannelConfigSchema>

// ==================== Bark渠道 ====================
export const barkChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  key: z.string().min(1, 'Bark Key不能为空'),
  server: z.string().url('服务器URL格式不正确').optional(),
  sound: z.string().optional(),
  icon: z.string().url('图标URL格式不正确').optional(),
  group: z.string().optional(),
  isArchive: z.boolean().optional(),
  url: z.string().url('跳转URL格式不正确').optional(),
})

export type BarkChannelConfig = z.infer<typeof barkChannelConfigSchema>

// ==================== PushDeer渠道 ====================
export const pushdeerChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  key: z.string().min(1, 'PushDeer Key不能为空'),
  server: z.string().url('服务器URL格式不正确').optional(),
})

export type PushDeerChannelConfig = z.infer<typeof pushdeerChannelConfigSchema>

// ==================== OneBot渠道 ====================
export const onebotChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().url('OneBot URL格式不正确'),
  accessToken: z.string().optional(),
  messageType: z.enum(['private', 'group']).default('private'),
  userId: z.string().optional(),
  groupId: z.string().optional(),
}).refine(
  (data) => {
    if (!data.enabled) return true
    if (data.messageType === 'private') {
      return !!data.userId
    } else {
      return !!data.groupId
    }
  },
  {
    message: '私聊模式需要填写userId，群聊模式需要填写groupId',
    path: ['messageType'],
  }
)

export type OneBotChannelConfig = z.infer<typeof onebotChannelConfigSchema>

// ==================== 通用渠道配置类型 ====================
export type ChannelConfig =
  | EmailChannelConfig
  | WebhookChannelConfig
  | DingTalkChannelConfig
  | FeishuChannelConfig
  | WecomChannelConfig
  | TelegramChannelConfig
  | BarkChannelConfig
  | PushDeerChannelConfig
  | OneBotChannelConfig

// 渠道类型
export const CHANNEL_TYPES = [
  'email',
  'webhook',
  'dingtalk',
  'feishu',
  'wecom',
  'telegram',
  'bark',
  'pushdeer',
  'onebot',
] as const

export type ChannelType = typeof CHANNEL_TYPES[number]

// 渠道显示名称
export const CHANNEL_NAMES: Record<ChannelType, string> = {
  email: '邮箱',
  webhook: 'Webhook',
  dingtalk: '钉钉',
  feishu: '飞书',
  wecom: '企业微信',
  telegram: 'Telegram',
  bark: 'Bark',
  pushdeer: 'PushDeer',
  onebot: 'OneBot (QQ机器人)',
}

