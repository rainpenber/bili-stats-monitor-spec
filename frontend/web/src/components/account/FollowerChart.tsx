import React from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'
import type { AuthorMetricDataPoint } from '@/hooks/useAuthorMetrics'

/**
 * FollowerChart - 粉丝数量变化图表
 * 
 * 显示作者的粉丝数量历史变化趋势
 * - 加载全部数据
 * - 横轴时间缩放到最近30天
 * - 支持缩放和拖拽
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-011
 * 参考: specs/006-navigation-restructure/clarification-report.md Q7
 */

export interface FollowerChartProps {
  data: AuthorMetricDataPoint[]
  loading?: boolean
}

export function FollowerChart({ data, loading }: FollowerChartProps) {
  const { scheme } = useUISelection()
  const isDark = 
    scheme === 'dark' || 
    (scheme === 'system' && 
      typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载图表数据...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">暂无粉丝数据</div>
      </div>
    )
  }

  // 计算dataZoom的起始位置（最近30天）
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  
  // 找到30天前的数据点索引
  let startIndex = 0
  for (let i = data.length - 1; i >= 0; i--) {
    const timestamp = new Date(data[i].collected_at).getTime()
    if (timestamp < thirtyDaysAgo) {
      startIndex = Math.max(0, i)
      break
    }
  }

  const startPercent = data.length > 0 ? (startIndex / data.length) * 100 : 0

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0]
        const date = dayjs(param.value[0]).format('YYYY-MM-DD HH:mm')
        const value = param.value[1].toLocaleString()
        return `${date}<br/>粉丝: ${value}`
      }
    },
    grid: {
      left: 56,
      right: 80,
      top: 36,
      bottom: 88,
      containLabel: true
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0],
        start: startPercent,
        end: 100
      },
      {
        type: 'slider',
        xAxisIndex: [0],
        height: 18,
        bottom: 12,
        start: startPercent,
        end: 100
      },
      {
        type: 'inside',
        yAxisIndex: [0]
      },
      {
        type: 'slider',
        yAxisIndex: [0],
        right: 12,
        width: 14
      }
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        hideOverlap: true,
        formatter: (v: number) => dayjs(v).format('MM-DD')
      }
    },
    yAxis: {
      type: 'value',
      name: '粉丝',
      nameGap: 28,
      axisLabel: {
        formatter: (v: number) => {
          if (v >= 10000) {
            return `${(v / 10000).toFixed(1)}w`
          }
          return v.toString()
        }
      }
    },
    series: [
      {
        name: '粉丝',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: data.map(d => [
          new Date(d.collected_at).getTime(),
          d.follower
        ])
      }
    ]
  }

  return (
    <ReactECharts
      option={option}
      theme={isDark ? 'dark' : undefined}
      style={{ height: '320px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

