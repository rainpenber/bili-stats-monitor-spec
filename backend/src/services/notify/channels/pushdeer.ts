import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * PushDeer 配置 schema
 */
export const pushdeerConfigSchema = z.object({
  key: z.string().min(1, 'PushDeer key is required'),
  server: z.string().url().optional(),
})

export type PushDeerConfig = z.infer<typeof pushdeerConfigSchema>

/**
 * PushDeer 通知渠道
 * 
 * PushDeer 是一个跨平台的推送通知服务
 * https://github.com/easychen/pushdeer
 */
export class PushDeerChannel implements NotifyChannel {
  readonly name = 'pushdeer'
  readonly configSchema = pushdeerConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 默认 PushDeer 服务器
      const server = validConfig.server || 'https://api2.pushdeer.com'
      const url = `${server}/message/push`

      const params = new URLSearchParams({
        pushkey: validConfig.key,
        text: title,
        desp: content,
        type: 'markdown',
      })

      const response = await fetch(`${url}?${params.toString()}`)
      const data = await response.json()

      return data.code === 0
    } catch (err) {
      console.error('PushDeer notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }
}

