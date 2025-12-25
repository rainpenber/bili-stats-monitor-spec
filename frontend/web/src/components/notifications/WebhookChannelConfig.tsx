/**
 * Webhook渠道配置组件
 * 
 * 配置字段：
 * - url: Webhook URL
 * - method: HTTP方法（GET/POST）
 * - headers: 自定义请求头（可选）
 * - body: 自定义请求体模板（可选）
 */
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { WebhookChannelConfig } from '@/lib/validations/channelSchemas'

interface WebhookChannelConfigProps {
  config: Partial<WebhookChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof WebhookChannelConfig, value: any) => void
}

export function WebhookChannelConfig({ config, errors = {}, onChange }: WebhookChannelConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [headerKey, setHeaderKey] = useState('')
  const [headerValue, setHeaderValue] = useState('')

  const headers = config.headers || {}

  const addHeader = () => {
    if (headerKey && headerValue) {
      onChange('headers', { ...headers, [headerKey]: headerValue })
      setHeaderKey('')
      setHeaderValue('')
    }
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[key]
    onChange('headers', Object.keys(newHeaders).length > 0 ? newHeaders : undefined)
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://api.example.com/webhook"
          className={errors.url ? 'border-red-500' : ''}
        />
        {errors.url && (
          <p className="text-xs text-red-500 mt-1">{errors.url}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          接收通知的Webhook地址
        </p>
      </div>

      {/* HTTP方法 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          HTTP方法 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="webhook-method"
              checked={config.method === 'POST' || !config.method}
              onChange={() => onChange('method', 'POST')}
            />
            <span>POST</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="webhook-method"
              checked={config.method === 'GET'}
              onChange={() => onChange('method', 'GET')}
            />
            <span>GET</span>
          </label>
        </div>
        {errors.method && (
          <p className="text-xs text-red-500 mt-1">{errors.method}</p>
        )}
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
          {/* 自定义请求头 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自定义请求头（可选）
            </label>
            <div className="space-y-2">
              {/* 已添加的headers */}
              {Object.entries(headers).length > 0 && (
                <div className="border rounded-md p-2 space-y-1">
                  {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="font-mono">
                        <strong>{key}:</strong> {value}
                      </span>
                      <button
                        onClick={() => removeHeader(key)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 添加新header */}
              <div className="flex gap-2">
                <Input
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header名称（如：Authorization）"
                  className="flex-1"
                />
                <Input
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  placeholder="Header值"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addHeader}
                  disabled={!headerKey || !headerValue}
                  type="button"
                >
                  添加
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                添加自定义HTTP请求头，例如Authorization或Content-Type
              </p>
            </div>
          </div>

          {/* 自定义请求体模板 */}
          {config.method === 'POST' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                请求体模板（可选）
              </label>
              <textarea
                value={config.body || ''}
                onChange={(e) => onChange('body', e.target.value)}
                placeholder={'{\n  "title": "{{title}}",\n  "content": "{{content}}",\n  "timestamp": "{{timestamp}}"\n}'}
                className="w-full border rounded-md p-2 text-sm font-mono min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                自定义请求体JSON模板。可用变量：
                <code className="mx-1 px-1 bg-gray-100 rounded">{'{{title}}'}</code>
                <code className="mx-1 px-1 bg-gray-100 rounded">{'{{content}}'}</code>
                <code className="mx-1 px-1 bg-gray-100 rounded">{'{{timestamp}}'}</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                留空则使用默认格式
              </p>
            </div>
          )}
        </>
      )}

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">🔗 Webhook使用说明</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Webhook URL必须是可公开访问的HTTPS地址</li>
          <li>POST方法会将通知内容作为JSON发送到指定URL</li>
          <li>GET方法会将内容作为查询参数附加到URL</li>
          <li>可以添加自定义请求头用于认证（如API Key）</li>
          <li>请求体模板支持变量替换，可自定义通知格式</li>
        </ul>
      </div>

      {/* 示例 */}
      {!showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
          <p className="font-medium mb-1">💡 快速配置</p>
          <p className="text-xs text-gray-600">
            基本配置只需要URL和HTTP方法。如需自定义请求头或请求体格式，点击"显示高级配置"。
          </p>
        </div>
      )}
    </div>
  )
}

