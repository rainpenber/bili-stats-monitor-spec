import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * Webhook 配置 schema
 */
export const webhookConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  method: z.enum(['GET', 'POST']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
})

export type WebhookConfig = z.infer<typeof webhookConfigSchema>

/**
 * Webhook 通知渠道
 * 
 * 支持占位符：
 * - $title: 通知标题
 * - $content: 通知内容
 */
export class WebhookChannel implements NotifyChannel {
  readonly name = 'webhook'
  readonly configSchema = webhookConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 替换占位符
      const url = this.replacePlaceholders(validConfig.url, title, content)
      const body = validConfig.body
        ? this.replacePlaceholders(validConfig.body, title, content)
        : JSON.stringify({ title, content })

      const response = await fetch(url, {
        method: validConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...validConfig.headers,
        },
        body: validConfig.method === 'POST' ? body : undefined,
      })

      return response.ok
    } catch (err) {
      console.error('Webhook notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }

  private replacePlaceholders(template: string, title: string, content: string): string {
    return template.replace(/\$title/g, encodeURIComponent(title)).replace(/\$content/g, encodeURIComponent(content))
  }
}

