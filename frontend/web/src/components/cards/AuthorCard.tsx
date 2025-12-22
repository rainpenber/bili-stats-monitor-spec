import type { AuthorItem } from '@/lib/fake'
import { toWan } from '@/lib/format'
import dayjs from 'dayjs'
import { cn } from '@/lib/cn'
import { Menu } from 'lucide-react'
import { useUISelection } from '@/store/uiSelection'

export default function AuthorCard({ item, onClick, isActive }: { item: AuthorItem; onClick?: () => void; isActive?: boolean }) {
  const { setEditingTask } = useUISelection()

  return (
    <div className={cn('card card-hover cursor-pointer relative', isActive && 'outline-primary')} onClick={onClick}>
      <div className="p-3 flex items-center gap-3">
        <img
          src={item.avatarUrl}
          alt={item.nickname}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium truncate" title={item.nickname}>{item.nickname}</div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{toWan(item.fansCount)}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">
            标签：{item.tags?.join(' / ') || '—'}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground/70">更新于：{dayjs(item.lastCollectedAt).format('YYYY-MM-DD HH:mm')}</div>
        </div>
      </div>
      {/* 右下角菜单图标 */}
      <button
        className="absolute bottom-2 right-2 p-1.5 rounded-md hover:bg-accent text-muted-foreground"
        aria-label="编辑"
        onClick={(e) => { e.stopPropagation(); setEditingTask({ type: 'author', id: item.id }) }}
      >
        <Menu size={16} />
      </button>
    </div>
  )
}
