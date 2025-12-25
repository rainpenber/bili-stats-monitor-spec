import { z } from 'zod'
import crypto from 'crypto'
import type { NotifyChannel } from '../channel'

/**
 * 飞书配置 schema
 */
export const feishuConfigSchema = z.object({
  webhook: z.string().url('Invalid webhook URL'),
  secret: z.string().optional(), // 签名密钥
})

export type FeishuConfig = z.infer<typeof feishuConfigSchema>

/**
 * 飞书通知渠道
 * 
 * https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
 */
export class FeishuChannel implements NotifyChannel {
  readonly name = 'feishu'
  readonly configSchema = feishuConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      const body: any = {
        msg_type: 'text',
        content: {
          text: `${title}\n\n${content}`,
        },
      }

      // 如果配置了签名密钥，生成签名
      if (validConfig.secret) {
        const timestamp = Math.floor(Date.now() / 1000)
        const sign = this.generateSign(timestamp, validConfig.secret)

        body.timestamp = timestamp.toString()
        body.sign = sign
      }

      const response = await fetch(validConfig.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      return data.code === 0
    } catch (err) {
      console.error('Feishu notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }

  /**
   * 生成飞书签名
   */
  private generateSign(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', '')
    hmac.update(stringToSign)
    return hmac.digest('base64')
  }
}

