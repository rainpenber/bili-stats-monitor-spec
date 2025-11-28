import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'

export default function PaginationBar({ total }: { total: number }) {
  const { page, pageSize, setPage, clearSelection } = useUISelection()
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const go = (p: number) => {
    const np = Math.max(1, Math.min(pages, p))
    if (np !== page) {
      clearSelection()
      setPage(np)
    }
  }

  if (pages <= 1) return null

  const items = [] as JSX.Element[]
  for (let i = 1; i <= pages; i++) {
    items.push(
      <Button key={i} size="sm" variant={i === page ? 'default' : 'outline'} onClick={() => go(i)}>
        {i}
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button size="sm" variant="outline" onClick={() => go(page - 1)}>
        上一页
      </Button>
      {items}
      <Button size="sm" variant="outline" onClick={() => go(page + 1)}>
        下一页
      </Button>
    </div>
  )
}

