import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * Bark 配置 schema
 */
export const barkConfigSchema = z.object({
  key: z.string().min(1, 'Bark key is required'),
  server: z.string().url().optional(),
  sound: z.string().optional(),
  icon: z.string().url().optional(),
  group: z.string().optional(),
  isArchive: z.boolean().optional(),
  url: z.string().url().optional(),
})

export type BarkConfig = z.infer<typeof barkConfigSchema>

/**
 * Bark 通知渠道
 * 
 * Bark 是一个 iOS 推送通知应用
 * https://github.com/Finb/Bark
 */
export class BarkChannel implements NotifyChannel {
  readonly name = 'bark'
  readonly configSchema = barkConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 默认 Bark 服务器
      const server = validConfig.server || 'https://api.day.app'
      const url = `${server}/${validConfig.key}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`

      // 构建查询参数
      const params = new URLSearchParams()
      if (validConfig.sound) params.append('sound', validConfig.sound)
      if (validConfig.icon) params.append('icon', validConfig.icon)
      if (validConfig.group) params.append('group', validConfig.group)
      if (validConfig.isArchive !== undefined) params.append('isArchive', validConfig.isArchive ? '1' : '0')
      if (validConfig.url) params.append('url', validConfig.url)

      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url

      const response = await fetch(finalUrl)
      const data = await response.json()

      return data.code === 200
    } catch (err) {
      console.error('Bark notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }
}

