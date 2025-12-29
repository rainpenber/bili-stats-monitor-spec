import React, { useRef, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'
import { fetchVideoMetrics, type MetricPoint } from '@/lib/api'
import type { VideoItem } from '@/lib/fake'

export interface VideoMetricsChartProps {
  onReady?: (inst: any) => void
  bv?: string // 可选的BV号，如果不提供则从useUISelection获取
}

export default function VideoMetricsChart({ onReady, bv: bvProp }: VideoMetricsChartProps) {
  const { scheme, activeMeta } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartRef = useRef<any>(null)
  const [data, setData] = useState<MetricPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 优先使用传入的bv，否则从activeMeta获取
  const video = activeMeta as VideoItem | undefined
  // 回退逻辑：如果 bv 不存在，尝试从 title 中提取（如果 title 是 BV 号）
  let bv = bvProp || video?.bv
  if (!bv && video?.title && video.title.startsWith('BV')) {
    bv = video.title
  }

  useEffect(() => {
    if (!bv) {
      setData([])
      return
    }

    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchVideoMetrics(bv)
        if (isMounted) {
          setData(result.series || [])
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load video metrics:', err)
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
  }, [bv])

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 44, top: 28, bottom: 36, containLabel: true },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'slider', xAxisIndex: [0], height: 8, bottom: 0 },
      { type: 'inside', yAxisIndex: [0, 1] },
      { type: 'slider', yAxisIndex: [0], right: 6, width: 8, top: 28, bottom: 36 }
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        hideOverlap: true,
        margin: 6,
        formatter: (value: any) => dayjs(value).format('MM-DD HH:mm'),
      },
    },
    yAxis: [
      { type: 'value', name: '播放量(累计)', nameGap: 12, axisLabel: { margin: 6 } },
      { type: 'value', name: '在线观看', alignTicks: true, nameGap: 12, axisLabel: { margin: 6 } },
    ],
    series: [
      {
        name: '播放量',
        type: 'line',
        showSymbol: false,
        smooth: true,
        yAxisIndex: 0,
        data: data.map((d) => [new Date(d.ts).getTime(), d.play || 0]), // 转换为时间戳
      },
      {
        name: '在线观看',
        type: 'line',
        showSymbol: false,
        smooth: true,
        yAxisIndex: 1,
        data: data.map((d) => [new Date(d.ts).getTime(), d.watching || 0]), // 转换为时间戳
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
