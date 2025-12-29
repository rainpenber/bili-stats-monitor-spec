import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { QRCodeDisplay } from './QRCodeDisplay'
import { useQRCodePolling } from '@/hooks/useQRCodePolling'
import { generateQRCode } from '@/lib/api'
import { toast } from 'sonner'
import type { BilibiliAccount } from '@/types/bilibili'

interface QRCodeBindingTabProps {
  isActive: boolean
  onSuccess: () => void
}

/**
 * 扫码绑定标签页组件
 * 生成二维码、轮询状态、处理绑定成功/失败
 */
export function QRCodeBindingTab({ isActive, onSuccess }: QRCodeBindingTabProps) {
  const [qrcodeKey, setQrcodeKey] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [expireAt, setExpireAt] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 绑定成功回调
  function handleBindSuccess(account: BilibiliAccount) {
    toast.success(`账号 ${account.nickname} 绑定成功！`)
    onSuccess()
  }

  // 二维码过期回调
  function handleExpired() {
    toast.warning('二维码已过期，请重新获取')
  }

  // 使用轮询Hook
  const { status, message, account, isPolling, error: pollingError } = useQRCodePolling({
    qrcodeKey,
    enabled: isActive && qrcodeKey !== null,
    interval: 2000,
    onSuccess: handleBindSuccess,
    onExpired: handleExpired,
  })

  // 生成二维码
  const generateNewQRCode = async () => {
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const result = await generateQRCode()
      setQrcodeKey(result.qrcodeKey)
      setQrUrl(result.qrUrl)
      setExpireAt(result.expireAt)
    } catch (err: any) {
      console.error('Failed to generate QR code:', err)
      const errorMessage = err.message || '生成二维码失败，请稍后重试'
      setGenerateError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  // 重新获取二维码
  const handleRegenerateQRCode = () => {
    // 清理旧状态
    setQrcodeKey(null)
    setQrUrl('')
    setExpireAt('')
    setGenerateError(null)

    // 生成新二维码
    generateNewQRCode()
  }

  // 初始化时生成二维码
  useEffect(() => {
    if (isActive && !qrcodeKey && !isGenerating) {
      generateNewQRCode()
    }
  }, [isActive])

  // 渲染加载状态
  if (isGenerating && !qrUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-sm text-muted-foreground">正在生成二维码...</p>
      </div>
    )
  }

  // 渲染生成失败状态
  if (generateError && !qrUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-red-500 text-sm">❌ {generateError}</div>
        <Button onClick={generateNewQRCode} disabled={isGenerating}>
          {isGenerating ? '重新生成中...' : '重新生成'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {/* 二维码显示 */}
      <div className="flex justify-center">
        <QRCodeDisplay qrUrl={qrUrl} status={status} message={message} />
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col items-center gap-3">
        {status === 'expired' && (
          <Button onClick={handleRegenerateQRCode} disabled={isGenerating} className="w-full max-w-xs">
            {isGenerating ? '生成中...' : '重新获取二维码'}
          </Button>
        )}

        {/* 轮询错误提示 */}
        {pollingError && (
          <div className="text-xs text-red-500 text-center">
            轮询出错: {pollingError}
          </div>
        )}

        {/* 过期时间提示 */}
        {status !== 'expired' && status !== 'confirmed' && expireAt && (
          <div className="text-xs text-muted-foreground text-center">
            二维码有效期至 {new Date(expireAt).toLocaleTimeString('zh-CN')}
          </div>
        )}

        {/* 轮询状态指示 */}
        {isPolling && status !== 'confirmed' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>正在轮询状态...</span>
          </div>
        )}
      </div>
    </div>
  )
}

