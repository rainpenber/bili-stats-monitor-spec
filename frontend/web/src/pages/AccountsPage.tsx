import { Button } from '@/components/ui/Button'
import { useUISelection } from '@/store/uiSelection'

export default function AccountsPage() {
  const { setAccountBindOpen } = useUISelection()
  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账号管理（低保真）</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAccountBindOpen(true)}>绑定账号</Button>
        </div>
      </div>
      <p className="text-gray-600">当前为低保真阶段占位页面。可通过“绑定账号”按钮打开 Cookie/扫码 绑定Modal。</p>
    </div>
  )
}
