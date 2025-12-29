import React, { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { genVideoSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function VideoEngagementChart({ onReady }: { onReady?: (inst: any) => void }) {
  const data = genVideoSeries(14)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartRef = useRef<any>(null)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { top: 2 },
    grid: { left: 48, right: 40, top: 28, bottom: 36, containLabel: true },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'slider', xAxisIndex: [0], height: 10, bottom: 0, backgroundColor: 'rgba(148,163,184,0.15)', fillerColor: 'rgba(99,102,241,0.35)', handleStyle: { color: '#94a3b8' } },
      { type: 'inside', yAxisIndex: [0] },
      { type: 'slider', yAxisIndex: [0], right: 12, width: 10, top: 28, bottom: 36, backgroundColor: 'rgba(148,163,184,0.15)', fillerColor: 'rgba(99,102,241,0.35)', handleStyle: { color: '#94a3b8' } },
    ],
    xAxis: {
      type: 'time',
      axisLabel: { hideOverlap: true, margin: 6, formatter: (v: any) => dayjs(v).format('MM-DD HH:mm') },
    },
    yAxis: { type: 'value', nameGap: 12, axisLabel: { margin: 6 } },
    series: [
      { name: '弹幕', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.danmaku]) },
      { name: '评论', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.comment]) },
      { name: '投币', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.coin]) },
      { name: '点赞', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.like]) },
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
