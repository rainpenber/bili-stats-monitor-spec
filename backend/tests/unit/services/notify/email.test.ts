// T059: Email 通知渠道单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { EmailChannel } from '../../../../src/services/notify/channels/email'
import type nodemailer from 'nodemailer'

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}))

describe('EmailChannel - Unit Tests', () => {
  let emailChannel: EmailChannel
  let mockTransporter: any
  let mockCreateTransport: any

  beforeEach(async () => {
    // 获取mock的nodemailer
    const nodemailer = await import('nodemailer')
    mockCreateTransport = nodemailer.default.createTransport as any

    emailChannel = new EmailChannel()

    // 创建 mock transporter
    mockTransporter = {
      sendMail: vi.fn(),
    }

    // 配置 mock
    mockCreateTransport.mockReturnValue(mockTransporter)
    vi.clearAllMocks()
  })

  describe('配置验证', () => {
    test('应验证有效的邮件配置', () => {
      const validConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'user@example.com',
        pass: 'password123',
        from: 'sender@example.com',
        to: 'receiver@example.com',
      }

      expect(() => emailChannel.configSchema.parse(validConfig)).not.toThrow()
    })

    test('应拒绝缺少必填字段的配置', () => {
      const invalidConfig = {
        host: 'smtp.example.com',
        // 缺少 user, pass, from, to
      }

      expect(() => emailChannel.configSchema.parse(invalidConfig)).toThrow()
    })

    test('应拒绝无效的邮箱地址', () => {
      const invalidConfig = {
        host: 'smtp.example.com',
        user: 'user@example.com',
        pass: 'password',
        from: 'invalid-email', // 无效邮箱
        to: 'receiver@example.com',
      }

      expect(() => emailChannel.configSchema.parse(invalidConfig)).toThrow()
    })

    test('应使用默认端口 587', () => {
      const config = {
        host: 'smtp.example.com',
        user: 'user@example.com',
        pass: 'password',
        from: 'sender@example.com',
        to: 'receiver@example.com',
      }

      const parsed = emailChannel.configSchema.parse(config)
      expect(parsed.port).toBe(587)
    })

    test('应使用默认 secure=false', () => {
      const config = {
        host: 'smtp.example.com',
        user: 'user@example.com',
        pass: 'password',
        from: 'sender@example.com',
        to: 'receiver@example.com',
      }

      const parsed = emailChannel.configSchema.parse(config)
      expect(parsed.secure).toBe(false)
    })
  })

  describe('send - 发送邮件', () => {
    const validConfig = {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: 'user@example.com',
      pass: 'password123',
      from: 'sender@example.com',
      to: 'receiver@example.com',
    }

    test('应成功发送邮件', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        accepted: ['receiver@example.com'],
        rejected: [],
      })

      const result = await emailChannel.send('Test Title', 'Test Content', validConfig)

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: 'receiver@example.com',
        subject: 'Test Title',
        text: 'Test Content',
        html: '<pre>Test Content</pre>',
      })
    })

    test('邮件被拒绝应返回 false', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        accepted: [],
        rejected: ['receiver@example.com'],
      })

      const result = await emailChannel.send('Test Title', 'Test Content', validConfig)

      expect(result).toBe(false)
    })

    test('发送失败应捕获异常并返回 false', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'))

      const result = await emailChannel.send('Test Title', 'Test Content', validConfig)

      expect(result).toBe(false)
    })

    test('无效配置应返回 false', async () => {
      const invalidConfig = {
        host: 'smtp.example.com',
        // 缺少必填字段
      }

      const result = await emailChannel.send('Test Title', 'Test Content', invalidConfig)

      expect(result).toBe(false)
    })

    test('应正确创建 SMTP 传输器', async () => {
      mockTransporter.sendMail.mockResolvedValue({ accepted: ['test@example.com'] })

      await emailChannel.send('Title', 'Content', validConfig)

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user@example.com',
          pass: 'password123',
        },
      })
    })

    test('应支持 SSL 模式（port 465）', async () => {
      const sslConfig = {
        ...validConfig,
        port: 465,
        secure: true,
      }

      mockTransporter.sendMail.mockResolvedValue({ accepted: ['test@example.com'] })

      await emailChannel.send('Title', 'Content', sslConfig)

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      )
    })
  })

  describe('test - 测试通知', () => {
    test('应发送测试邮件', async () => {
      const config = {
        host: 'smtp.test.com',
        user: 'test@example.com',
        pass: 'testpass',
        from: 'test@example.com',
        to: 'receiver@example.com',
      }

      mockTransporter.sendMail.mockResolvedValue({ accepted: ['receiver@example.com'] })

      const result = await emailChannel.test(config)

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Notification',
          text: 'This is a test message from bili-stats-monitor',
        })
      )
    })
  })
})

