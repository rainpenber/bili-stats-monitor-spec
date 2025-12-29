import { QRCodeSVG } from 'qrcode.react'
import type { QRCodeStatus } from '@/types/bilibili'

interface QRCodeDisplayProps {
  qrUrl: string
  status: QRCodeStatus
  message: string
}

/**
 * 二维码显示组件
 * 显示二维码和当前状态提示
 */
export function QRCodeDisplay({ qrUrl, status, message }: QRCodeDisplayProps) {
  // 状态对应的样式
  const statusStyles: Record<QRCodeStatus, { bgColor: string; textColor: string; emoji: string }> = {
    pending: { bgColor: 'bg-blue-50', textColor: 'text-blue-700', emoji: '📱' },
    scanned: { bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', emoji: '👀' },
    confirmed: { bgColor: 'bg-green-50', textColor: 'text-green-700', emoji: '✅' },
    expired: { bgColor: 'bg-red-50', textColor: 'text-red-700', emoji: '⏰' },
  }

  const style = statusStyles[status]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 二维码容器 */}
      <div
        className={`relative p-4 rounded-lg border-2 ${
          status === 'expired' ? 'border-red-300 opacity-50' : 'border-border'
        }`}
      >
        <QRCodeSVG
          value={qrUrl}
          size={200}
          level="M"
          includeMargin={false}
        />
        
        {/* 过期遮罩 */}
        {status === 'expired' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <span className="text-white text-lg font-semibold">已过期</span>
          </div>
        )}
      </div>

      {/* 状态提示 */}
      <div className={`px-4 py-2 rounded-md ${style.bgColor} ${style.textColor}`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-base">{style.emoji}</span>
          <span>{message}</span>
        </div>
      </div>

      {/* 说明文字 */}
      <div className="text-xs text-muted-foreground text-center max-w-xs">
        {status === 'pending' && '请使用B站App扫描上方二维码'}
        {status === 'scanned' && '请在手机上确认登录'}
        {status === 'confirmed' && '登录成功，正在绑定账号...'}
        {status === 'expired' && '二维码已过期，请重新获取'}
      </div>
    </div>
  )
}

