import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'
import { updateStatus } from '@/lib/fake'

export default function BulkActionsBar({ currentPageIds }: { currentPageIds: string[] }) {
  const { selection, selectionMode, clearSelection, selectPage, selectAll, type } = useUISelection()

  const count = selectionMode === 'all' ? '已选择：全量（跨页）' : `已选择：${selection.size} 项`

  const onSelectPage = () => selectPage(currentPageIds)
  const onSelectAll = () => selectAll()
  const onClear = () => clearSelection()

  const doAction = (action: 'enable' | 'disable') => {
    if (selectionMode === 'all') {
      // 低保真阶段：仅提示效果，真实环境将传 filters 给后端
      alert(`已对全量集合执行：${action === 'enable' ? '启用' : '禁用'}（演示）`)
      clearSelection()
      return
    }
    const ids = Array.from(selection)
    if (ids.length === 0) return
    updateStatus(ids, action === 'enable' ? 'running' : 'stopped', type)
    clearSelection()
  }

  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2">
      <div className="text-sm text-gray-700">{count}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onSelectPage}>本页全选</Button>
        <Button variant="outline" onClick={onSelectAll}>全量全选</Button>
        <Button variant="ghost" onClick={onClear}>清除</Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button onClick={() => doAction('enable')}>启用</Button>
        <Button variant="outline" onClick={() => doAction('disable')}>禁用</Button>
      </div>
    </div>
  )
}

