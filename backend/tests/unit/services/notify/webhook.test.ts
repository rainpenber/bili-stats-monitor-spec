// T061: Webhook 通知渠道单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { WebhookChannel } from '../../../../src/services/notify/channels/webhook'

// Mock global fetch
global.fetch = vi.fn()

describe('WebhookChannel - Unit Tests', () => {
  let webhookChannel: WebhookChannel

  beforeEach(() => {
    webhookChannel = new WebhookChannel()
    vi.clearAllMocks()
  })

  describe('配置验证', () => {
    test('应验证有效的 Webhook 配置（最小配置）', () => {
      const validConfig = {
        url: 'https://example.com/webhook',
      }

      expect(() => webhookChannel.configSchema.parse(validConfig)).not.toThrow()
    })

    test('应验证有效的 Webhook 配置（完整配置）', () => {
      const validConfig = {
        url: 'https://example.com/webhook',
        method: 'POST' as const,
        headers: { 'X-Custom-Header': 'value' },
        body: '{"title": "$title", "content": "$content"}',
      }

      expect(() => webhookChannel.configSchema.parse(validConfig)).not.toThrow()
    })

    test('应拒绝无效的 URL', () => {
      const invalidConfig = {
        url: 'not-a-valid-url',
      }

      expect(() => webhookChannel.configSchema.parse(invalidConfig)).toThrow()
    })

    test('应拒绝无效的 HTTP 方法', () => {
      const invalidConfig = {
        url: 'https://example.com/webhook',
        method: 'PUT', // 不支持的方法
      }

      expect(() => webhookChannel.configSchema.parse(invalidConfig)).toThrow()
    })

    test('应使用默认 method=POST', () => {
      const config = {
        url: 'https://example.com/webhook',
      }

      const parsed = webhookChannel.configSchema.parse(config)
      expect(parsed.method).toBe('POST')
    })
  })

  describe('send - 发送 Webhook 请求', () => {
    test('POST 方法：应成功发送请求', async () => {
      const config = {
        url: 'https://example.com/webhook',
        method: 'POST' as const,
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await webhookChannel.send('Test Title', 'Test Content', config)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ title: 'Test Title', content: 'Test Content' }),
        })
      )
    })

    test('GET 方法：应发送不带 body 的请求', async () => {
      const config = {
        url: 'https://example.com/webhook',
        method: 'GET' as const,
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await webhookChannel.send('Title', 'Content', config)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'GET',
          body: undefined,
        })
      )
    })

    test('应替换 URL 中的占位符', async () => {
      const config = {
        url: 'https://example.com/webhook?title=$title&content=$content',
        method: 'GET' as const,
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await webhookChannel.send('My Title', 'My Content', config)

      const fetchUrl = (global.fetch as any).mock.calls[0][0]
      expect(fetchUrl).toContain('title=My%20Title')
      expect(fetchUrl).toContain('content=My%20Content')
    })

    test('应替换 body 中的占位符', async () => {
      const config = {
        url: 'https://example.com/webhook',
        method: 'POST' as const,
        body: '{"title": "$title", "message": "$content"}',
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await webhookChannel.send('Test Title', 'Test Message', config)

      const fetchBody = (global.fetch as any).mock.calls[0][1].body
      expect(fetchBody).toContain('Test%20Title')
      expect(fetchBody).toContain('Test%20Message')
    })

    test('应添加自定义请求头', async () => {
      const config = {
        url: 'https://example.com/webhook',
        method: 'POST' as const,
        headers: {
          'X-API-Key': 'secret123',
          'X-Custom': 'value',
        },
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await webhookChannel.send('Title', 'Content', config)

      const fetchHeaders = (global.fetch as any).mock.calls[0][1].headers
      expect(fetchHeaders['X-API-Key']).toBe('secret123')
      expect(fetchHeaders['X-Custom']).toBe('value')
      expect(fetchHeaders['Content-Type']).toBe('application/json')
    })

    test('HTTP 响应非 ok 应返回 false', async () => {
      const config = {
        url: 'https://example.com/webhook',
      }

      ;(global.fetch as any).mockResolvedValue({ ok: false, status: 500 })

      const result = await webhookChannel.send('Title', 'Content', config)

      expect(result).toBe(false)
    })

    test('网络请求失败应返回 false', async () => {
      const config = {
        url: 'https://example.com/webhook',
      }

      ;(global.fetch as any).mockRejectedValue(new Error('Network timeout'))

      const result = await webhookChannel.send('Title', 'Content', config)

      expect(result).toBe(false)
    })

    test('无效配置应返回 false', async () => {
      const invalidConfig = {
        url: 'not-a-url',
      }

      const result = await webhookChannel.send('Title', 'Content', invalidConfig)

      expect(result).toBe(false)
    })

    test('占位符应正确编码特殊字符', async () => {
      const config = {
        url: 'https://example.com/webhook?msg=$content',
        method: 'GET' as const,
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await webhookChannel.send('Title', 'Hello & <World>', config)

      const fetchUrl = (global.fetch as any).mock.calls[0][0]
      expect(fetchUrl).toContain('Hello%20%26%20%3CWorld%3E')
    })
  })

  describe('replacePlaceholders - 占位符替换', () => {
    test('应替换 $title 占位符', () => {
      const replaced = (webhookChannel as any).replacePlaceholders(
        'Title: $title',
        'My Title',
        'Content'
      )
      expect(replaced).toBe('Title: My%20Title')
    })

    test('应替换 $content 占位符', () => {
      const replaced = (webhookChannel as any).replacePlaceholders(
        'Content: $content',
        'Title',
        'My Content'
      )
      expect(replaced).toBe('Content: My%20Content')
    })

    test('应替换多个占位符', () => {
      const replaced = (webhookChannel as any).replacePlaceholders(
        '$title - $content - $title',
        'A',
        'B'
      )
      expect(replaced).toBe('A - B - A')
    })

    test('无占位符应保持不变', () => {
      const replaced = (webhookChannel as any).replacePlaceholders(
        'No placeholders here',
        'Title',
        'Content'
      )
      expect(replaced).toBe('No placeholders here')
    })

    test('应 URL 编码占位符值', () => {
      const replaced = (webhookChannel as any).replacePlaceholders(
        '$title',
        'Hello World!',
        ''
      )
      expect(replaced).toBe('Hello%20World!')
    })
  })

  describe('test - 测试通知', () => {
    test('应发送测试请求', async () => {
      const config = {
        url: 'https://example.com/test',
        method: 'POST' as const,
      }

      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await webhookChannel.test(config)

      expect(result).toBe(true)

      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(fetchBody.title).toBe('Test Notification')
      expect(fetchBody.content).toContain('This is a test message')
    })
  })
})


