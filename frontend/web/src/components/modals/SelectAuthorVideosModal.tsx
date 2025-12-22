import { useEffect, useMemo, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSelectVideos } from '@/store/selectVideos'
import { toast } from 'sonner'
import { http } from '@/lib/http'

export default function SelectAuthorVideosModal() {
  const { open, authorUid, list, page, pageSize, hasMore, selected, close, toggle, selectTopN, append, reset, setSelected } = useSelectVideos()
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchPage(p: number) {
    if (!authorUid) return
    setLoading(true)
    try {
      const data = await http.get<{ items: any[]; has_more: boolean }>(`/api/v1/authors/${authorUid}/videos?page=${p}&page_size=${pageSize}`)
      const { items = [], has_more = false } = data || {}
      append(items, has_more)
    } catch (e: any) {
      toast.error(e?.message || '加载视频列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      reset()
      setQuery('')
      fetchPage(1)
    } else {
      // 关闭时清理状态
      setQuery('')
      setLoading(false)
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authorUid])

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase()
    if (!kw) return list
    return list.filter(v =>
      (v.title || '').toLowerCase().includes(kw) ||
      (v.bv || '').toLowerCase().includes(kw) ||
      (v as any).desc?.toLowerCase?.().includes(kw)
    )
  }, [list, query])

  const onAdd = async () => {
    try {
      setSubmitting(true)
      const ids = Array.from(selected)
      if (ids.length === 0) {
        toast.error('请选择至少一个视频')
        return
      }
      let success = 0, fail = 0
      for (const bv of ids) {
        const meta = list.find(v => v.bv === bv)
        try {
          await http.post('/api/v1/tasks', { type: 'video', target_id: bv, title: meta?.title || '', strategy: { mode: 'smart' }, tags: [], deadline: '' })
          success++
        } catch {
          fail++
        }
      }
      if (fail === 0) {
        toast.success(`批量创建完成：成功 ${success} 个`)
      } else {
        toast.warning(`批量创建完成：成功 ${success} 个，失败 ${fail} 个`)
      }
      close()
    } catch (e: any) {
      toast.error(e?.message || '批量创建失败（低保真）')
    } finally {
      setSubmitting(false)
    }
  }

  const selectAll = () => {
    const ids = filtered.map(v => v.bv)
    setSelected(ids)
  }

  const clearAll = () => {
    setSelected([])
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="选择该博主的视频（低保真）" description="默认加载前10条，滚动加载更多；可搜索/多选/一键选择前5条" />
      <ModalBody>
        <div className="flex flex-col gap-3 mb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">UID：{authorUid}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => selectTopN(5)}>一键选择前5条</Button>
              <Button variant="outline" onClick={selectAll}>全选</Button>
              <Button variant="ghost" onClick={clearAll}>清空选择</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索标题 / BV / 简介"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
            <div className="text-xs text-muted-foreground whitespace-nowrap">共 {filtered.length} 条；已选 {selected.size} 条</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-auto pr-1">
          {filtered.map(v => (
            <label key={v.bv} className="card p-2 flex gap-2 cursor-pointer items-center">
              <input type="checkbox" checked={selected.has(v.bv)} onChange={() => toggle(v.bv)} />
              <img src={v.coverUrl} alt={v.title} className="w-24 h-14 object-cover rounded" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" title={v.title}>{v.title}</div>
                <div className="text-xs text-gray-500 truncate">{v.bv}</div>
              </div>
            </label>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-sm text-gray-500">无匹配视频</div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center">
          {hasMore && (
            <Button variant="outline" onClick={() => fetchPage(page)} disabled={loading}>{loading ? '加载中...' : '加载更多'}</Button>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={close} disabled={submitting}>取消</Button>
        <Button onClick={onAdd} disabled={submitting}>{submitting ? '创建中...' : '添加为监控任务'}</Button>
      </ModalFooter>
    </Modal>
  )
}
