import React, { useRef, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import type { VideoItem, AuthorItem } from '@/lib/fake'
import VideoMetricsChart from './VideoMetricsChart'
import VideoEngagementChart from './VideoEngagementChart'
import AuthorFansChart from './AuthorFansChart'
import { Button } from '@/components/ui/Button'

export default function InlineDetailPanel() {
  const { activeItem, activeMeta } = useUISelection()
  // 始终声明，确保 Hook 顺序一致
  const [tab, setTab] = useState<'metrics' | 'engagement'>('metrics')
  const metricsRef = useRef<any>(null)
  const engagementRef = useRef<any>(null)
  const authorRef = useRef<any>(null)

  if (!activeItem) {
    return (
      <div className="mt-6 p-6 border border-dashed border-border rounded-md text-muted-foreground text-sm">
        选择任意卡片，在此区域展示详情图表。
      </div>
    )
  }

  if (activeItem.type === 'video') {
    const v = (activeMeta as VideoItem) || ({} as VideoItem)
    return (
      <div className="mt-6 space-y-3">
        {/* 精简选中卡片头部区域（隐藏封面，仅一行：标题 + BV） */}
        <div className="card p-2">
          <div className="min-w-0 text-sm">
            <div className="truncate" title={v?.title || ''}>
              <span className="font-medium">{v?.title || '视频详情'}</span>
              <span className="text-muted-foreground"> · BV：{v?.bv || '-'}</span>
            </div>
          </div>
        </div>

        {/* Tabs + 复位同一行 */}
        <div className="card p-3">
          <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-2">
            <div className="flex items-center gap-2">
              <button className={`h-8 px-3 rounded-md text-sm ${tab==='metrics' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`} onClick={()=>setTab('metrics')}>播放量 + 在线观看</button>
              <button className={`h-8 px-3 rounded-md text-sm ${tab==='engagement' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`} onClick={()=>setTab('engagement')}>互动数据</button>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const inst = tab === 'metrics' ? metricsRef.current : engagementRef.current
              inst?.dispatchAction?.({ type: 'restore' })
            }}>复位</Button>
          </div>
          <div className="pt-3">
            {tab === 'metrics' ? (
              <div className="w-full"><VideoMetricsChart onReady={(inst)=>{ metricsRef.current = inst }} /></div>
            ) : (
              <div className="w-full"><VideoEngagementChart onReady={(inst)=>{ engagementRef.current = inst }} /></div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeItem.type === 'author') {
    const a = (activeMeta as AuthorItem) || ({} as AuthorItem)
    return (
      <div className="mt-6 space-y-3">
        {/* 精简选中卡片头部区域（隐藏头像，仅一行：昵称 + UID） */}
        <div className="card p-2">
          <div className="min-w-0 text-sm">
            <div className="truncate" title={a?.nickname || ''}>
              <span className="font-medium">{a?.nickname || '博主详情'}</span>
              <span className="text-muted-foreground"> · UID：{a?.uid || '-'}</span>
            </div>
          </div>
        </div>
        <div className="card p-3">
          <h4 className="font-medium mb-2">粉丝数变化（默认缩放近3个月）</h4>
          <AuthorFansChart />
        </div>
      </div>
    )
  }

  return null
}

