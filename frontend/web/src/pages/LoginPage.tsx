/**
 * LoginPage - 独立登录页面
 * 
 * 路由: /login
 * 功能: 用户主动登录或首次访问时的登录页面
 */

import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import type { LoginFormValues } from '@/lib/validations/authSchemas'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated } = useAuth()

  // 已登录用户访问/login时重定向到仪表板（FR-024）
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect, { replace: true })
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleSubmit = async (values: LoginFormValues) => {
    await login(values)
  }

  const handleSuccess = () => {
    // 登录成功后，跳转到redirect参数指定的页面或仪表板
    const redirect = searchParams.get('redirect') || '/'
    navigate(redirect, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* 登录卡片 */}
        <div className="rounded-lg border bg-card p-8 shadow-lg">
          {/* 标题 */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              B站数据监控系统
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              请登录您的管理员账号
            </p>
          </div>

          {/* 登录表单 */}
          <LoginForm
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            showRememberMe={true}
          />

          {/* 提示信息 */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>默认账号: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

