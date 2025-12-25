import { NotifyChannel, NotifyEvent } from './channel'
import { WebhookChannel } from './channels/webhook'
import { BarkChannel } from './channels/bark'
import { PushDeerChannel } from './channels/pushdeer'
import { TelegramChannel } from './channels/telegram'
import { OneBotChannel } from './channels/onebot'
import { DingTalkChannel } from './channels/dingtalk'
import { FeishuChannel } from './channels/feishu'
import { WecomChannel } from './channels/wecom'
import { EmailChannel } from './channels/email'

/**
 * 通知规则
 */
export interface NotifyRule {
  id: string
  name: string
  channelName: string
  channelConfig: unknown
  events: string[] // 触发的事件类型
  enabled: boolean
}

/**
 * 通知服务
 */
export class NotifyService {
  private channels: Map<string, NotifyChannel> = new Map()

  constructor() {
    // 注册所有通知渠道
    this.registerChannel(new WebhookChannel())
    this.registerChannel(new BarkChannel())
    this.registerChannel(new PushDeerChannel())
    this.registerChannel(new TelegramChannel())
    this.registerChannel(new OneBotChannel())
    this.registerChannel(new DingTalkChannel())
    this.registerChannel(new FeishuChannel())
    this.registerChannel(new WecomChannel())
    this.registerChannel(new EmailChannel())
  }

  /**
   * 注册通知渠道
   */
  private registerChannel(channel: NotifyChannel): void {
    this.channels.set(channel.name, channel)
  }

  /**
   * 获取所有可用的渠道
   */
  getAvailableChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * 获取指定渠道
   */
  getChannel(name: string): NotifyChannel | undefined {
    return this.channels.get(name)
  }

  /**
   * 发送通知
   * @param event 通知事件
   * @param rules 通知规则列表
   */
  async send(event: NotifyEvent, rules: NotifyRule[]): Promise<void> {
    // 过滤出启用且匹配事件类型的规则
    const matchedRules = rules.filter(
      (rule) => rule.enabled && rule.events.includes(event.type)
    )

    if (matchedRules.length === 0) {
      console.log(`No matching notification rules for event type: ${event.type}`)
      return
    }

    // 并发发送通知
    const results = await Promise.allSettled(
      matchedRules.map(async (rule) => {
        const channel = this.channels.get(rule.channelName)
        if (!channel) {
          console.warn(`Channel not found: ${rule.channelName}`)
          return false
        }

        try {
          const success = await channel.send(event.title, event.content, rule.channelConfig)
          if (success) {
            console.log(`Notification sent successfully via ${rule.channelName} (rule: ${rule.name})`)
          } else {
            console.warn(`Notification failed via ${rule.channelName} (rule: ${rule.name})`)
          }
          return success
        } catch (err) {
          console.error(`Error sending notification via ${rule.channelName} (rule: ${rule.name}):`, err)
          return false
        }
      })
    )

    // 统计结果
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failed = results.length - successful

    console.log(`Notification summary: ${successful} succeeded, ${failed} failed`)
  }

  /**
   * 测试渠道配置
   */
  async testChannel(channelName: string, config: unknown): Promise<boolean> {
    const channel = this.channels.get(channelName)
    if (!channel) {
      console.warn(`Channel not found: ${channelName}`)
      return false
    }

    try {
      return await channel.test(config)
    } catch (err) {
      console.error(`Channel test failed for ${channelName}:`, err)
      return false
    }
  }
}

