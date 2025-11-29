import { useUISelection } from '@/store/uiSelection'
import type { VideoItem, AuthorItem } from '@/lib/fake'
import VideoCard from './VideoCard'
import AuthorCard from './AuthorCard'
import { cn } from '@/lib/cn'

export default function CardGrid({ items, type }: { items: Array<VideoItem | AuthorItem>; type: 'video' | 'author' }) {
  const { toggleSelect, selection, setActiveItem, activeItem, selecting } = useUISelection()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => {
        const isActive = !!activeItem && activeItem.type === type && activeItem.id === it.id
        return (
          <div key={it.id} className={cn('relative group')}>
            <input
              type="checkbox"
              className={cn(
                'absolute top-2 left-2 h-4 w-4 z-10 transition-opacity',
                selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              checked={selection.has(it.id)}
              onChange={() => toggleSelect(it.id)}
              aria-label="选择"
            />
            {type === 'video' ? (
              <VideoCard
                item={it as VideoItem}
                isActive={isActive}
                onClick={() => setActiveItem({ type: 'video', id: it.id })}
              />
            ) : (
              <AuthorCard
                item={it as AuthorItem}
                isActive={isActive}
                onClick={() => setActiveItem({ type: 'author', id: it.id })}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
