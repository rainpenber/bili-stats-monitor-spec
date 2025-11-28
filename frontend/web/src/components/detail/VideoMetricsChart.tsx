import ReactECharts from 'echarts-for-react'
import { genVideoSeries } from '@/lib/fake'
import dayjs from 'dayjs'

export default function VideoMetricsChart() {
  const data = genVideoSeries(14)
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
  return <ReactECharts option={option as any} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
}

