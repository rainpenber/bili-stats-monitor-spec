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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  // 使用 ref 存储最新的回调，避免 poll 函数频繁重建
  const onSuccessRef = useRef(onSuccess)
  const onExpiredRef = useRef(onExpired)

  // 更新回调 ref
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onExpiredRef.current = onExpired
  }, [onSuccess, onExpired])

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
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/ff8a6709-c0e0-4c9f-a3a0-04db521a82d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQRCodePolling.ts:68',message:'CONFIRMED branch entered',data:{hasTimer:!!timerRef.current,timerIdBefore:timerRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
          // #endregion
          // 绑定成功 - 立即清理定时器
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/ff8a6709-c0e0-4c9f-a3a0-04db521a82d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQRCodePolling.ts:72',message:'Timer cleared in confirmed',data:{timerAfterClear:timerRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          }
          setIsPolling(false)
          
          if (result.account) {
            setAccount(result.account)
            // 使用 ref 中的最新回调
            onSuccessRef.current?.(result.account)
          }
          break

        case 'expired':
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/ff8a6709-c0e0-4c9f-a3a0-04db521a82d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQRCodePolling.ts:83',message:'EXPIRED branch entered',data:{hasTimer:!!timerRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // 二维码过期 - 立即清理定时器
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          setIsPolling(false)
          // 使用 ref 中的最新回调
          onExpiredRef.current?.()
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
  }, [qrcodeKey, enabled]) // 移除 onSuccess 和 onExpired 依赖

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
    // 设置为已挂载
    isMountedRef.current = true
    
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

