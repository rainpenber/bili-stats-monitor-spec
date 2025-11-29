import { useMemo } from 'react'
import { useUISelection } from '@/store/uiSelection'
import FilterBar from '@/components/toolbar/FilterBar'
import BulkActionsBar from '@/components/toolbar/BulkActionsBar'
import CardGrid from '@/components/cards/CardGrid'
import InlineDetailPanel from '@/components/detail/InlineDetailPanel'
import PaginationBar from '@/components/toolbar/PaginationBar'
import { fakeAuthors, fakeVideos, filterByKeyword } from '@/lib/fake'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const { type, keyword, page, pageSize, setAddTaskType } = useUISelection()

  const listAll = useMemo(() => (
    type === 'video' ? filterByKeyword(fakeVideos, keyword) : filterByKeyword(fakeAuthors, keyword)
  ), [type, keyword])

  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = listAll.slice(start, end)

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">仪表板</h1>
        <Button onClick={() => setAddTaskType(type)}>新增{type === 'video' ? '视频' : '博主'}任务</Button>
      </div>
      <FilterBar />
      <BulkActionsBar currentPageIds={pageItems.map(i => i.id)} />
      <CardGrid items={pageItems as any} type={type} />
      <PaginationBar total={listAll.length} />
      <InlineDetailPanel />
    </div>
  )
}
