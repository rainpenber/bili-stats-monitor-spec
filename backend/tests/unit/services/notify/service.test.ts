// T062: Notify 服务层错误处理单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { NotifyService } from '../../../../src/services/notify/service'
import type { NotifyEvent, NotifyChannel } from '../../../../src/services/notify/channel'
import type { NotifyRule } from '../../../../src/services/notify/service'

// Mock 所有通知渠道
vi.mock('../../../../src/services/notify/channels/email', () => {
  return {
    EmailChannel: class {
      name = 'email'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/dingtalk', () => {
  return {
    DingTalkChannel: class {
      name = 'dingtalk'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/webhook', () => {
  return {
    WebhookChannel: class {
      name = 'webhook'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/bark', () => {
  return {
    BarkChannel: class {
      name = 'bark'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/pushdeer', () => {
  return {
    PushDeerChannel: class {
      name = 'pushdeer'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/telegram', () => {
  return {
    TelegramChannel: class {
      name = 'telegram'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/onebot', () => {
  return {
    OneBotChannel: class {
      name = 'onebot'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/feishu', () => {
  return {
    FeishuChannel: class {
      name = 'feishu'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

vi.mock('../../../../src/services/notify/channels/wecom', () => {
  return {
    WecomChannel: class {
      name = 'wecom'
      send = vi.fn()
      test = vi.fn()
    },
  }
})

describe('NotifyService - 错误处理单元测试', () => {
  let notifyService: NotifyService

  beforeEach(() => {
    notifyService = new NotifyService()
  })

  describe('getAvailableChannels - 获取可用渠道', () => {
    test('应返回所有已注册的渠道', () => {
      const channels = notifyService.getAvailableChannels()

      expect(channels).toContain('email')
      expect(channels).toContain('dingtalk')
      expect(channels).toContain('webhook')
      expect(channels).toContain('bark')
      expect(channels).toContain('pushdeer')
      expect(channels).toContain('telegram')
      expect(channels).toContain('onebot')
      expect(channels).toContain('feishu')
      expect(channels).toContain('wecom')
    })

    test('应返回至少 9 个渠道', () => {
      const channels = notifyService.getAvailableChannels()

      expect(channels.length).toBeGreaterThanOrEqual(9)
    })
  })

  describe('getChannel - 获取指定渠道', () => {
    test('应返回已注册的渠道', () => {
      const channel = notifyService.getChannel('email')

      expect(channel).toBeDefined()
      expect(channel?.name).toBe('email')
    })

    test('不存在的渠道应返回 undefined', () => {
      const channel = notifyService.getChannel('non-existent-channel')

      expect(channel).toBeUndefined()
    })
  })

  describe('send - 发送通知（错误处理）', () => {
    const mockEvent: NotifyEvent = {
      type: 'task_stopped',
      title: 'Task Stopped',
      content: 'Task has been stopped',
    }

    test('无匹配规则应不发送任何通知', async () => {
      const rules: NotifyRule[] = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          channelName: 'email',
          channelConfig: { /* ... */ },
          events: ['task_started'], // 不匹配 task_stopped
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send')

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).not.toHaveBeenCalled()
    })

    test('禁用的规则应不发送通知', async () => {
      const rules: NotifyRule[] = [
        {
          id: 'rule-2',
          name: 'Disabled Rule',
          channelName: 'email',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: false, // 已禁用
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send')

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).not.toHaveBeenCalled()
    })

    test('匹配的规则应发送通知', async () => {
      const rules: NotifyRule[] = [
        {
          id: 'rule-3',
          name: 'Active Rule',
          channelName: 'email',
          channelConfig: { to: 'test@example.com' },
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send').mockResolvedValue(true)

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).toHaveBeenCalledWith(
        'Task Stopped',
        'Task has been stopped',
        { to: 'test@example.com' }
      )
    })

    test('渠道不存在应记录警告但不抛出异常', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const rules: NotifyRule[] = [
        {
          id: 'rule-4',
          name: 'Invalid Channel Rule',
          channelName: 'non-existent-channel',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      // 不应抛出异常
      await expect(notifyService.send(mockEvent, rules)).resolves.toBeUndefined()

      expect(consoleWarnSpy).toHaveBeenCalledWith('Channel not found: non-existent-channel')

      consoleWarnSpy.mockRestore()
    })

    test('渠道发送失败应记录错误但不影响其他渠道', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const rules: NotifyRule[] = [
        {
          id: 'rule-5',
          name: 'Failing Rule',
          channelName: 'email',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
        {
          id: 'rule-6',
          name: 'Success Rule',
          channelName: 'webhook',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const webhookChannel = notifyService.getChannel('webhook')

      vi.spyOn(emailChannel!, 'send').mockRejectedValue(new Error('Email send failed'))
      vi.spyOn(webhookChannel!, 'send').mockResolvedValue(true)

      await notifyService.send(mockEvent, rules)

      // 错误应被记录
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error sending notification via email'),
        expect.any(Error)
      )

      // 成功的通知也应被记录
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification sent successfully via webhook')
      )

      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    test('渠道返回 false 应记录警告', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const rules: NotifyRule[] = [
        {
          id: 'rule-7',
          name: 'Failed Rule',
          channelName: 'dingtalk',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      const dingtalkChannel = notifyService.getChannel('dingtalk')
      vi.spyOn(dingtalkChannel!, 'send').mockResolvedValue(false)

      await notifyService.send(mockEvent, rules)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification failed via dingtalk')
      )

      consoleWarnSpy.mockRestore()
    })

    test('多个匹配规则应并发发送', async () => {
      const rules: NotifyRule[] = [
        {
          id: 'rule-8',
          name: 'Rule 8',
          channelName: 'email',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
        {
          id: 'rule-9',
          name: 'Rule 9',
          channelName: 'webhook',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
        {
          id: 'rule-10',
          name: 'Rule 10',
          channelName: 'dingtalk',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const webhookChannel = notifyService.getChannel('webhook')
      const dingtalkChannel = notifyService.getChannel('dingtalk')

      const emailSpy = vi.spyOn(emailChannel!, 'send').mockResolvedValue(true)
      const webhookSpy = vi.spyOn(webhookChannel!, 'send').mockResolvedValue(true)
      const dingtalkSpy = vi.spyOn(dingtalkChannel!, 'send').mockResolvedValue(true)

      await notifyService.send(mockEvent, rules)

      // 所有渠道都应被调用
      expect(emailSpy).toHaveBeenCalled()
      expect(webhookSpy).toHaveBeenCalled()
      expect(dingtalkSpy).toHaveBeenCalled()
    })

    test('规则匹配多个事件类型时应发送', async () => {
      const rules: NotifyRule[] = [
        {
          id: 'rule-11',
          name: 'Multi-Event Rule',
          channelName: 'email',
          channelConfig: {},
          events: ['task_started', 'task_stopped', 'task_failed'],
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send').mockResolvedValue(true)

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).toHaveBeenCalled()
    })
  })

  describe('testChannel - 测试渠道（错误处理）', () => {
    test('渠道存在应调用 test 方法', async () => {
      const channelName = 'webhook'
      const config = { url: 'https://example.com' }

      const webhookChannel = notifyService.getChannel(channelName)
      const testSpy = vi.spyOn(webhookChannel!, 'test').mockResolvedValue(true)

      const result = await notifyService.testChannel(channelName, config)

      expect(result).toBe(true)
      expect(testSpy).toHaveBeenCalledWith(config)
    })

    test('渠道不存在应返回 false', async () => {
      const result = await notifyService.testChannel('non-existent', {})

      expect(result).toBe(false)
    })

    test('测试失败应返回 false', async () => {
      const channelName = 'email'
      const config = { invalid: 'config' }

      const emailChannel = notifyService.getChannel(channelName)
      vi.spyOn(emailChannel!, 'test').mockResolvedValue(false)

      const result = await notifyService.testChannel(channelName, config)

      expect(result).toBe(false)
    })

    test('测试抛出异常应返回 false', async () => {
      const channelName = 'dingtalk'
      const config = {}

      const dingtalkChannel = notifyService.getChannel(channelName)
      vi.spyOn(dingtalkChannel!, 'test').mockRejectedValue(new Error('Test error'))

      const result = await notifyService.testChannel(channelName, config)

      expect(result).toBe(false)
    })
  })

  describe('边界情况和异常处理', () => {
    test('空规则列表应不发送任何通知', async () => {
      const mockEvent: NotifyEvent = {
        type: 'task_stopped',
        title: 'Test',
        content: 'Test',
      }

      await expect(notifyService.send(mockEvent, [])).resolves.toBeUndefined()
    })

    test('事件类型为空字符串应不匹配任何规则', async () => {
      const mockEvent: NotifyEvent = {
        type: '',
        title: 'Test',
        content: 'Test',
      }

      const rules: NotifyRule[] = [
        {
          id: 'rule',
          name: 'Rule',
          channelName: 'email',
          channelConfig: {},
          events: ['task_stopped'],
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send')

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).not.toHaveBeenCalled()
    })

    test('规则事件列表为空应不匹配', async () => {
      const mockEvent: NotifyEvent = {
        type: 'task_stopped',
        title: 'Test',
        content: 'Test',
      }

      const rules: NotifyRule[] = [
        {
          id: 'rule',
          name: 'Rule',
          channelName: 'email',
          channelConfig: {},
          events: [], // 空事件列表
          enabled: true,
        },
      ]

      const emailChannel = notifyService.getChannel('email')
      const sendSpy = vi.spyOn(emailChannel!, 'send')

      await notifyService.send(mockEvent, rules)

      expect(sendSpy).not.toHaveBeenCalled()
    })
  })
})

