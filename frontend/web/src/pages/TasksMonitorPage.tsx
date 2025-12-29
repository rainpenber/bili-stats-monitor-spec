import { useEffect, useMemo, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import FilterBar from '@/components/toolbar/FilterBar'
import BulkActionsBar from '@/components/toolbar/BulkActionsBar'
import CardGrid from '@/components/cards/CardGrid'
import InlineDetailPanel from '@/components/detail/InlineDetailPanel'
import PaginationBar from '@/components/toolbar/PaginationBar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchTasks, fetchDefaultAccount } from '@/lib/api'
import type { VideoItem, AuthorItem } from '@/lib/fake'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export default function TasksMonitorPage() {
  const { type, keyword, page, pageSize, setAddTaskType } = useUISelection()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Array<VideoItem | AuthorItem>>([])
  const [total, setTotal] = useState(0)
  const [hasDefaultAcc, setHasDefaultAcc] = useState<boolean>(true)

  useEffect(() => {
    async function loadDefault() {
      try {
        const def = await fetchDefaultAccount()
        setHasDefaultAcc(!!def.id)
      } catch {
        // ignore
      }
    }
    loadDefault()
  }, [])

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      try {
        const data = await fetchTasks({ page, page_size: pageSize, keyword, type })
        if (ignore) return
        const mapped = (data.items || []).map((t: any) => {
          if (t.type === 'video') {
            // 支持两种字段名：target_id (snake_case) 或 targetId (camelCase)
            const targetId = t.target_id || t.targetId
            const v: VideoItem = {
              id: t.id,
              type: 'video',
              bv: targetId, // 修复：确保 bv 字段被设置
              title: t.title || `视频 ${targetId}`,
              coverUrl: t.media?.cover_url || 'https://via.placeholder.com/320x180?text=Cover',
              playCount: t.latest_sample?.play ?? 0,
              status: (t.status || 'running') as any,
              tags: t.tags || [],
              lastCollectedAt: t.latest_sample?.last_collected_at || t.updated_at || new Date().toISOString(),
            }
            return v
          } else {
            // 支持两种字段名：target_id (snake_case) 或 targetId (camelCase)
            const targetId = t.target_id || t.targetId
            const a: AuthorItem = {
              id: t.id,
              type: 'author',
              uid: targetId, // 修复：确保 uid 字段被设置
              nickname: t.nickname || `博主 ${targetId}`,
              avatarUrl: t.media?.avatar_url || 'https://via.placeholder.com/120x120?text=Avatar',
              fansCount: t.latest_sample?.fans ?? 0,
              status: (t.status || 'running') as any,
              tags: t.tags || [],
              lastCollectedAt: t.latest_sample?.last_collected_at || t.updated_at || new Date().toISOString(),
            }
            return a
          }
        })
        setItems(mapped)
        setTotal(data.total || 0)
      } catch (e: any) {
        toast.error(e?.message || '加载任务列表失败')
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [type, keyword, page, pageSize])

  const currentPageIds = useMemo(() => items.map(i => i.id), [items])

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">仪表板</h1>
        <Button onClick={() => setAddTaskType(type)}>新增{type === 'video' ? '视频' : '博主'}任务</Button>
      </div>

      {!hasDefaultAcc && (
        <div className="border border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md px-3 py-2 text-sm">
          当前未设置全局默认账号：仅鉴权内容（如完播率）将暂停抓取，请尽快前往 <Link to="/settings" className="underline font-medium">系统设置</Link> 设置默认账号。
        </div>
      )}

      <FilterBar />
      <BulkActionsBar currentPageIds={currentPageIds} />
      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="暂无任务"
          description={`当前没有${type === 'video' ? '视频' : '博主'}监控任务，点击上方按钮创建新任务。`}
          action={
            <Button onClick={() => setAddTaskType(type)}>
              新增{type === 'video' ? '视频' : '博主'}任务
            </Button>
          }
        />
      ) : (
        <CardGrid items={items as any} type={type} />
      )}
      {!loading && total > 0 && <PaginationBar total={total} />}
      <InlineDetailPanel />
    </div>
  )}
