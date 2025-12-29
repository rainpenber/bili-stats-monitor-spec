/**
 * Email渠道配置组件
 * 
 * 配置字段：
 * - host: SMTP服务器地址
 * - port: SMTP端口（默认587）
 * - secure: 是否使用SSL/TLS
 * - user: SMTP用户名
 * - pass: SMTP密码
 * - from: 发件人邮箱
 * - to: 收件人邮箱
 */
import { Input } from '@/components/ui/Input'
import type { EmailChannelConfig } from '@/lib/validations/channelSchemas'

interface EmailChannelConfigProps {
  config: Partial<EmailChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof EmailChannelConfig, value: any) => void
}

export function EmailChannelConfig({ config, errors = {}, onChange }: EmailChannelConfigProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* SMTP服务器 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SMTP服务器 <span className="text-red-500">*</span>
          </label>
          <Input
            value={config.host || ''}
            onChange={(e) => onChange('host', e.target.value)}
            placeholder="smtp.gmail.com"
            className={errors.host ? 'border-red-500' : ''}
          />
          {errors.host && (
            <p className="text-xs text-red-500 mt-1">{errors.host}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            端口 <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={config.port || 587}
            onChange={(e) => onChange('port', parseInt(e.target.value))}
            placeholder="587"
            className={errors.port ? 'border-red-500' : ''}
          />
          {errors.port && (
            <p className="text-xs text-red-500 mt-1">{errors.port}</p>
          )}
        </div>
      </div>

      {/* SSL/TLS */}
      <div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.secure || false}
            onChange={(e) => onChange('secure', e.target.checked)}
          />
          <span>使用 SSL/TLS（端口465时通常需要勾选）</span>
        </label>
      </div>

      {/* 认证信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用户名 <span className="text-red-500">*</span>
          </label>
          <Input
            value={config.user || ''}
            onChange={(e) => onChange('user', e.target.value)}
            placeholder="your-email@gmail.com"
            className={errors.user ? 'border-red-500' : ''}
          />
          {errors.user && (
            <p className="text-xs text-red-500 mt-1">{errors.user}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密码/应用专用密码 <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            value={config.pass || ''}
            onChange={(e) => onChange('pass', e.target.value)}
            placeholder="••••••••"
            className={errors.pass ? 'border-red-500' : ''}
          />
          {errors.pass && (
            <p className="text-xs text-red-500 mt-1">{errors.pass}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Gmail等邮箱需要使用应用专用密码
          </p>
        </div>
      </div>

      {/* 发件人和收件人 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            发件人邮箱 <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={config.from || ''}
            onChange={(e) => onChange('from', e.target.value)}
            placeholder="sender@example.com"
            className={errors.from ? 'border-red-500' : ''}
          />
          {errors.from && (
            <p className="text-xs text-red-500 mt-1">{errors.from}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            收件人邮箱 <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={config.to || ''}
            onChange={(e) => onChange('to', e.target.value)}
            placeholder="recipient@example.com"
            className={errors.to ? 'border-red-500' : ''}
          />
          {errors.to && (
            <p className="text-xs text-red-500 mt-1">{errors.to}</p>
          )}
        </div>
      </div>

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">📧 常见SMTP配置</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Gmail: smtp.gmail.com:587 (需要开启2FA并生成应用专用密码)</li>
          <li>Outlook: smtp-mail.outlook.com:587</li>
          <li>QQ邮箱: smtp.qq.com:587 (需要开启SMTP并获取授权码)</li>
          <li>163邮箱: smtp.163.com:465 (SSL)</li>
        </ul>
      </div>
    </div>
  )
}

