import type { AuthorItem } from '@/lib/fake'

export default function AuthorCard({ item, onClick }: { item: AuthorItem; onClick?: () => void }) {
  return (
    <div className="card card-hover overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="bg-gray-100 flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
        <img src={item.avatarUrl} alt={item.nickname} className="w-24 h-24 rounded-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium" title={item.nickname}>{item.nickname}</div>
        <div className="text-xs text-gray-600">粉丝：{item.fansCount}</div>
      </div>
    </div>
  )
}

