import ReactECharts from 'echarts-for-react'
import { genFansSeries } from '@/lib/fake'
import dayjs from 'dayjs'

export default function AuthorFansChart() {
  const data = genFansSeries(180) // 约6个月，便于默认聚焦近3个月
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    dataZoom: [
      { type: 'inside', start: 50, end: 100 }, // 默认显示靠后半段 ~ 近3个月
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
  return <ReactECharts option={option as any} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
}

