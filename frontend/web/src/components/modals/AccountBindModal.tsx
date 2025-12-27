import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal'
import { useUISelection } from '@/store/uiSelection'
import { CookieBindingTab } from '@/components/bilibili/CookieBindingTab'

export default function AccountBindModal() {
  const { accountBindOpen, setAccountBindOpen } = useUISelection()
  const [mode, setMode] = useState<'cookie' | 'qrcode'>('cookie')

  const onClose = () => {
    setAccountBindOpen(false)
    // 重置为Cookie模式
    setMode('cookie')
  }

  const handleBindSuccess = () => {
    onClose()
  }

  return (
    <Modal open={accountBindOpen} onClose={onClose}>
      <ModalHeader
        title="绑定B站账号"
        description="支持Cookie绑定或扫码登录绑定。绑定后可用于创建监控任务。"
      />
      <ModalBody>
        <div className="space-y-4 text-sm">
          {/* 模式切换 */}
          <div className="flex items-center gap-4 border-b border-border pb-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bindmode"
                checked={mode === 'cookie'}
                onChange={() => setMode('cookie')}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">Cookie 绑定</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bindmode"
                checked={mode === 'qrcode'}
                onChange={() => setMode('qrcode')}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">扫码登录</span>
            </label>
          </div>

          {/* 内容区域 */}
          {mode === 'cookie' ? (
            <CookieBindingTab onSuccess={handleBindSuccess} />
          ) : (
            <div className="space-y-3 py-8 text-center text-muted-foreground">
              <div className="text-lg">🚧 扫码登录功能开发中...</div>
              <div className="text-sm">
                此功能将在 User Story 2 中实现，敬请期待！
              </div>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}

