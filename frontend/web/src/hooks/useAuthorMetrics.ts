import { useEffect, useState } from 'react'
import { fetchAuthorMetrics, type AuthorMetricsResponse, type AuthorMetricDataPoint } from '@/lib/api'

// Re-export types for convenience
export type { AuthorMetricDataPoint, AuthorMetricsResponse }

/**
 * useAuthorMetrics Hook
 * 
 * 获取指定作者的粉丝历史数据
 * - 调用GET /api/v1/authors/:uid/metrics
 * - 支持自动重新加载
 * - 提供loading和error状态
 * 
 * @param uid - 作者UID（如果为null则不加载）
 * @param autoRefresh - 自动刷新间隔（毫秒），默认不自动刷新
 */
export function useAuthorMetrics(uid: string | null, autoRefresh?: number) {
  const [data, setData] = useState<AuthorMetricsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载数据的函数
  const loadData = async (authorUid: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await fetchAuthorMetrics(authorUid)
      setData(result)
    } catch (err) {
      console.error('Failed to load author metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load author metrics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和UID变化时重新加载
  useEffect(() => {
    if (!uid) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let isMounted = true

    const load = async () => {
      await loadData(uid)
    }

    load()

    return () => {
      isMounted = false
    }
  }, [uid])

  // 自动刷新
  useEffect(() => {
    if (!uid || !autoRefresh || autoRefresh <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      loadData(uid)
    }, autoRefresh)

    return () => {
      clearInterval(intervalId)
    }
  }, [uid, autoRefresh])

  // 手动刷新
  const refresh = () => {
    if (uid) {
      loadData(uid)
    }
  }

  return {
    data,
    loading,
    error,
    refresh,
  }
}

