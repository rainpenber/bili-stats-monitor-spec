import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useUISelection } from '@/store/uiSelection'
import { useEffect, useState } from 'react'
import { fetchDefaultAccount } from '@/lib/api'
import { Link } from 'react-router-dom'

export default function AccountsPage() {
  const { setAccountBindOpen } = useUISelection()
  const [hasDefaultAcc, setHasDefaultAcc] = useState<boolean>(true)

  useEffect(() => {
    async function load() {
      try {
        const def = await fetchDefaultAccount()
        setHasDefaultAcc(!!def.id)
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账号管理（低保真）</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAccountBindOpen(true)}>绑定账号</Button>
        </div>
      </div>

      {!hasDefaultAcc && (
        <div className="border border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md px-3 py-2 text-sm">
          当前未设置全局默认账号：仅鉴权内容（如完播率）将暂停抓取，请前往 <Link to="/settings" className="underline font-medium">系统设置</Link> 设置默认账号。
        </div>
      )}

      <Card>
        <CardContent className="p-12 text-center">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">暂无已绑定账号</h3>
            <p className="text-sm text-muted-foreground">当前为低保真阶段占位页面。可通过"绑定账号"按钮打开 Cookie/扫码 绑定Modal。</p>
            <div className="pt-4">
              <Button onClick={() => setAccountBindOpen(true)}>绑定账号</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
