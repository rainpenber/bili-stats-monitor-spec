import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * Telegram 配置 schema
 */
export const telegramConfigSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  apiHost: z.string().url().optional(),
  proxyHost: z.string().optional(),
  proxyPort: z.number().optional(),
  proxyAuth: z.string().optional(),
})

export type TelegramConfig = z.infer<typeof telegramConfigSchema>

/**
 * Telegram 通知渠道
 * 
 * 支持代理和自定义 API Host
 */
export class TelegramChannel implements NotifyChannel {
  readonly name = 'telegram'
  readonly configSchema = telegramConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 默认 Telegram API Host
      const apiHost = validConfig.apiHost || 'https://api.telegram.org'
      const url = `${apiHost}/bot${validConfig.botToken}/sendMessage`

      // 构建消息文本（Markdown 格式）
      const text = `*${this.escapeMarkdown(title)}*\n\n${this.escapeMarkdown(content)}`

      const body = {
        chat_id: validConfig.chatId,
        text,
        parse_mode: 'Markdown',
      }

      // 构建请求选项
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }

      // 如果配置了代理（注意：fetch API 不直接支持代理，需要使用其他库或系统代理）
      // 这里简化处理，实际使用时可能需要使用 https-proxy-agent 等库
      if (validConfig.proxyHost && validConfig.proxyPort) {
        console.warn('Telegram proxy configuration detected but not implemented in fetch API')
        // TODO: 实现代理支持
      }

      const response = await fetch(url, fetchOptions)
      const data = await response.json()

      return data.ok === true
    } catch (err) {
      console.error('Telegram notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }

  /**
   * 转义 Markdown 特殊字符
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
  }
}

