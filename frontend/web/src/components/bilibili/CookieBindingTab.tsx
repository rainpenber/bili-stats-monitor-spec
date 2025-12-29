import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { bindByCookie } from '@/lib/api'
import { cookieBindingSchema, type CookieBindingForm } from '@/lib/validations/bilibiliSchemas'

interface CookieBindingTabProps {
  onSuccess: () => void
}

export function CookieBindingTab({ onSuccess }: CookieBindingTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CookieBindingForm>({
    resolver: zodResolver(cookieBindingSchema),
  })

  const onSubmit = async (data: CookieBindingForm) => {
    setIsSubmitting(true)
    try {
      await bindByCookie({ cookie: data.cookie })
      toast.success('账号绑定成功！')
      onSuccess()
    } catch (error: any) {
      // 错误处理
      const errorMessages: Record<string, string> = {
        COOKIE_INVALID: 'Cookie无效或已过期，请重新获取',
        ACCOUNT_ALREADY_BOUND: '该B站账号已被绑定',
        INVALID_COOKIE_FORMAT: 'Cookie格式错误，必须包含SESSDATA字段',
        BIND_FAILED: '绑定失败，请稍后重试',
      }

      const errorCode = error.response?.data?.error || 'BIND_FAILED'
      const message = errorMessages[errorCode] || error.message || '绑定失败'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="cookie" className="text-sm font-medium text-foreground">
          请输入B站Cookie
        </label>
        <textarea
          id="cookie"
          {...register('cookie')}
          className="w-full h-28 p-3 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="SESSDATA=xxxx; bili_jct=xxxx; ..."
        />
        {errors.cookie && (
          <p className="text-xs text-red-500">{errors.cookie.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          提示：Cookie可从浏览器开发者工具中获取，必须包含 SESSDATA 字段。绑定后，系统会自动加密存储您的凭证。
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? '绑定中...' : '确认绑定'}
      </Button>
    </form>
  )
}

