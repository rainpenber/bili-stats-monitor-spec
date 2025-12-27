import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useUISelection } from '@/store/uiSelection'
import { useEffect, useState } from 'react'
import { fetchDefaultAccount } from '@/lib/api'
import { Link } from 'react-router-dom'
import { AccountList } from '@/components/bilibili/AccountList'
import type { BilibiliAccount } from '@/types/bilibili'

export default function AccountsPage() {
  const { setAccountBindOpen } = useUISelection()
  const [hasDefaultAcc, setHasDefaultAcc] = useState<boolean>(true)
  const [rebindingAccount, setRebindingAccount] = useState<BilibiliAccount | null>(null)

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

  // 打开绑定对话框
  const handleBindNew = () => {
    setRebindingAccount(null)
    setAccountBindOpen(true)
  }

  // 重新绑定账号
  const handleRebind = (account: BilibiliAccount) => {
    setRebindingAccount(account)
    setAccountBindOpen(true)
  }

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">B站账号管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleBindNew}>绑定新账号</Button>
        </div>
      </div>

      {!hasDefaultAcc && (
        <div className="border border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md px-3 py-2 text-sm">
          当前未设置全局默认账号：仅鉴权内容（如完播率）将暂停抓取，请前往 <Link to="/settings" className="underline font-medium">系统设置</Link> 设置默认账号。
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <AccountList onBindNew={handleBindNew} onRebind={handleRebind} />
        </CardContent>
      </Card>

      {/* 重绑提示（如果存在） */}
      {rebindingAccount && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          正在重新绑定账号: {rebindingAccount.nickname}
        </div>
      )}
    </div>
  )
}
