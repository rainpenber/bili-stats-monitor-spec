import React, { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { genVideoSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function VideoMetricsChart({ onReady }: { onReady?: (inst: any) => void }) {
  const data = genVideoSeries(14)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartRef = useRef<any>(null)
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
        data: data.map((d) => [d.ts, d.play]),
      },
      {
        name: '在线观看',
        type: 'line',
        showSymbol: false,
        smooth: true,
        yAxisIndex: 1,
        data: data.map((d) => [d.ts, d.watching]),
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
