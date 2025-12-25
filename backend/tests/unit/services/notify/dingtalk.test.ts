// T060: DingTalk 通知渠道单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { DingTalkChannel } from '../../../../src/services/notify/channels/dingtalk'

// Mock global fetch
global.fetch = vi.fn()

describe('DingTalkChannel - Unit Tests', () => {
  let dingtalkChannel: DingTalkChannel

  beforeEach(() => {
    dingtalkChannel = new DingTalkChannel()
    vi.clearAllMocks()
  })

  describe('配置验证', () => {
    test('应验证有效的钉钉配置（无密钥）', () => {
      const validConfig = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      }

      expect(() => dingtalkChannel.configSchema.parse(validConfig)).not.toThrow()
    })

    test('应验证有效的钉钉配置（有密钥）', () => {
      const validConfig = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        secret: 'SEC123456789abcdef',
      }

      expect(() => dingtalkChannel.configSchema.parse(validConfig)).not.toThrow()
    })

    test('应拒绝无效的 webhook URL', () => {
      const invalidConfig = {
        webhook: 'not-a-url',
      }

      expect(() => dingtalkChannel.configSchema.parse(invalidConfig)).toThrow()
    })

    test('密钥字段应为可选', () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      }

      const parsed = dingtalkChannel.configSchema.parse(config)
      expect(parsed.secret).toBeUndefined()
    })
  })

  describe('send - 发送钉钉消息', () => {
    test('无密钥：应成功发送消息', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test_token',
      }

      ;(global.fetch as any).mockResolvedValue({
        json: async () => ({ errcode: 0, errmsg: 'ok' }),
      })

      const result = await dingtalkChannel.send('Test Title', 'Test Content', config)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        config.webhook,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              title: 'Test Title',
              text: '### Test Title\n\nTest Content',
            },
          }),
        })
      )
    })

    test('有密钥：应生成签名并附加到 URL', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test_token',
        secret: 'SEC123456',
      }

      ;(global.fetch as any).mockResolvedValue({
        json: async () => ({ errcode: 0, errmsg: 'ok' }),
      })

      await dingtalkChannel.send('Title', 'Content', config)

      const fetchCall = (global.fetch as any).mock.calls[0][0]
      expect(fetchCall).toContain('timestamp=')
      expect(fetchCall).toContain('sign=')
    })

    test('API 返回错误码应返回 false', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      }

      ;(global.fetch as any).mockResolvedValue({
        json: async () => ({ errcode: 310000, errmsg: 'sign not match' }),
      })

      const result = await dingtalkChannel.send('Title', 'Content', config)

      expect(result).toBe(false)
    })

    test('网络请求失败应返回 false', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      }

      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await dingtalkChannel.send('Title', 'Content', config)

      expect(result).toBe(false)
    })

    test('无效配置应返回 false', async () => {
      const invalidConfig = {
        webhook: 'not-a-url',
      }

      const result = await dingtalkChannel.send('Title', 'Content', invalidConfig)

      expect(result).toBe(false)
    })

    test('应正确格式化 Markdown 消息', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      }

      ;(global.fetch as any).mockResolvedValue({
        json: async () => ({ errcode: 0 }),
      })

      await dingtalkChannel.send('My Title', 'My **bold** content', config)

      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(fetchBody.msgtype).toBe('markdown')
      expect(fetchBody.markdown.title).toBe('My Title')
      expect(fetchBody.markdown.text).toBe('### My Title\n\nMy **bold** content')
    })
  })

  describe('generateSign - 签名生成', () => {
    test('应生成正确的 HMAC-SHA256 签名', () => {
      const timestamp = 1609459200000
      const secret = 'SEC_TEST_KEY'

      // 调用私有方法（通过类型断言）
      const sign = (dingtalkChannel as any).generateSign(timestamp, secret)

      expect(sign).toBeTruthy()
      expect(typeof sign).toBe('string')
      
      // 验证签名是 Base64 格式
      expect(sign).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    test('相同输入应生成相同签名', () => {
      const timestamp = 1609459200000
      const secret = 'SECRET_KEY'

      const sign1 = (dingtalkChannel as any).generateSign(timestamp, secret)
      const sign2 = (dingtalkChannel as any).generateSign(timestamp, secret)

      expect(sign1).toBe(sign2)
    })

    test('不同时间戳应生成不同签名', () => {
      const secret = 'SECRET_KEY'

      const sign1 = (dingtalkChannel as any).generateSign(1000000, secret)
      const sign2 = (dingtalkChannel as any).generateSign(2000000, secret)

      expect(sign1).not.toBe(sign2)
    })

    test('不同密钥应生成不同签名', () => {
      const timestamp = 1609459200000

      const sign1 = (dingtalkChannel as any).generateSign(timestamp, 'SECRET1')
      const sign2 = (dingtalkChannel as any).generateSign(timestamp, 'SECRET2')

      expect(sign1).not.toBe(sign2)
    })
  })

  describe('test - 测试通知', () => {
    test('应发送测试消息', async () => {
      const config = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      }

      ;(global.fetch as any).mockResolvedValue({
        json: async () => ({ errcode: 0 }),
      })

      const result = await dingtalkChannel.test(config)

      expect(result).toBe(true)
      
      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(fetchBody.markdown.title).toBe('Test Notification')
      expect(fetchBody.markdown.text).toContain('This is a test message')
    })
  })
})


