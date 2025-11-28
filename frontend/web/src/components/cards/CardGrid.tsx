import { useUISelection } from '@/store/uiSelection'
import type { VideoItem, AuthorItem } from '@/lib/fake'
import VideoCard from './VideoCard'
import AuthorCard from './AuthorCard'

export default function CardGrid({ items, type }: { items: Array<VideoItem | AuthorItem>; type: 'video' | 'author' }) {
  const { toggleSelect, selection, setActiveItem } = useUISelection()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((it) => (
        <div key={it.id} className="relative">
          <input
            type="checkbox"
            className="absolute top-2 left-2 h-4 w-4 z-10"
            checked={selection.has(it.id)}
            onChange={() => toggleSelect(it.id)}
            aria-label="选择"
          />
          {type === 'video' ? (
            <VideoCard
              item={it as VideoItem}
              onClick={() => setActiveItem({ type: 'video', id: it.id })}
            />
          ) : (
            <AuthorCard
              item={it as AuthorItem}
              onClick={() => setActiveItem({ type: 'author', id: it.id })}
            />
          )}
        </div>
      ))}
    </div>
  )
}

