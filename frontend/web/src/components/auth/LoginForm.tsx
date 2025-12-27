/**
 * LoginForm组件
 * 
 * 可复用的登录表单，被LoginPage和LoginModal共享使用
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginFormSchema, type LoginFormValues } from '@/lib/validations/authSchemas'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { useState } from 'react'
import { toast } from 'sonner'

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  onSuccess?: () => void
  onError?: (error: Error) => void
  showRememberMe?: boolean
}

export function LoginForm({
  onSubmit,
  onSuccess,
  onError,
  showRememberMe = false,
}: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmitHandler = async (values: LoginFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(values)
      toast.success('登录成功！')
      onSuccess?.()
    } catch (err: any) {
      // 根据错误类型显示不同提示
      let errorMessage = '登录失败，请重试'
      
      if (err.message?.includes('Invalid username or password')) {
        errorMessage = '用户名或密码错误'
      } else if (err.message?.includes('网络') || err.message?.includes('network')) {
        errorMessage = '网络连接失败，请检查网络'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      onError?.(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 用户名 */}
      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          {...register('username')}
          placeholder="请输入用户名"
          disabled={isSubmitting}
          className={errors.username ? 'border-red-500' : ''}
        />
        {errors.username && (
          <p className="text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      {/* 密码 */}
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="请输入密码"
          disabled={isSubmitting}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* 记住我 */}
      {showRememberMe && (
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" {...register('rememberMe')} />
          <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
            记住我
          </Label>
        </div>
      )}

      {/* 登录按钮 */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? '登录中...' : '登录'}
      </Button>
    </form>
  )
}

