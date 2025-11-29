import ReactECharts from 'echarts-for-react'
import { genFansSeries } from '@/lib/fake'
import dayjs from 'dayjs'
import { useUISelection } from '@/store/uiSelection'

export default function AuthorFansChart() {
  const data = genFansSeries(180)
  const { scheme } = useUISelection()
  const isDark = scheme === 'dark' || (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    dataZoom: [
      { type: 'inside', start: 50, end: 100 },
      { type: 'slider', start: 50, end: 100 }
    ],
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: any) => dayjs(v).format('MM-DD') },
    },
    yAxis: { type: 'value' },
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
  return <ReactECharts theme={isDark ? 'dark' : undefined} option={option as any} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
}
