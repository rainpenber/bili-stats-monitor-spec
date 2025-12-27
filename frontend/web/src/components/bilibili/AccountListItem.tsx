import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { BilibiliAccount } from '@/types/bilibili'

interface AccountListItemProps {
  account: BilibiliAccount
  onUnbind: (accountId: string) => void
  onRebind: (account: BilibiliAccount) => void
}

/**
 * 单个B站账号项组件
 * 显示账号信息、状态标签和操作按钮
 */
export function AccountListItem({ account, onUnbind, onRebind }: AccountListItemProps) {
  const [isUnbinding, setIsUnbinding] = useState(false)

  // 状态标签样式
  const statusStyles = {
    valid: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: '有效',
      emoji: '✅',
    },
    expired: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: '已过期',
      emoji: '⚠️',
    },
  }

  const style = statusStyles[account.status]

  // 绑定方式显示
  const bindMethodLabel = account.bindMethod === 'cookie' ? 'Cookie绑定' : '扫码绑定'

  // 格式化绑定时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUnbind = async () => {
    setIsUnbinding(true)
    try {
      await onUnbind(account.accountId)
    } finally {
      setIsUnbinding(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
      {/* 左侧：账号信息 */}
      <div className="flex items-center gap-4 flex-1">
        {/* 头像占位 */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
          {account.nickname?.[0] || 'B'}
        </div>

        {/* 信息列 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{account.nickname || '未知用户'}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
              {style.emoji} {style.label}
            </span>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <div>UID: {account.uid}</div>
            <div className="flex items-center gap-3">
              <span>绑定方式: {bindMethodLabel}</span>
              <span>绑定时间: {formatDate(account.boundAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {account.status === 'expired' && (
          <Button
            variant="outline"
            onClick={() => onRebind(account)}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            重新绑定
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleUnbind}
          disabled={isUnbinding}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          {isUnbinding ? '解绑中...' : '解绑'}
        </Button>
      </div>
    </div>
  )
}

