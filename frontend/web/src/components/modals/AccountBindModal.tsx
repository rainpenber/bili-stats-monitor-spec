import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal'
import { useUISelection } from '@/store/uiSelection'
import { CookieBindingTab } from '@/components/bilibili/CookieBindingTab'
import { QRCodeBindingTab } from '@/components/bilibili/QRCodeBindingTab'

export default function AccountBindModal() {
  const { accountBindOpen, setAccountBindOpen } = useUISelection()
  const [mode, setMode] = useState<'cookie' | 'qrcode'>('cookie')

  const onClose = () => {
    setAccountBindOpen(false)
    // 重置为Cookie模式
    setMode('cookie')
  }

  const handleBindSuccess = () => {
    // 触发自定义事件，通知其他组件账号已绑定
    window.dispatchEvent(new CustomEvent('account:bound'))
    onClose()
  }

  // 切换模式时的处理（确保轮询停止）
  const handleModeChange = (newMode: 'cookie' | 'qrcode') => {
    setMode(newMode)
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
                onChange={() => handleModeChange('cookie')}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">Cookie 绑定</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bindmode"
                checked={mode === 'qrcode'}
                onChange={() => handleModeChange('qrcode')}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">扫码登录</span>
            </label>
          </div>

          {/* 内容区域 */}
          {mode === 'cookie' ? (
            <CookieBindingTab onSuccess={handleBindSuccess} />
          ) : (
            <QRCodeBindingTab isActive={mode === 'qrcode'} onSuccess={handleBindSuccess} />
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}

