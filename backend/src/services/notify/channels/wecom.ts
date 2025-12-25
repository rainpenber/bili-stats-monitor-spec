import { z } from 'zod'
import type { NotifyChannel } from '../channel'

/**
 * 企业微信配置 schema
 */
export const wecomConfigSchema = z.object({
  type: z.enum(['app', 'bot']).default('bot'),
  // Bot Webhook 配置
  webhook: z.string().url().optional(),
  // App 配置
  corpId: z.string().optional(),
  corpSecret: z.string().optional(),
  agentId: z.string().optional(),
  toUser: z.string().optional(),
  // 代理配置
  proxyUrl: z.string().url().optional(),
})

export type WecomConfig = z.infer<typeof wecomConfigSchema>

/**
 * 企业微信通知渠道
 * 
 * 支持两种方式：
 * 1. 机器人 Webhook
 * 2. 应用消息
 * 
 * https://developer.work.weixin.qq.com/document/path/91770
 */
export class WecomChannel implements NotifyChannel {
  readonly name = 'wecom'
  readonly configSchema = wecomConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      if (validConfig.type === 'bot') {
        return await this.sendByBot(title, content, validConfig)
      } else {
        return await this.sendByApp(title, content, validConfig)
      }
    } catch (err) {
      console.error('Wecom notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }

  /**
   * 通过机器人 Webhook 发送
   */
  private async sendByBot(title: string, content: string, config: WecomConfig): Promise<boolean> {
    if (!config.webhook) {
      throw new Error('Webhook URL is required for bot type')
    }

    const body = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${title}\n\n${content}`,
      },
    }

    const url = config.proxyUrl || config.webhook

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return data.errcode === 0
  }

  /**
   * 通过应用消息发送
   */
  private async sendByApp(title: string, content: string, config: WecomConfig): Promise<boolean> {
    if (!config.corpId || !config.corpSecret || !config.agentId) {
      throw new Error('corpId, corpSecret and agentId are required for app type')
    }

    // 1. 获取 access_token
    const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.corpSecret}`
    const tokenResponse = await fetch(tokenUrl)
    const tokenData = await tokenResponse.json()

    if (tokenData.errcode !== 0) {
      throw new Error(`Failed to get access token: ${tokenData.errmsg}`)
    }

    const accessToken = tokenData.access_token

    // 2. 发送消息
    const messageUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`
    const body = {
      touser: config.toUser || '@all',
      msgtype: 'markdown',
      agentid: config.agentId,
      markdown: {
        content: `### ${title}\n\n${content}`,
      },
    }

    const response = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return data.errcode === 0
  }
}

