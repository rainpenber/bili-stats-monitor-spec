import React, { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { genFansSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function AuthorFansChart({ onReady }: { onReady?: (inst: any) => void }) {
  const data = genFansSeries(180)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartRef = useRef<any>(null)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 80, top: 36, bottom: 88, containLabel: true },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'slider', xAxisIndex: [0], height: 18, bottom: 12 },
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
        data: data.map(d => [d.ts, d.fans])
      },
    ],
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
