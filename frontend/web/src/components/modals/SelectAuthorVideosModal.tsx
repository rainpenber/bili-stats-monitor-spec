import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useSelectVideos } from '@/store/selectVideos'

export default function SelectAuthorVideosModal() {
  const { open, authorUid, list, page, pageSize, hasMore, selected, close, toggle, selectTopN, append, reset } = useSelectVideos()
  const [loading, setLoading] = useState(false)

  async function fetchPage(p: number) {
    if (!authorUid) return
    setLoading(true)
    try {
      const resp = await fetch(`/api/v1/authors/${authorUid}/videos?page=${p}&page_size=${pageSize}`)
      const json = await resp.json()
      const { items = [], has_more = false } = json.data || {}
      append(items, has_more)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      reset()
      fetchPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authorUid])

  const onAdd = () => {
    alert(`将添加 ${selected.size} 条视频为监控任务（低保真演示）`)
    close()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="选择该博主的视频（低保真）" description="默认加载前10条，滚动加载更多；可一键选择前5条" />
      <ModalBody>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">UID：{authorUid}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => selectTopN(5)}>一键选择前5条</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-auto pr-1">
          {list.map(v => (
            <label key={v.bv} className="card p-2 flex gap-2 cursor-pointer items-center">
              <input type="checkbox" checked={selected.has(v.bv)} onChange={() => toggle(v.bv)} />
              <img src={v.coverUrl} alt={v.title} className="w-24 h-14 object-cover rounded" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" title={v.title}>{v.title}</div>
                <div className="text-xs text-gray-500">{v.bv}</div>
              </div>
            </label>
          ))}
          {list.length === 0 && !loading && (
            <div className="text-sm text-gray-500">暂无视频</div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center">
          {hasMore && (
            <Button variant="outline" onClick={() => fetchPage(page)} disabled={loading}>{loading ? '加载中...' : '加载更多'}</Button>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={close}>取消</Button>
        <Button onClick={onAdd}>添加为监控任务</Button>
      </ModalFooter>
    </Modal>
  )
}

