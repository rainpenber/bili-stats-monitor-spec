import { useEffect, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchAccounts, fetchDefaultAccount, saveDefaultAccount } from '@/lib/api'
import { toast } from 'sonner'
import { http } from '@/lib/http'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  const { theme, setTheme, scheme, setScheme } = useUISelection()
  const presets: Array<{ key: typeof theme; label: string; color: string }> = [
    { key: 'default', label: '默认', color: 'bg-gray-900 dark:bg-gray-100' },
    { key: 'green', label: '绿色', color: 'bg-emerald-500' },
    { key: 'blue', label: '蓝色', color: 'bg-blue-500' },
    { key: 'purple', label: '紫色', color: 'bg-violet-500' },
    { key: 'orange', label: '橙色', color: 'bg-orange-500' },
  ]

  // 全局默认账号（系统级）
  const [accounts, setAccounts] = useState<any[]>([])
  const [defaultAcc, setDefaultAcc] = useState<string>('')
  const [loadingAcc, setLoadingAcc] = useState(false)
  const [savingAcc, setSavingAcc] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [hasDefaultAcc, setHasDefaultAcc] = useState<boolean>(false)

  // crash 演示
  const [crash, setCrash] = useState(false)
  if (crash) {
    throw new Error('演示用：手动触发的渲染期异常')
  }

  async function loadAccounts() {
    setLoadingAcc(true)
    setErrorMsg('')
    try {
      const [list, def] = await Promise.all([fetchAccounts(1, 100), fetchDefaultAccount()])
      setAccounts(list.items || [])
      setDefaultAcc(def.id || '')
      setHasDefaultAcc(!!def.id)
    } catch (e: any) {
      setAccounts([])
      setErrorMsg(e?.message || '加载账号信息失败')
      toast.error(e?.message || '加载账号信息失败')
    } finally {
      setLoadingAcc(false)
    }
  }

  async function onSaveDefault() {
    try {
      setSavingAcc(true)
      setErrorMsg('')
      await saveDefaultAccount(defaultAcc)
      setHasDefaultAcc(true)
      toast.success('默认账号已保存')
      // 重新加载以获取最新状态
      await loadAccounts()
    } catch (e: any) {
      setErrorMsg(e?.message || '保存失败')
      toast.error(e?.message || '保存失败')
    } finally {
      setSavingAcc(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // 演示：Toast 与 HTTP SDK
  const demoToast = () => {
    toast.info('这是一条 Info 提示')
    setTimeout(()=>toast.success('保存成功（演示）'), 400)
    setTimeout(()=>toast.error('操作失败：演示错误'), 800)
  }
  const demoOk = async () => {
    try { await http.get('/api/v1/logs'); toast.success('GET 成功：/api/v1/logs') } catch (e:any) { toast.error(e?.message || '请求失败') }
  }
  const demo404 = async () => {
    try { await http.get('/api/not-exist'); } catch (e:any) { toast.error(`404 演示：${e?.message||'错误'}`) }
  }
  const demoTimeout = async () => {
    try { await http.get('/api/v1/logs', { timeoutMs: 1 }); } catch (e:any) { toast.error(`超时演示：${e?.code || e?.message}`) }
  }

  return (
    <div className="container-page py-6 space-y-6">
      <h1 className="text-xl font-semibold">系统设置（低保真）</h1>

      <section className="card p-4">
        <h2 className="font-medium mb-3">主题色</h2>
        <div className="flex items-center gap-3 mb-3">
          {presets.map(p => (
            <button
              key={p.key}
              className={`relative h-9 px-3 rounded-md border ${theme === p.key ? 'border-primary' : 'border-border'} flex items-center gap-2`}
              onClick={() => setTheme(p.key)}
            >
              <span className={`inline-block w-3 h-3 rounded-full ${p.color}`} />
              <span className="text-sm">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant={scheme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('system')}>跟随系统</Button>
          <Button variant={scheme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('light')}>浅色</Button>
          <Button variant={scheme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('dark')}>深色</Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <h2 className="font-medium">全局默认账号</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 未设置默认账号的警告 */}
          {!hasDefaultAcc && !loadingAcc && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  <p className="font-medium mb-1">当前未设置全局默认账号</p>
                  <p className="text-xs">仅鉴权内容（如完播率）将暂停抓取，请尽快设置默认账号。</p>
                  <Link to="/accounts" className="underline font-medium mt-1 inline-block">前往账号管理</Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 错误提示 */}
          {errorMsg && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-destructive">{errorMsg}</span>
                <Button variant="ghost" size="sm" onClick={loadAccounts}>重试</Button>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {loadingAcc ? (
            <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>
          ) : accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              暂无已绑定账号，请先前往 <Link to="/accounts" className="underline font-medium">账号管理</Link> 绑定。
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {accounts.map(acc => {
                  const isSelected = defaultAcc === acc.id
                  const isExpired = acc.status === 'expired'
                  return (
                    <label
                      key={acc.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultAcc"
                        checked={isSelected}
                        onChange={() => setDefaultAcc(acc.id)}
                        className="form-radio"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{acc.nickname}</span>
                          <span className="text-sm text-muted-foreground ml-2">（UID: {acc.uid}）</span>
                        </div>
                        <Badge
                          variant={isExpired ? 'destructive' : 'default'}
                          className="ml-2"
                        >
                          {isExpired ? '已过期' : '有效'}
                        </Badge>
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={onSaveDefault} disabled={!defaultAcc || savingAcc}>
                  {savingAcc ? '保存中...' : '保存为默认账号'}
                </Button>
                <Button variant="ghost" onClick={loadAccounts} disabled={loadingAcc}>
                  刷新
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            说明：仅允许选择已绑定账号作为全局默认账号；当未设置默认账号时，仅鉴权内容的抓取将暂停。
          </div>
        </CardContent>
      </Card>

      {/* 开发演示（本地调试用） */}
      <section className="card p-4">
        <h2 className="font-medium mb-3">开发演示</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={demoToast}>触发 Toast 演示</Button>
          <Button variant="outline" onClick={demoOk}>发起成功请求</Button>
          <Button variant="outline" onClick={demo404}>发起 404 请求</Button>
          <Button variant="outline" onClick={demoTimeout}>发起 超时 请求</Button>
          <Button variant="destructive" onClick={()=>setCrash(true)}>触发页面崩溃（ErrorBoundary 演示）</Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">也可在控制台执行：__demo_toast(), __http_get(url), __http_post(url, body)</div>
      </section>
    </div>
  )
}
