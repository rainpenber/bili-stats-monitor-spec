/**
 * Bark渠道配置组件
 * 
 * Bark是iOS平台的推送通知应用
 * 
 * 配置字段：
 * - key: Bark Key（必填）
 * - server: 自定义服务器URL（可选，默认使用官方服务器）
 * - sound: 推送声音（可选）
 * - icon: 推送图标URL（可选）
 * - group: 分组（可选）
 * - isArchive: 是否自动保存（可选）
 * - url: 点击推送后打开的URL（可选）
 */
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { BarkChannelConfig } from '@/lib/validations/channelSchemas'

interface BarkChannelConfigProps {
  config: Partial<BarkChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof BarkChannelConfig, value: any) => void
}

export function BarkChannelConfig({ config, errors = {}, onChange }: BarkChannelConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Bark Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bark Key <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.key || ''}
          onChange={(e) => onChange('key', e.target.value)}
          placeholder="your_bark_key"
          className={errors.key ? 'border-red-500' : ''}
        />
        {errors.key && (
          <p className="text-xs text-red-500 mt-1">{errors.key}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          从Bark应用中获取的唯一Key
        </p>
      </div>

      {/* 自定义服务器 (可选) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          自定义服务器（可选）
        </label>
        <Input
          value={config.server || ''}
          onChange={(e) => onChange('server', e.target.value)}
          placeholder="https://api.day.app (默认)"
          className={errors.server ? 'border-red-500' : ''}
        />
        {errors.server && (
          <p className="text-xs text-red-500 mt-1">{errors.server}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          如果使用自建Bark服务器，在此填写服务器地址。留空使用官方服务器
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
          {/* 推送声音 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推送声音（可选）
            </label>
            <Input
              value={config.sound || ''}
              onChange={(e) => onChange('sound', e.target.value)}
              placeholder="默认声音"
              className={errors.sound ? 'border-red-500' : ''}
            />
            {errors.sound && (
              <p className="text-xs text-red-500 mt-1">{errors.sound}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              自定义推送声音名称（如：bell.caf、birdsong.caf等）
            </p>
          </div>

          {/* 推送图标 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推送图标URL（可选）
            </label>
            <Input
              value={config.icon || ''}
              onChange={(e) => onChange('icon', e.target.value)}
              placeholder="https://example.com/icon.png"
              className={errors.icon ? 'border-red-500' : ''}
            />
            {errors.icon && (
              <p className="text-xs text-red-500 mt-1">{errors.icon}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              自定义推送显示的图标（支持HTTP/HTTPS图片URL）
            </p>
          </div>

          {/* 分组 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分组（可选）
            </label>
            <Input
              value={config.group || ''}
              onChange={(e) => onChange('group', e.target.value)}
              placeholder="通知分组名称"
              className={errors.group ? 'border-red-500' : ''}
            />
            {errors.group && (
              <p className="text-xs text-red-500 mt-1">{errors.group}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              对推送消息进行分组管理
            </p>
          </div>

          {/* 点击跳转URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              点击跳转URL（可选）
            </label>
            <Input
              value={config.url || ''}
              onChange={(e) => onChange('url', e.target.value)}
              placeholder="https://example.com"
              className={errors.url ? 'border-red-500' : ''}
            />
            {errors.url && (
              <p className="text-xs text-red-500 mt-1">{errors.url}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              点击推送通知后打开的网页地址
            </p>
          </div>

          {/* 自动保存 */}
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isArchive || false}
                onChange={(e) => onChange('isArchive', e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-sm font-medium text-gray-700">
                自动保存推送通知
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              启用后，推送通知会自动保存到Bark的历史记录中
            </p>
          </div>
        </>
      )}

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">📱 如何获取Bark Key</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>在App Store下载并安装【Bark】应用（仅支持iOS）</li>
          <li>打开Bark应用</li>
          <li>首页会显示你的Bark Key（通常是一串字符）</li>
          <li>复制Key并粘贴到上方"Bark Key"字段</li>
          <li>如果使用自建服务器，需要在应用中配置服务器地址</li>
        </ol>
      </div>

      {/* 声音列表提示 */}
      {showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
          <p className="font-medium mb-1">🔔 常用声音列表</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>系统内置声音：</p>
            <ul className="list-disc list-inside ml-2">
              <li><code className="px-1 bg-gray-200 rounded">alarm.caf</code> - 闹钟</li>
              <li><code className="px-1 bg-gray-200 rounded">bell.caf</code> - 铃声</li>
              <li><code className="px-1 bg-gray-200 rounded">birdsong.caf</code> - 鸟鸣</li>
              <li><code className="px-1 bg-gray-200 rounded">electronic.caf</code> - 电子音</li>
              <li><code className="px-1 bg-gray-200 rounded">glass.caf</code> - 玻璃碎裂</li>
            </ul>
            <p className="mt-2">更多声音请查看Bark应用内置声音列表</p>
          </div>
        </div>
      )}

      {/* 快速配置提示 */}
      {!showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
          <p className="font-medium mb-1">💡 快速配置</p>
          <p className="text-xs text-gray-600">
            基本配置只需要Bark Key。如需自定义推送效果（声音、图标、跳转链接等），点击"显示高级配置"。
          </p>
        </div>
      )}
    </div>
  )
}

