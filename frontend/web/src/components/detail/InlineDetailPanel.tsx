import React from 'react'
import { useUISelection } from '@/store/uiSelection'
import { fakeAuthors, fakeVideos } from '@/lib/fake'
import VideoMetricsChart from './VideoMetricsChart'
import VideoEngagementChart from './VideoEngagementChart'
import AuthorFansChart from './AuthorFansChart'

export default function InlineDetailPanel() {
  const { activeItem } = useUISelection()

  if (!activeItem) {
    return (
      <div className="mt-6 p-6 border border-dashed border-gray-300 rounded-md text-gray-500 text-sm">
        选择任意卡片，在此区域展示详情图表。
      </div>
    )
  }

  if (activeItem.type === 'video') {
    const v = fakeVideos.find(v => v.id === activeItem.id)
    if (!v) return null
    return (
      <div className="mt-6 space-y-4">
        <div className="card p-4">
          <div className="flex items-start gap-4">
            <div className="w-48 aspect-video bg-gray-100 rounded overflow-hidden">
              <img src={v.coverUrl} alt={v.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-1" title={v.title}>{v.title}</h3>
              <div className="text-sm text-gray-600">BV：{v.bv}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card p-4">
            <h4 className="font-medium mb-3">播放量 + 在线观看人数</h4>
            <VideoMetricsChart />
          </div>
          <div className="card p-4">
            <h4 className="font-medium mb-3">互动数据（弹幕/评论/投币/点赞）</h4>
            <VideoEngagementChart />
          </div>
        </div>
      </div>
    )
  }

  if (activeItem.type === 'author') {
    const a = fakeAuthors.find(a => a.id === activeItem.id)
    if (!a) return null
    return (
      <div className="mt-6 space-y-4">
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <img src={a.avatarUrl} alt={a.nickname} className="w-20 h-20 rounded-full object-cover" />
            <div>
              <h3 className="text-lg font-medium" title={a.nickname}>{a.nickname}</h3>
              <div className="text-sm text-gray-600">UID：{a.uid}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <h4 className="font-medium mb-3">粉丝数变化（默认缩放近3个月）</h4>
          <AuthorFansChart />
        </div>
      </div>
    )
  }

  return null
}

