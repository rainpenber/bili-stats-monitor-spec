import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { BilibiliAccount } from '@/types/bilibili'

/**
 * AccountSwitchModal - 账号切换Modal
 * 
 * 显示所有已绑定账号的列表，允许用户切换到不同账号
 * - 列表形式展示所有账号
 * - 高亮当前选中账号
 * - 点击账号即可切换
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-006
 */

export interface AccountSwitchModalProps {
  open: boolean
  onClose: () => void
  accounts: BilibiliAccount[]
  currentAccountId: string | null
  onSelect: (accountId: string) => void
}

export function AccountSwitchModal({
  open,
  onClose,
  accounts,
  currentAccountId,
  onSelect
}: AccountSwitchModalProps) {
  const handleSelect = (accountId: string) => {
    const selectedAccount = accounts.find(acc => acc.id === accountId)
    onSelect(accountId)
    onClose()
    if (selectedAccount) {
      toast.success(`已切换到账号：${selectedAccount.nickname}`)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="切换账号" onClose={onClose} />
      <ModalBody>
        <div className="space-y-2">
          {accounts.map(account => {
            const isSelected = account.id === currentAccountId
            
            return (
              <button
                key={account.id}
                onClick={() => handleSelect(account.id)}
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{account.nickname}</div>
                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      UID: {account.uid}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </div>
      </ModalBody>
    </Modal>
  )
}

