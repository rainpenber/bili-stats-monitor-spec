/**
 * OneBot v11 (QQ机器人) 渠道配置组件
 * 
 * 支持两种消息类型：
 * 1. 私聊消息
 * 2. 群聊消息
 * 
 * 配置字段：
 * - url: OneBot HTTP API地址
 * - accessToken: 访问令牌（可选）
 * - messageType: 消息类型
 * - userId: 私聊用户ID
 * - groupId: 群组ID
 */
import { Input } from '@/components/ui/Input'
import type { OneBotChannelConfig } from '@/lib/validations/channelSchemas'

interface OneBotChannelConfigProps {
  config: Partial<OneBotChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof OneBotChannelConfig, value: any) => void
}

export function OneBotChannelConfig({ config, errors = {}, onChange }: OneBotChannelConfigProps) {
  const messageType = config.messageType || 'private'

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* OneBot API地址 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          OneBot HTTP API地址 <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="http://localhost:5700"
          className={errors.url ? 'border-red-500' : ''}
        />
        {errors.url && (
          <p className="text-xs text-red-500 mt-1">{errors.url}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          OneBot实现（如go-cqhttp）的HTTP API地址
        </p>
      </div>

      {/* Access Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Access Token（可选）
        </label>
        <Input
          type="password"
          value={config.accessToken || ''}
          onChange={(e) => onChange('accessToken', e.target.value)}
          placeholder="••••••••"
          className={errors.accessToken ? 'border-red-500' : ''}
        />
        {errors.accessToken && (
          <p className="text-xs text-red-500 mt-1">{errors.accessToken}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          如果OneBot实例配置了access_token，请在此填写
        </p>
      </div>

      {/* 消息类型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          消息类型 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="onebot-message-type"
              checked={messageType === 'private'}
              onChange={() => onChange('messageType', 'private')}
            />
            <span>私聊消息</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="onebot-message-type"
              checked={messageType === 'group'}
              onChange={() => onChange('messageType', 'group')}
            />
            <span>群聊消息</span>
          </label>
        </div>
        {errors.messageType && (
          <p className="text-xs text-red-500 mt-1">{errors.messageType}</p>
        )}
      </div>

      {/* 私聊用户ID */}
      {messageType === 'private' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QQ号（用户ID）<span className="text-red-500">*</span>
          </label>
          <Input
            value={config.userId || ''}
            onChange={(e) => onChange('userId', e.target.value)}
            placeholder="123456789"
            className={errors.userId ? 'border-red-500' : ''}
          />
          {errors.userId && (
            <p className="text-xs text-red-500 mt-1">{errors.userId}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            接收私聊消息的QQ号
          </p>
        </div>
      )}

      {/* 群组ID */}
      {messageType === 'group' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            群号（群组ID）<span className="text-red-500">*</span>
          </label>
          <Input
            value={config.groupId || ''}
            onChange={(e) => onChange('groupId', e.target.value)}
            placeholder="987654321"
            className={errors.groupId ? 'border-red-500' : ''}
          />
          {errors.groupId && (
            <p className="text-xs text-red-500 mt-1">{errors.groupId}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            接收群聊消息的QQ群号
          </p>
        </div>
      )}

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">🤖 OneBot配置步骤</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>
            <strong>安装OneBot实现：</strong>
            推荐使用 
            <a href="https://github.com/Mrs4s/go-cqhttp" target="_blank" rel="noopener noreferrer" className="underline ml-1">
              go-cqhttp
            </a>
          </li>
          <li>配置go-cqhttp的config.yml，启用HTTP服务</li>
          <li>获取HTTP API地址（默认http://localhost:5700）</li>
          <li>如果配置了access_token，需要在上方填写</li>
          <li>根据需要选择私聊或群聊，并填写对应的QQ号/群号</li>
        </ol>
      </div>

      {/* 安全提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
        <p className="font-medium mb-1">⚠️ 安全提示</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>请确保OneBot实例配置了access_token以保护API安全</li>
          <li>不要将QQ机器人用于违反腾讯服务条款的用途</li>
          <li>建议使用小号作为机器人账号</li>
        </ul>
      </div>
    </div>
  )
}

