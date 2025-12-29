/**
 * 企业微信渠道配置组件
 * 
 * 支持两种模式：
 * 1. Bot模式：机器人Webhook
 * 2. App模式：企业应用消息
 * 
 * 配置字段：
 * - type: 模式类型
 * - webhook: Bot模式的Webhook URL
 * - corpId: App模式的企业ID
 * - corpSecret: App模式的企业Secret
 * - agentId: App模式的应用ID
 * - toUser: 接收用户（可选）
 * - proxyUrl: 代理URL（可选）
 */
import { Input } from '@/components/ui/Input'
import type { WecomChannelConfig } from '@/lib/validations/channelSchemas'

interface WecomChannelConfigProps {
  config: Partial<WecomChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof WecomChannelConfig, value: any) => void
}

export function WecomChannelConfig({ config, errors = {}, onChange }: WecomChannelConfigProps) {
  const mode = config.type || 'bot'

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* 模式选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          消息推送方式 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="wecom-type"
              checked={mode === 'bot'}
              onChange={() => onChange('type', 'bot')}
            />
            <span>机器人Webhook</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="wecom-type"
              checked={mode === 'app'}
              onChange={() => onChange('type', 'app')}
            />
            <span>企业应用消息</span>
          </label>
        </div>
        {errors.type && (
          <p className="text-xs text-red-500 mt-1">{errors.type}</p>
        )}
      </div>

      {/* Bot模式配置 */}
      {mode === 'bot' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL <span className="text-red-500">*</span>
            </label>
            <Input
              value={config.webhook || ''}
              onChange={(e) => onChange('webhook', e.target.value)}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
              className={errors.webhook ? 'border-red-500' : ''}
            />
            {errors.webhook && (
              <p className="text-xs text-red-500 mt-1">{errors.webhook}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              在企业微信群中添加机器人后获取Webhook地址
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">🤖 如何获取Webhook URL</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>在企业微信群中点击右上角"..."</li>
              <li>选择"群机器人" → "添加机器人"</li>
              <li>为机器人命名并添加</li>
              <li>复制生成的Webhook地址</li>
            </ol>
          </div>
        </>
      )}

      {/* App模式配置 */}
      {mode === 'app' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              企业ID (Corp ID) <span className="text-red-500">*</span>
            </label>
            <Input
              value={config.corpId || ''}
              onChange={(e) => onChange('corpId', e.target.value)}
              placeholder="ww1234567890abcdef"
              className={errors.corpId ? 'border-red-500' : ''}
            />
            {errors.corpId && (
              <p className="text-xs text-red-500 mt-1">{errors.corpId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              在企业微信管理后台"我的企业"中查看
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              应用Secret (Corp Secret) <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={config.corpSecret || ''}
              onChange={(e) => onChange('corpSecret', e.target.value)}
              placeholder="••••••••"
              className={errors.corpSecret ? 'border-red-500' : ''}
            />
            {errors.corpSecret && (
              <p className="text-xs text-red-500 mt-1">{errors.corpSecret}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              在应用详情页查看Secret
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              应用ID (Agent ID) <span className="text-red-500">*</span>
            </label>
            <Input
              value={config.agentId || ''}
              onChange={(e) => onChange('agentId', e.target.value)}
              placeholder="1000002"
              className={errors.agentId ? 'border-red-500' : ''}
            />
            {errors.agentId && (
              <p className="text-xs text-red-500 mt-1">{errors.agentId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              在应用详情页查看AgentId
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              接收用户
            </label>
            <Input
              value={config.toUser || ''}
              onChange={(e) => onChange('toUser', e.target.value)}
              placeholder="@all 或 UserID1|UserID2"
            />
            <p className="text-xs text-gray-500 mt-1">
              留空或填写@all发送给所有人，也可指定用户ID（多个用|分隔）
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">📱 企业应用配置步骤</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>登录企业微信管理后台</li>
              <li>进入"应用管理" → "应用" → "创建应用"</li>
              <li>创建或选择一个应用</li>
              <li>查看应用详情获取AgentId和Secret</li>
              <li>在"我的企业"页面获取企业ID</li>
            </ol>
          </div>
        </>
      )}

      {/* 代理配置（可选） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          代理URL（可选）
        </label>
        <Input
          value={config.proxyUrl || ''}
          onChange={(e) => onChange('proxyUrl', e.target.value)}
          placeholder="https://proxy.example.com"
          className={errors.proxyUrl ? 'border-red-500' : ''}
        />
        {errors.proxyUrl && (
          <p className="text-xs text-red-500 mt-1">{errors.proxyUrl}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          如需通过代理服务器访问企业微信API，请填写代理地址
        </p>
      </div>
    </div>
  )
}

