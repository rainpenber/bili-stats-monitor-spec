/**
 * UserStatus组件 - 侧边栏用户状态模块
 * 
 * 功能：
 * 1. 未登录时显示"未登录"+登录按钮
 * 2. 已登录时显示用户头像+用户名+登出按钮
 * 3. 点击登录按钮触发LoginModal
 * 4. 点击登出按钮清除token并更新UI
 */

import { useAuth } from '@/hooks/useAuth'
import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'
import { LogOut, User as UserIcon } from 'lucide-react'

export function UserStatus() {
  const { user, isAuthenticated, logout } = useAuth()
  const { setLoginModalOpen } = useUISelection()

  const handleLogin = () => {
    setLoginModalOpen(true)
  }

  const handleLogout = async () => {
    await logout()
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
        <span className="text-sm text-muted-foreground">未登录</span>
        <Button 
          size="sm" 
          variant="default" 
          onClick={handleLogin}
          className="ml-auto"
        >
          登录
        </Button>
      </div>
    )
  }

  // 已登录状态
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50">
      {/* 用户头像（默认占位符） */}
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <UserIcon className="w-4 h-4" />
      </div>
      
      {/* 用户名 */}
      <span className="text-sm font-medium text-foreground flex-1">
        {user?.username || '用户'}
      </span>
      
      {/* 登出按钮 */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleLogout}
        className="p-1 h-auto"
        title="登出"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}

