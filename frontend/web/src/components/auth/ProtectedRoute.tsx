/**
 * ProtectedRoute HOC组件
 * 
 * 功能：
 * 1. 检查用户是否已登录
 * 2. 未登录时弹出LoginModal（优先）或重定向到登录页面（备选）
 * 3. 已登录且token有效时，允许访问
 */

import { ReactNode, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUISelection } from '@/store/uiSelection'
import { useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const { setLoginModalOpen } = useUISelection()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 保存当前路径到sessionStorage，登录成功后跳转回来
      sessionStorage.setItem('redirect_after_login', location.pathname + location.search)
      
      // 弹出登录Modal（FR-023优先方案）
      setLoginModalOpen(true)
    }
  }, [isAuthenticated, isLoading, setLoginModalOpen, location])

  // 加载中，不渲染内容
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  // 已登录，渲染子组件
  if (isAuthenticated) {
    return <>{children}</>
  }

  // 未登录，显示提示（Modal会自动弹出）
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">请先登录以访问此页面</p>
      </div>
    </div>
  )
}

