import { useMemo } from 'react'
import { useUISelection } from '@/store/uiSelection'
import FilterBar from '@/components/toolbar/FilterBar'
import BulkActionsBar from '@/components/toolbar/BulkActionsBar'
import CardGrid from '@/components/cards/CardGrid'
import InlineDetailPanel from '@/components/detail/InlineDetailPanel'
import { fakeAuthors, fakeVideos, filterByKeyword } from '@/lib/fake'

export default function DashboardPage() {
  const { type, keyword } = useUISelection()

  const videos = useMemo(() => filterByKeyword(fakeVideos, keyword), [keyword])
  const authors = useMemo(() => filterByKeyword(fakeAuthors, keyword), [keyword])

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">仪表板</h1>
      </div>
      <FilterBar />
      <BulkActionsBar currentPageIds={(type === 'video' ? videos : authors).map(i => i.id)} />
      <CardGrid 
        items={type === 'video' ? videos : authors}
        type={type}
      />
      <InlineDetailPanel />
    </div>
  )
}

