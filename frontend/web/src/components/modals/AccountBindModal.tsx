import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUISelection } from '@/store/uiSelection'
import { toast } from 'sonner'

export default function AccountBindModal() {
  const { accountBindOpen, setAccountBindOpen } = useUISelection()
  const [mode, setMode] = useState<'cookie' | 'qrcode'>('cookie')
  const [cookie, setCookie] = useState('')
  const [qrUrl, setQrUrl] = useState('https://via.placeholder.com/240x240?text=Scan+Me')
  const [qrStatus, setQrStatus] = useState<'pending' | 'scanned' | 'confirmed' | 'expired'>('pending')

  const onClose = () => {
    setAccountBindOpen(false)
    // 清理表单状态
    setMode('cookie')
    setCookie('')
    setQrUrl('https://via.placeholder.com/240x240?text=Scan+Me')
    setQrStatus('pending')
  }

  return (
    <Modal open={accountBindOpen} onClose={onClose}>
      <ModalHeader title="绑定B站账号（低保真）" description="支持Cookie绑定或扫码登录绑定。当前为占位交互，不调用真实接口。" />
      <ModalBody>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="bindmode" checked={mode==='cookie'} onChange={()=>setMode('cookie')} />
              Cookie 绑定
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="bindmode" checked={mode==='qrcode'} onChange={()=>setMode('qrcode')} />
              扫码登录
            </label>
          </div>

          {mode === 'cookie' ? (
            <div className="space-y-2">
              <div className="text-muted-foreground">请输入包含 SESSDATA 的 Cookie</div>
              <textarea
                className="w-full h-28 p-3 border border-input rounded-md text-xs bg-background"
                placeholder="SESSDATA=xxxx; bili_jct=...; ..."
                value={cookie}
                onChange={(e)=>setCookie(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">提示：保存前会进行基本校验（低保真不实际校验）。</div>
            </div>
          ):(
            <div className="space-y-3">
              <div className="text-muted-foreground">请使用B站App扫码登录</div>
              <div className="flex items-center gap-4">
                <img src={qrUrl} alt="QR" className="w-40 h-40 rounded-md border border-border" />
                <div className="text-sm text-foreground space-y-2">
                  <div>状态：{qrStatus}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={()=>setQrStatus('scanned')}>模拟已扫码</Button>
                    <Button variant="outline" onClick={()=>setQrStatus('confirmed')}>模拟已确认</Button>
                    <Button variant="outline" onClick={()=>setQrStatus('expired')}>模拟过期</Button>
                  </div>
                  <Button onClick={()=>{ setQrUrl('https://via.placeholder.com/240x240?text=Scan+Me'); setQrStatus('pending') }}>重新获取二维码</Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">二维码默认2分钟有效，建议每2秒轮询一次状态（低保真占位）。</div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={()=>{ toast.success('已保存（低保真）'); onClose() }}>保存</Button>
      </ModalFooter>
    </Modal>
  )
}

