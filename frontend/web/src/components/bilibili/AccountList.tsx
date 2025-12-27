import { useEffect, useState } from 'react'
import { AccountListItem } from './AccountListItem'
import { Button } from '@/components/ui/Button'
import { listBilibiliAccounts, unbindBilibiliAccount } from '@/lib/api'
import { toast } from 'sonner'
import type { BilibiliAccount } from '@/types/bilibili'

interface AccountListProps {
  onBindNew: () => void
  onRebind: (account: BilibiliAccount) => void
}

/**
 * B站账号列表组件
 * 显示所有已绑定账号，支持解绑和重绑操作
 */
export function AccountList({ onBindNew, onRebind }: AccountListProps) {
  const [accounts, setAccounts] = useState<BilibiliAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unbindingAccountId, setUnbindingAccountId] = useState<string | null>(null)

  // 加载账号列表
  const loadAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await listBilibiliAccounts()
      setAccounts(result)
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      const errorMessage = err.message || '加载账号列表失败'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 解绑账号
  const handleUnbind = async (accountId: string) => {
    // 显示确认对话框
    if (!window.confirm('确定要解绑此账号吗？解绑后，相关的监控任务将无法继续运行。')) {
      return
    }

    setUnbindingAccountId(accountId)

    try {
      await unbindBilibiliAccount(accountId)
      toast.success('账号解绑成功')
      // 从列表中移除
      setAccounts(prev => prev.filter(acc => acc.accountId !== accountId))
    } catch (err: any) {
      console.error('Failed to unbind account:', err)
      const errorMessage = err.message || '解绑失败'
      toast.error(errorMessage)
    } finally {
      setUnbindingAccountId(null)
    }
  }

  // 初始加载
  useEffect(() => {
    loadAccounts()
  }, [])

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-red-500">❌ {error}</div>
        <Button onClick={loadAccounts}>重试</Button>
      </div>
    )
  }

  // 空状态
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-lg">
        <div className="text-6xl mb-4">🔗</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          还没有绑定B站账号
        </h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          绑定B站账号后，您就可以创建视频监控任务，追踪数据变化并接收通知。
        </p>
        <Button onClick={onBindNew} size="lg">
          立即绑定账号
        </Button>
      </div>
    )
  }

  // 账号列表
  return (
    <div className="space-y-4">
      {/* 列表头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          共 {accounts.length} 个账号
        </div>
        <Button onClick={onBindNew} variant="outline">
          + 绑定新账号
        </Button>
      </div>

      {/* 账号列表 */}
      <div className="space-y-3">
        {accounts.map(account => (
          <AccountListItem
            key={account.accountId}
            account={account}
            onUnbind={handleUnbind}
            onRebind={onRebind}
          />
        ))}
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={loadAccounts} className="text-sm">
          🔄 刷新列表
        </Button>
      </div>
    </div>
  )
}

