import { toWan } from '@/lib/format'
import type { VideoItem } from '@/lib/fake'
import { cn } from '@/lib/cn'
import { Menu } from 'lucide-react'
import { useUISelection } from '@/store/uiSelection'

export default function VideoCard({ item, onClick, isActive }: { item: VideoItem; onClick?: () => void; isActive?: boolean }) {
  const { setEditingTask } = useUISelection()

  return (
    <div className={cn('card card-hover overflow-hidden cursor-pointer relative', isActive && 'outline-primary')} onClick={onClick}>
      <div className="aspect-video bg-muted">
        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium line-clamp-2" title={item.title}>{item.title}</div>
        <div className="text-xs text-muted-foreground">{toWan(item.playCount)}</div>
      </div>
      {/* 右下角菜单图标 */}
      <button
        className="absolute bottom-2 right-2 p-1.5 rounded-md hover:bg-accent text-muted-foreground"
        aria-label="编辑"
        onClick={(e) => { e.stopPropagation(); setEditingTask({ type: 'video', id: item.id }) }}
      >
        <Menu size={16} />
      </button>
    </div>
  )
}
