import { useState, useEffect, useRef, useCallback } from 'react'
import { pollQRCode } from '@/lib/api'
import type { QRCodeStatus, BilibiliAccount } from '@/types/bilibili'

interface UseQRCodePollingOptions {
  qrcodeKey: string | null
  enabled: boolean
  interval?: number // 轮询间隔（毫秒），默认2000ms
  onSuccess?: (account: BilibiliAccount) => void
  onExpired?: () => void
}

interface UseQRCodePollingReturn {
  status: QRCodeStatus
  message: string
  account: BilibiliAccount | null
  isPolling: boolean
  error: string | null
}

/**
 * 二维码轮询自定义Hook
 * 每2秒轮询一次二维码状态，直到确认或过期
 */
export function useQRCodePolling({
  qrcodeKey,
  enabled,
  interval = 2000,
  onSuccess,
  onExpired,
}: UseQRCodePollingOptions): UseQRCodePollingReturn {
  const [status, setStatus] = useState<QRCodeStatus>('pending')
  const [message, setMessage] = useState<string>('等待扫码')
  const [account, setAccount] = useState<BilibiliAccount | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // 轮询函数
  const poll = useCallback(async () => {
    if (!qrcodeKey || !enabled) return

    setIsPolling(true)
    setError(null)

    try {
      const result = await pollQRCode(qrcodeKey)

      // 仅在组件仍挂载时更新状态
      if (!isMountedRef.current) return

      setStatus(result.status)
      setMessage(result.message)

      // 处理不同状态
      switch (result.status) {
        case 'confirmed':
          // 绑定成功
          if (result.account) {
            setAccount(result.account)
            onSuccess?.(result.account)
          }
          setIsPolling(false)
          break

        case 'expired':
          // 二维码过期
          setIsPolling(false)
          onExpired?.()
          break

        case 'scanned':
          // 已扫码，等待确认
          setMessage('已扫码，等待确认')
          break

        case 'pending':
          // 等待扫码
          setMessage('等待扫码')
          break
      }
    } catch (err: any) {
      if (!isMountedRef.current) return

      console.error('QR code polling error:', err)
      setError(err.message || '轮询失败')
      setIsPolling(false)
    }
  }, [qrcodeKey, enabled, onSuccess, onExpired])

  // 启动/停止轮询
  useEffect(() => {
    // 如果未启用或没有qrcodeKey，清理定时器
    if (!enabled || !qrcodeKey) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsPolling(false)
      return
    }

    // 如果已经确认或过期，停止轮询
    if (status === 'confirmed' || status === 'expired') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsPolling(false)
      return
    }

    // 立即执行一次轮询
    poll()

    // 启动定时轮询
    timerRef.current = setInterval(poll, interval)

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, qrcodeKey, status, interval, poll])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    status,
    message,
    account,
    isPolling,
    error,
  }
}

