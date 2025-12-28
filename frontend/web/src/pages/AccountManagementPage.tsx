import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUISelection } from '@/store/uiSelection'
import { useEffect, useState, useRef, useCallback } from 'react'
import { listBilibiliAccounts, fetchDefaultAccount, saveDefaultAccount } from '@/lib/api'
import { AccountList } from '@/components/bilibili/AccountList'
import { AccountBindModal } from '@/components/modals/AccountBindModal'
import type { BilibiliAccount } from '@/types/bilibili'
import { toast } from 'sonner'

/**
 * AccountManagementPage - 账号管理页面
 * 
 * 整合账号管理和全局默认账号设置：
 * - 账号列表（查看、解绑）
 * - 绑定新账号
 * - 全局默认账号设置
 * - 已过期账号警告
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-019至FR-025
 */
export default function AccountManagementPage() {
  const { setAccountBindOpen, accountBindOpen } = useUISelection()
  const [accounts, setAccounts] = useState<BilibiliAccount[]>([])
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accountListRef = useRef<{ reload: () => void } | null>(null)

  // 加载账号列表和默认账号
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [accountsList, defaultAcc] = await Promise.all([
        listBilibiliAccounts(),
        fetchDefaultAccount()
      ])

      setAccounts(accountsList)
      
      // fetchDefaultAccount返回Account对象（有id字段），需要匹配BilibiliAccount的accountId
      // 注意：Account.id 对应 BilibiliAccount.accountId
      let defaultId: string | null = null
      if (defaultAcc && typeof defaultAcc === 'object' && 'id' in defaultAcc) {
        defaultId = defaultAcc.id
      }
      
      // 检查默认账号是否仍然存在（如果默认账号已被解绑，清空设置）
      if (defaultId && !accountsList.some(acc => acc.accountId === defaultId)) {
        defaultId = null
        // 可选：自动清空后端设置
        // await saveDefaultAccount(null)
      }
      
      setDefaultAccountId(defaultId)
    } catch (err) {
      console.error('Failed to load accounts:', err)
      setError(err instanceof Error ? err.message : '加载账号列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadAccounts()
  }, [])

  // 监听 modal 关闭，刷新账号列表
  useEffect(() => {
    if (!accountBindOpen) {
      accountListRef.current?.reload()
      loadAccounts() // 重新加载账号列表和默认账号
    }
  }, [accountBindOpen])

  // 监听账号绑定事件
  useEffect(() => {
    const handleAccountBound = () => {
      loadAccounts()
    }

    window.addEventListener('account:bound', handleAccountBound)
    return () => {
      window.removeEventListener('account:bound', handleAccountBound)
    }
  }, [])

  // 保存默认账号
  const handleSaveDefault = async () => {
    if (!defaultAccountId) {
      toast.error('请先选择一个账号')
      return
    }

    try {
      setSaving(true)
      await saveDefaultAccount(defaultAccountId)
      toast.success('默认账号已保存')
      await loadAccounts() // 重新加载以确认
    } catch (err) {
      console.error('Failed to save default account:', err)
      toast.error(err instanceof Error ? err.message : '保存默认账号失败')
    } finally {
      setSaving(false)
    }
  }

  // 打开绑定对话框
  const handleBindNew = () => {
    setAccountBindOpen(true)
  }

  // 重新绑定账号
  const handleRebind = (account: BilibiliAccount) => {
    setAccountBindOpen(true)
  }

  // 监听账号绑定/解绑事件（重新加载账号列表）
  useEffect(() => {
    const handleAccountBound = () => {
      loadAccounts()
    }

    // 监听account:bound事件（绑定和解绑都会触发重新加载）
    window.addEventListener('account:bound', handleAccountBound)
    return () => {
      window.removeEventListener('account:bound', handleAccountBound)
    }
  }, [loadAccounts]) // 依赖loadAccounts

  // 检查是否有已过期账号
  const hasExpiredAccounts = accounts.some(acc => acc.status === 'expired')

  return (
    <div className="container-page py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账号管理</h1>
        <Button onClick={handleBindNew}>绑定新账号</Button>
      </div>

      {/* 已过期账号警告 */}
      {hasExpiredAccounts && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              <p className="font-medium mb-1">检测到已过期账号</p>
              <p className="text-xs">部分账号的登录凭证已过期，请重新绑定以确保数据抓取正常。</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 账号列表 */}
      <Card>
        <CardHeader>
          <h2 className="font-medium">已绑定账号</h2>
        </CardHeader>
        <CardContent className="p-6">
          <AccountList ref={accountListRef} onBindNew={handleBindNew} onRebind={handleRebind} />
        </CardContent>
      </Card>

      {/* 全局默认账号设置 */}
      <Card>
        <CardHeader>
          <h2 className="font-medium">全局默认账号</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 未设置默认账号的警告 */}
          {!defaultAccountId && !loading && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  <p className="font-medium mb-1">当前未设置全局默认账号</p>
                  <p className="text-xs">仅鉴权内容（如完播率）将暂停抓取，请尽快设置默认账号。</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-destructive">{error}</span>
                <Button variant="ghost" size="sm" onClick={loadAccounts}>重试</Button>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {loading ? (
            <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>
          ) : accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              暂无已绑定账号，请先绑定账号。
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {accounts.map(acc => {
                  const isSelected = defaultAccountId === acc.accountId
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
                        name="defaultAccount"
                        checked={isSelected}
                        onChange={() => setDefaultAccountId(acc.accountId)}
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
                <Button onClick={handleSaveDefault} disabled={!defaultAccountId || saving}>
                  {saving ? '保存中...' : '保存为默认账号'}
                </Button>
                <Button variant="ghost" onClick={loadAccounts} disabled={loading}>
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

      {/* 账号绑定Modal */}
      <AccountBindModal />
    </div>
  )
}

