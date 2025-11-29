import ReactECharts from 'echarts-for-react'
import { genVideoSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function VideoEngagementChart() {
  const data = genVideoSeries(14)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 28, bottom: 40 },
    legend: { top: 0 },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: any) => dayjs(v).format('MM-DD HH:mm') },
    },
    yAxis: { type: 'value' },
    series: [
      { name: '弹幕', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.danmaku]) },
      { name: '评论', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.comment]) },
      { name: '投币', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.coin]) },
      { name: '点赞', type: 'line', showSymbol: false, smooth: true, data: data.map(d => [d.ts, d.like]) },
    ],
  }
  return <ReactECharts theme={isDark ? 'dark' : undefined} option={option as any} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
}
