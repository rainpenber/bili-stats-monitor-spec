/**
 * LoginModal组件 - 登录Modal交互
 * 
 * 功能：
 * 1. 在需要鉴权时弹出，不跳转页面
 * 2. 复用LoginForm组件
 * 3. 登录成功后自动关闭Modal并重试之前的操作
 * 4. 关闭Modal时清空Pending Action
 */

import { useUISelection } from '@/store/uiSelection'
import { useAuth } from '@/hooks/useAuth'
import { usePendingAction } from '@/hooks/usePendingAction'
import { LoginForm } from './LoginForm'
import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal'
import type { LoginFormValues } from '@/lib/validations/authSchemas'
import { useEffect } from 'react'
import { registerUnauthorizedHandler } from '@/lib/http'

export function LoginModal() {
  const { loginModalOpen, setLoginModalOpen } = useUISelection()
  const { login } = useAuth()
  const { execute, clear, set } = usePendingAction()

  // 注册401错误处理函数（在组件挂载时）
  useEffect(() => {
    registerUnauthorizedHandler((retryRequest) => {
      // 保存重试函数为Pending Action
      set({
        type: 'api-call',
        payload: {
          apiCall: retryRequest,
        },
      })
      
      // 打开登录Modal
      setLoginModalOpen(true)
    })
  }, [set, setLoginModalOpen])

  const handleSubmit = async (values: LoginFormValues) => {
    await login(values)
  }

  const handleSuccess = async () => {
    // 登录成功后关闭Modal
    setLoginModalOpen(false)
    
    // 自动重试之前的操作（FR-011）
    await execute()
    
    // 恢复sessionStorage中保存的redirect路径
    const redirectPath = sessionStorage.getItem('redirect_after_login')
    if (redirectPath) {
      sessionStorage.removeItem('redirect_after_login')
      window.location.href = redirectPath
    }
  }

  const handleClose = () => {
    // 用户关闭Modal，清空Pending Action
    clear()
    setLoginModalOpen(false)
  }

  return (
    <Modal open={loginModalOpen} onClose={handleClose}>
      <ModalHeader 
        title="登录" 
        description="请输入您的管理员账号"
      />
      <ModalBody>
        <div className="space-y-4">
          <LoginForm
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            showRememberMe={false}
          />
          
          {/* 提示信息 */}
          <div className="text-center text-sm text-muted-foreground">
            <p>默认账号: admin / admin123</p>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}

