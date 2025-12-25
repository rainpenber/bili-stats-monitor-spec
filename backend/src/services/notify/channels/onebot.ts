import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * OneBot v11 配置 schema
 */
export const onebotConfigSchema = z.object({
  url: z.string().url('Invalid OneBot URL'),
  accessToken: z.string().optional(),
  messageType: z.enum(['private', 'group']).default('private'),
  userId: z.string().optional(), // 私聊用户 ID
  groupId: z.string().optional(), // 群组 ID
})

export type OneBotConfig = z.infer<typeof onebotConfigSchema>

/**
 * OneBot v11 (go-cqhttp) 通知渠道
 * 
 * 支持私聊和群聊消息发送
 * https://github.com/howmanybots/onebot
 */
export class OneBotChannel implements NotifyChannel {
  readonly name = 'onebot'
  readonly configSchema = onebotConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 验证必需的 ID
      if (validConfig.messageType === 'private' && !validConfig.userId) {
        throw new Error('userId is required for private message')
      }
      if (validConfig.messageType === 'group' && !validConfig.groupId) {
        throw new Error('groupId is required for group message')
      }

      // 构建消息文本
      const message = `${title}\n\n${content}`

      // 构建请求 URL
      let url = validConfig.url
      const params = new URLSearchParams()

      if (validConfig.accessToken) {
        params.append('access_token', validConfig.accessToken)
      }

      if (validConfig.messageType === 'private') {
        params.append('user_id', validConfig.userId!)
      } else {
        params.append('group_id', validConfig.groupId!)
      }

      params.append('message', message)

      const finalUrl = `${url}?${params.toString()}`

      const response = await fetch(finalUrl, {
        method: 'GET',
      })

      const data = await response.json()

      return data.status === 'ok'
    } catch (err) {
      console.error('OneBot notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }
}

