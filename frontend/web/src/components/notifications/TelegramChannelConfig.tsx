/**
 * Telegram渠道配置组件
 * 
 * 配置字段：
 * - botToken: Bot Token
 * - chatId: Chat ID
 * - apiHost: 自定义API Host（可选）
 * - proxyHost: 代理服务器地址（可选）
 * - proxyPort: 代理服务器端口（可选）
 * - proxyAuth: 代理认证信息（可选）
 */
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { TelegramChannelConfig } from '@/lib/validations/channelSchemas'

interface TelegramChannelConfigProps {
  config: Partial<TelegramChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof TelegramChannelConfig, value: any) => void
}

export function TelegramChannelConfig({ config, errors = {}, onChange }: TelegramChannelConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Bot Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bot Token <span className="text-red-500">*</span>
        </label>
        <Input
          type="password"
          value={config.botToken || ''}
          onChange={(e) => onChange('botToken', e.target.value)}
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          className={errors.botToken ? 'border-red-500' : ''}
        />
        {errors.botToken && (
          <p className="text-xs text-red-500 mt-1">{errors.botToken}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          从 @BotFather 获取的Bot Token
        </p>
      </div>

      {/* Chat ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chat ID <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.chatId || ''}
          onChange={(e) => onChange('chatId', e.target.value)}
          placeholder="-1001234567890 或 123456789"
          className={errors.chatId ? 'border-red-500' : ''}
        />
        {errors.chatId && (
          <p className="text-xs text-red-500 mt-1">{errors.chatId}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          接收消息的用户ID或群组ID（群组ID通常以-100开头）
        </p>
      </div>

      {/* 高级配置 */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
        >
          {showAdvanced ? '隐藏' : '显示'}高级配置
        </Button>
      </div>

      {showAdvanced && (
        <>
          {/* 自定义API Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自定义API Host（可选）
            </label>
            <Input
              value={config.apiHost || ''}
              onChange={(e) => onChange('apiHost', e.target.value)}
              placeholder="https://api.telegram.org"
              className={errors.apiHost ? 'border-red-500' : ''}
            />
            {errors.apiHost && (
              <p className="text-xs text-red-500 mt-1">{errors.apiHost}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              如果使用Telegram Bot API的自建服务器，可在此填写。留空使用官方API
            </p>
          </div>

          {/* 代理配置 */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">代理配置（可选）</h4>
            <p className="text-xs text-gray-500 mb-3">
              如果服务器无法直接访问Telegram，可配置HTTP/HTTPS代理
            </p>

            <div className="space-y-3">
              {/* 代理地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代理服务器地址
                </label>
                <Input
                  value={config.proxyHost || ''}
                  onChange={(e) => onChange('proxyHost', e.target.value)}
                  placeholder="proxy.example.com"
                  className={errors.proxyHost ? 'border-red-500' : ''}
                />
                {errors.proxyHost && (
                  <p className="text-xs text-red-500 mt-1">{errors.proxyHost}</p>
                )}
              </div>

              {/* 代理端口 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代理服务器端口
                </label>
                <Input
                  type="number"
                  value={config.proxyPort || ''}
                  onChange={(e) => onChange('proxyPort', parseInt(e.target.value) || undefined)}
                  placeholder="8080"
                  className={errors.proxyPort ? 'border-red-500' : ''}
                />
                {errors.proxyPort && (
                  <p className="text-xs text-red-500 mt-1">{errors.proxyPort}</p>
                )}
              </div>

              {/* 代理认证 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代理认证信息（可选）
                </label>
                <Input
                  type="password"
                  value={config.proxyAuth || ''}
                  onChange={(e) => onChange('proxyAuth', e.target.value)}
                  placeholder="username:password"
                  className={errors.proxyAuth ? 'border-red-500' : ''}
                />
                {errors.proxyAuth && (
                  <p className="text-xs text-red-500 mt-1">{errors.proxyAuth}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  如果代理需要认证，格式为 username:password
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">🤖 如何创建Telegram Bot</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>在Telegram中搜索并打开 @BotFather</li>
          <li>发送 <code className="mx-1 px-1 bg-blue-100 rounded">/newbot</code> 命令创建新Bot</li>
          <li>按提示设置Bot名称和用户名</li>
          <li>复制返回的Bot Token</li>
          <li>
            获取Chat ID：
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>个人：发送消息给 @userinfobot</li>
              <li>群组：添加 @userinfobot 到群组，查看群组ID</li>
            </ul>
          </li>
        </ol>
      </div>

      {/* 代理说明 */}
      {showAdvanced && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          <p className="font-medium mb-1">⚠️ 代理配置说明</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>如果服务器在中国大陆，可能需要配置代理才能访问Telegram</li>
            <li>支持HTTP和HTTPS代理</li>
            <li>代理配置暂时仅在配置文件中生效（需要后端支持）</li>
            <li>建议使用可信赖的代理服务，避免泄露Bot Token</li>
          </ul>
        </div>
      )}

      {/* 快速配置提示 */}
      {!showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
          <p className="font-medium mb-1">💡 快速配置</p>
          <p className="text-xs text-gray-600">
            基本配置只需要Bot Token和Chat ID。如果服务器无法直接访问Telegram或需要使用自建API服务器，请点击"显示高级配置"。
          </p>
        </div>
      )}
    </div>
  )
}

