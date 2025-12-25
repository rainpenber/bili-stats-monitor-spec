import { z } from 'zod'
import nodemailer from 'nodemailer'
import type { NotifyChannel } from '../channel'

/**
 * 邮件配置 schema
 */
export const emailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().default(587),
  secure: z.boolean().default(false), // true for 465, false for other ports
  user: z.string().min(1, 'SMTP user is required'),
  pass: z.string().min(1, 'SMTP password is required'),
  from: z.string().email('Invalid from email'),
  to: z.string().email('Invalid to email'),
})

export type EmailConfig = z.infer<typeof emailConfigSchema>

/**
 * 邮件（SMTP）通知渠道
 * 
 * 支持 SSL 和 TLS
 */
export class EmailChannel implements NotifyChannel {
  readonly name = 'email'
  readonly configSchema = emailConfigSchema

  async send(title: string, content: string, config: unknown): Promise<boolean> {
    try {
      const validConfig = this.configSchema.parse(config)

      // 创建 SMTP 传输器
      const transporter = nodemailer.createTransport({
        host: validConfig.host,
        port: validConfig.port,
        secure: validConfig.secure,
        auth: {
          user: validConfig.user,
          pass: validConfig.pass,
        },
      })

      // 发送邮件
      const info = await transporter.sendMail({
        from: validConfig.from,
        to: validConfig.to,
        subject: title,
        text: content,
        html: `<pre>${content}</pre>`,
      })

      return info.accepted.length > 0
    } catch (err) {
      console.error('Email notification failed:', err)
      return false
    }
  }

  async test(config: unknown): Promise<boolean> {
    return this.send('Test Notification', 'This is a test message from bili-stats-monitor', config)
  }
}

