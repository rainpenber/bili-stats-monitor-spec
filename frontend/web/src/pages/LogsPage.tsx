import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { DatePicker } from '@/components/ui/DatePicker'
import { Badge } from '@/components/ui/Badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog'
import { downloadLogs, fetchLogs, LogLevel } from '@/lib/api'
import { toast } from 'sonner'

const ALL_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR']

export default function LogsPage() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set())
  const [sources, setSources] = useState<Set<string>>(new Set())
  const [sourceOptions, setSourceOptions] = useState<string[]>([])
  const [keyword, setKeyword] = useState<string>('')
  const [sort, setSort] = useState<'ts_desc' | 'ts_asc'>('ts_desc')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)

  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [items, setItems] = useState<Array<{ ts: string; level: string; source: string; message: string }>>([])
  const [total, setTotal] = useState(0)

  const query = async (_page = page, _pageSize = pageSize) => {
    setLoading(true)
    try {
      const res = await fetchLogs({
        date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
        date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
        levels: levels.size ? Array.from(levels) : undefined,
        sources: sources.size ? Array.from(sources) : undefined,
        keyword: keyword || undefined,
        sort,
        page: _page,
        page_size: _pageSize,
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
      if ((res.sources || []).length && sourceOptions.length === 0) {
        setSourceOptions(res.sources)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { query(1, pageSize) }, [])

  const toggleLevel = (lv: LogLevel) => {
    setLevels(prev => { const n = new Set(prev); n.has(lv) ? n.delete(lv) : n.add(lv); return n })
  }
  const toggleSource = (s: string) => {
    setSources(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  const onSearch = (e?: React.FormEvent) => { e?.preventDefault(); setPage(1); query(1, pageSize) }
  const handleReset = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setLevels(new Set())
    setSources(new Set())
    setKeyword('')
    setSort('ts_desc')
    setPage(1)
    query(1, pageSize)
  }

  const onDownload = async () => {
    setDownloading(true)
    try {
      const res = await downloadLogs({
        date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
        date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
        levels: levels.size ? Array.from(levels) : undefined,
        sources: sources.size ? Array.from(sources) : undefined,
        keyword: keyword || undefined,
        sort,
      })
      if (res?.url) {
        const a = document.createElement('a')
        a.href = res.url
        a.download = ''
        a.target = '_blank'
        a.click()
        toast.success('日志下载已开始')
      } else {
        toast.error('下载失败：未获取到下载链接')
      }
    } catch (e: any) {
      toast.error(e?.message || '下载失败')
    } finally {
      setDownloading(false)
    }
  }

  const getLevelBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'ERROR':
        return 'destructive'
      case 'WARNING':
        return 'outline'
      case 'INFO':
        return 'default'
      case 'DEBUG':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  return (
    <div className="container-page py-6 space-y-4">
      <h1 className="text-xl font-semibold">系统日志</h1>

      {/* 过滤区 */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <div className="text-sm text-muted-foreground">筛选条件</div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={onSearch} className="space-y-4">
            {/* 第一行：日期和排序 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <div className="text-muted-foreground text-sm">起始日期</div>
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="选择起始日期" />
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-sm">结束日期</div>
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="选择结束日期" />
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-sm">排序</div>
                <select className="h-10 w-full px-3 rounded-md border border-input bg-background text-foreground" value={sort} onChange={e=>setSort(e.target.value as any)}>
                  <option value="ts_desc">时间：新→旧</option>
                  <option value="ts_asc">时间：旧→新</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-sm">关键字</div>
                <Input placeholder="message 包含..." value={keyword} onChange={e=>setKeyword(e.target.value)} />
              </div>
            </div>

            {/* 第二行：等级和来源 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-muted-foreground text-sm">等级</div>
                <div className="flex flex-wrap gap-3">
                  {ALL_LEVELS.map(lv => (
                    <label key={lv} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input className="form-checkbox" type="checkbox" checked={levels.has(lv)} onChange={()=>toggleLevel(lv)} />
                      <span>{lv}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-muted-foreground text-sm">来源</div>
                <div className="flex flex-wrap gap-3">
                  {(sourceOptions.length ? sourceOptions : ['tasks','accounts','collector','scheduler','api','web']).map(s => (
                    <label key={s} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input className="form-checkbox" type="checkbox" checked={sources.has(s)} onChange={()=>toggleSource(s)} />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 第三行：操作按钮 */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Button type="submit" disabled={loading}>{loading ? '查询中...' : '查询'}</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost">重置</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确定重置筛选条件？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将清空所有筛选条件（日期、等级、来源、关键字等），并重新查询日志。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>确定重置</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" onClick={onDownload} disabled={downloading}>
                {downloading ? '下载中...' : '下载当前筛选'}
              </Button>
              <div className="text-sm text-muted-foreground ml-auto">共 {total} 条</div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">时间</th>
                  <th className="text-left px-4 py-2 font-medium">等级</th>
                  <th className="text-left px-4 py-2 font-medium">来源</th>
                  <th className="text-left px-4 py-2 font-medium">消息</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground text-center">加载中...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground text-center">暂无数据</td></tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{new Date(it.ts).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <Badge variant={getLevelBadgeVariant(it.level)} className="text-xs">
                          {it.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{it.source}</td>
                      <td className="px-4 py-2 break-all">{it.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* 分页 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              第 <span className="font-medium text-foreground">{page}</span> / <span className="font-medium text-foreground">{totalPages}</span> 页，共 <span className="font-medium text-foreground">{total}</span> 条
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); query(p, pageSize) }} 
                disabled={page <= 1 || loading}
              >
                上一页
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); query(p, pageSize) }} 
                disabled={page >= totalPages || loading}
              >
                下一页
              </Button>
              <select 
                className="h-9 px-2 rounded-md border border-input bg-background text-sm text-foreground" 
                value={pageSize} 
                onChange={e => { const ps = Number(e.target.value) || 50; setPageSize(ps); setPage(1); query(1, ps) }}
                disabled={loading}
              >
                {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n} 条/页</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
