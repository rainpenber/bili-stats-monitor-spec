import { z } from 'zod'
import crypto from 'crypto'
import type { NotifyChannel } from '../channel'

/**
 * 钉钉配置 schema
 */
export const dingtalkConfigSchema = z.object({
  webhook: z.string().url('Invalid webhook URL'),
  secret: z.string().optional(), // 加签密钥
})

export type DingTalkConfig = z.infer<typeof dingtalkConfigSchema>

/**
 * 钉钉通知渠道
 * 
 * 支持 HMAC-SHA256 签名
 * https://open.dingtalk.com/document/robots/custom-robot-access
 */
export class DingTalkChannel implements NotifyChannel {
  readonly name = 'dingtalk'
  readonly configSchema = dingtalkConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      let url = validConfig.webhook

      // 如果配置了加签密钥，生成签名
      if (validConfig.secret) {
        const timestamp = Date.now()
        const sign = this.generateSign(timestamp, validConfig.secret)

        url = `${url}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
      }

      const body = {
        msgtype: 'markdown',
        markdown: {
          title,
          text: `### ${title}\n\n${content}`,
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      return data.errcode === 0
    } catch (err) {
      console.error('DingTalk notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }

  /**
   * 生成钉钉加签
   */
  private generateSign(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    return hmac.digest('base64')
  }
}

