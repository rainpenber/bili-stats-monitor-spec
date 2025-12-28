import { useEffect, useState } from 'react'

/**
 * 作者粉丝数据点
 */
export interface AuthorMetricDataPoint {
  collected_at: string // ISO 8601 timestamp
  follower: number
}

/**
 * 作者粉丝历史响应
 */
export interface AuthorMetricsResponse {
  uid: string
  metrics: AuthorMetricDataPoint[]
}

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

      const response = await fetch(`/api/v1/authors/${authorUid}/metrics`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.code !== 200) {
        throw new Error(result.message || 'Failed to fetch author metrics')
      }

      setData(result.data)
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

