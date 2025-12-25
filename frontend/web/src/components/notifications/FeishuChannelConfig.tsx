/**
 * Feishu (飞书) 渠道配置组件
 * 
 * 配置字段：
 * - webhook: Webhook URL（必填）
 * - secret: 签名密钥（可选，用于安全性验证）
 */
import { Input } from '@/components/ui/Input'
import type { FeishuChannelConfig } from '@/lib/validations/channelSchemas'

interface FeishuChannelConfigProps {
  config: Partial<FeishuChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof FeishuChannelConfig, value: any) => void
}

export function FeishuChannelConfig({ config, errors = {}, onChange }: FeishuChannelConfigProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.webhook || ''}
          onChange={(e) => onChange('webhook', e.target.value)}
          placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
          className={errors.webhook ? 'border-red-500' : ''}
        />
        {errors.webhook && (
          <p className="text-xs text-red-500 mt-1">{errors.webhook}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          从飞书群设置中获取的机器人Webhook地址
        </p>
      </div>

      {/* 签名密钥 (可选) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          签名密钥（可选）
        </label>
        <Input
          type="password"
          value={config.secret || ''}
          onChange={(e) => onChange('secret', e.target.value)}
          placeholder="签名密钥"
          className={errors.secret ? 'border-red-500' : ''}
        />
        {errors.secret && (
          <p className="text-xs text-red-500 mt-1">{errors.secret}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          如果启用了签名验证安全设置，在此填写密钥
        </p>
      </div>

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">🤖 如何配置飞书机器人</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>打开飞书群聊，点击右上角【...】→【设置】</li>
          <li>选择【群机器人】→【添加机器人】→【自定义机器人】</li>
          <li>设置机器人名称和描述</li>
          <li>
            安全设置：选择【签名验证】方式（推荐）
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>系统会生成一个签名密钥</li>
              <li>将密钥复制到上方"签名密钥"字段</li>
            </ul>
          </li>
          <li>完成后，复制Webhook URL到上方"Webhook URL"字段</li>
        </ol>
      </div>

      {/* 安全提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
        <p className="font-medium mb-1">⚠️ 安全建议</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>强烈建议启用【签名验证】安全设置，防止Webhook被恶意调用</li>
          <li>不要将Webhook URL和密钥泄露给他人</li>
          <li>定期更换机器人密钥以提高安全性</li>
          <li>可以在机器人设置中限制IP白名单</li>
        </ul>
      </div>

      {/* 快速配置提示 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
        <p className="font-medium mb-1">💡 快速配置</p>
        <p className="text-xs text-gray-600">
          基本配置只需要Webhook URL。如果机器人启用了签名验证安全设置，需要同时填写签名密钥。
        </p>
      </div>
    </div>
  )
}

