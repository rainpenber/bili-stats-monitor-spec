import { toWan } from '@/lib/format'
import type { VideoItem } from '@/lib/fake'

export default function VideoCard({ item, onClick }: { item: VideoItem; onClick?: () => void }) {
  return (
    <div className="card card-hover overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="aspect-video bg-gray-100">
        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium line-clamp-2" title={item.title}>{item.title}</div>
        <div className="text-xs text-gray-600">播放量：{toWan(item.playCount)}</div>
      </div>
    </div>
  )
}

