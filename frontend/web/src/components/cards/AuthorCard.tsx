import type { AuthorItem } from '@/lib/fake'
import { toWan } from '@/lib/format'
import dayjs from 'dayjs'

export default function AuthorCard({ item, onClick }: { item: AuthorItem; onClick?: () => void }) {
  return (
    <div className="card card-hover cursor-pointer" onClick={onClick}>
      <div className="p-3 flex items-center gap-3">
        <img
          src={item.avatarUrl}
          alt={item.nickname}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium truncate" title={item.nickname}>{item.nickname}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap">粉丝 {toWan(item.fansCount)}</div>
          </div>
          <div className="mt-1 text-xs text-gray-600 truncate">
            标签：{item.tags?.join(' / ') || '—'}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">更新于：{dayjs(item.lastCollectedAt).format('YYYY-MM-DD HH:mm')}</div>
        </div>
      </div>
    </div>
  )
}
