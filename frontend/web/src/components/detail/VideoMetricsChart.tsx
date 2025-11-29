import ReactECharts from 'echarts-for-react'
import { genVideoSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function VideoMetricsChart() {
  const data = genVideoSeries(14)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value: any) => dayjs(value).format('MM-DD HH:mm'),
      },
    },
    yAxis: [
      { type: 'value', name: '播放量(累计)' },
      { type: 'value', name: '在线观看', alignTicks: true },
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
  return <ReactECharts theme={isDark ? 'dark' : undefined} option={option as any} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
}
