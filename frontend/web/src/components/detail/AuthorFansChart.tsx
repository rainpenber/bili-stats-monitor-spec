import React, { useRef, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'
import { fetchAuthorMetrics, type AuthorMetricDataPoint } from '@/lib/api'
import type { AuthorItem } from '@/lib/fake'

export interface AuthorFansChartProps {
  onReady?: (inst: any) => void
  uid?: string // 可选的UID，如果不提供则从useUISelection获取
}

export default function AuthorFansChart({ onReady, uid: uidProp }: AuthorFansChartProps) {
  const { scheme, activeMeta } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartRef = useRef<any>(null)
  const [data, setData] = useState<AuthorMetricDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 优先使用传入的uid，否则从activeMeta获取
  const author = activeMeta as AuthorItem | undefined
  const uid = uidProp || author?.uid

  useEffect(() => {
    if (!uid) {
      setData([])
      return
    }

    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchAuthorMetrics(uid)
        if (isMounted) {
          setData(result.metrics || [])
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load author metrics:', err)
          setError(err instanceof Error ? err.message : 'Failed to load data')
          setData([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [uid])

  // 计算默认缩放范围（近3个月）
  const getDefaultZoomRange = () => {
    if (data.length === 0) return { start: 0, end: 100 }
    
    const now = Date.now()
    const threeMonthsAgo = now - 90 * 24 * 3600 * 1000
    
    // 找到第一个在3个月内的数据点索引（从后往前找，因为数据是按时间升序的）
    let startIdx = 0
    for (let i = data.length - 1; i >= 0; i--) {
      const ts = new Date(data[i].collected_at).getTime()
      if (ts < threeMonthsAgo) {
        startIdx = Math.max(0, i + 1) // 从下一个点开始
        break
      }
    }
    
    // 如果所有数据都在3个月内，则显示全部
    if (startIdx === 0 && data.length > 0) {
      const firstTs = new Date(data[0].collected_at).getTime()
      if (firstTs >= threeMonthsAgo) {
        return { start: 0, end: 100 }
      }
    }
    
    // 计算百分比范围
    const startPercent = data.length > 0 ? (startIdx / data.length) * 100 : 0
    const endPercent = 100
    
    return { start: Math.max(0, startPercent - 2), end: endPercent } // 留一点边距
  }

  const { start: zoomStart, end: zoomEnd } = data.length > 0 ? getDefaultZoomRange() : { start: 0, end: 100 }

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 80, top: 36, bottom: 88, containLabel: true },
    dataZoom: [
      { 
        type: 'inside', 
        xAxisIndex: [0],
      },
      { 
        type: 'slider', 
        xAxisIndex: [0], 
        height: 18, 
        bottom: 12,
        start: zoomStart,
        end: zoomEnd,
      },
      { type: 'inside', yAxisIndex: [0] },
      { type: 'slider', yAxisIndex: [0], right: 12, width: 14 },
    ],
    xAxis: {
      type: 'time',
      axisLabel: { hideOverlap: true, formatter: (v: any) => dayjs(v).format('MM-DD') },
    },
    yAxis: { type: 'value', name: '粉丝', nameGap: 28 },
    series: [
      {
        name: '粉丝',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: data.map(d => [new Date(d.collected_at).getTime(), d.follower]) // 转换为时间戳
      },
    ],
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-destructive">{error}</div>
  }

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">暂无数据</div>
  }

  return (
    <ReactECharts
      ref={chartRef}
      onChartReady={(inst) => onReady?.(inst)}
      theme={isDark ? 'dark' : undefined}
      option={option as any}
      style={{ height: 360 }}
      notMerge={true}
      lazyUpdate={true}
    />
  )
}
