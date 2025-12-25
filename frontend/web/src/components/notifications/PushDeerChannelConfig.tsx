/**
 * PushDeer渠道配置组件
 * 
 * PushDeer是一个轻量级、跨平台的推送通知服务
 * 支持iOS、Android、Mac、Windows等多个平台
 * 
 * 配置字段：
 * - key: PushKey（必填）
 * - server: 自定义服务器URL（可选，默认使用官方服务器）
 */
import { Input } from '@/components/ui/Input'
import type { PushDeerChannelConfig } from '@/lib/validations/channelSchemas'

interface PushDeerChannelConfigProps {
  config: Partial<PushDeerChannelConfig>
  errors?: Record<string, string>
  onChange: (field: keyof PushDeerChannelConfig, value: any) => void
}

export function PushDeerChannelConfig({ config, errors = {}, onChange }: PushDeerChannelConfigProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* PushDeer Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PushKey <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.key || ''}
          onChange={(e) => onChange('key', e.target.value)}
          placeholder="PDU..."
          className={errors.key ? 'border-red-500' : ''}
        />
        {errors.key && (
          <p className="text-xs text-red-500 mt-1">{errors.key}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          从PushDeer应用中获取的PushKey（通常以PDU开头）
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
          placeholder="https://api2.pushdeer.com (默认)"
          className={errors.server ? 'border-red-500' : ''}
        />
        {errors.server && (
          <p className="text-xs text-red-500 mt-1">{errors.server}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          如果使用自建PushDeer服务器，在此填写服务器地址。留空使用官方服务器
        </p>
      </div>

      {/* 配置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">📱 如何获取PushKey</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>
            下载PushDeer应用：
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>iOS: App Store搜索"PushDeer"</li>
              <li>Android: 从官网或GitHub下载APK</li>
              <li>Mac/Windows: 从GitHub下载客户端</li>
            </ul>
          </li>
          <li>打开应用并使用Apple ID或微信登录</li>
          <li>在【Key】页面点击【+】创建新的PushKey</li>
          <li>为Key设置一个名称（如：Bili Stats Monitor）</li>
          <li>复制生成的PushKey（以PDU开头）并粘贴到上方字段</li>
        </ol>
      </div>

      {/* 平台支持说明 */}
      <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
        <p className="font-medium mb-1">🌟 PushDeer特点</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>支持iOS、Android、Mac、Windows多平台</li>
          <li>消息支持Markdown格式</li>
          <li>支持自建服务器部署（开源项目）</li>
          <li>免费使用，无需付费订阅</li>
          <li>消息实时推送，延迟低</li>
        </ul>
      </div>

      {/* 自建服务器说明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
        <p className="font-medium mb-1">🔧 自建服务器</p>
        <p className="text-xs">
          如果你部署了自己的PushDeer服务器，可以在"自定义服务器"字段填写服务器地址。
          PushDeer是开源项目，可以从GitHub获取源码并部署：
          <a 
            href="https://github.com/easychen/pushdeer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-1 underline hover:text-yellow-900"
          >
            github.com/easychen/pushdeer
          </a>
        </p>
      </div>

      {/* 快速配置提示 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
        <p className="font-medium mb-1">💡 快速配置</p>
        <p className="text-xs text-gray-600">
          基本配置只需要PushKey。如果使用自建服务器，需要同时填写自定义服务器地址。
        </p>
      </div>
    </div>
  )
}

