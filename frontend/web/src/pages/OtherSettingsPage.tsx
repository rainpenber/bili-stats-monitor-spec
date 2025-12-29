import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { useUISelection, type ThemePreset, type Scheme } from '@/store/uiSelection'
import { toast } from 'sonner'
import { http } from '@/lib/http'

/**
 * 密码修改表单Schema
 */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少需要8位'),
  confirmPassword: z.string().min(8, '请确认新密码'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的新密码不一致',
  path: ['confirmPassword'],
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

/**
 * 主题色预设
 */
const THEME_PRESETS: Array<{ key: ThemePreset; label: string; color: string }> = [
  { key: 'default', label: '默认', color: 'bg-blue-500' },
  { key: 'green', label: '绿色', color: 'bg-green-500' },
  { key: 'blue', label: '蓝色', color: 'bg-blue-500' },
  { key: 'purple', label: '紫色', color: 'bg-purple-500' },
  { key: 'orange', label: '橙色', color: 'bg-orange-500' },
]

/**
 * OtherSettingsPage - 其他设置页面
 * 
 * 包含：
 * - 主题色设置（localStorage持久化）
 * - 配色方案设置（localStorage持久化）
 * - 管理员密码修改
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-026至FR-031
 */
export default function OtherSettingsPage() {
  const { theme, setTheme, scheme, setScheme } = useUISelection()
  const [changingPassword, setChangingPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  // 主题设置已由Zustand store自动处理localStorage持久化

  // 处理密码修改
  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    try {
      setChangingPassword(true)

      const response = await http.post<{ code: number; message?: string }>('/api/v1/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })

      // 后端返回success格式：{ code: 200, message: "Password changed successfully" }
      if (response && (response.code === 200 || response.code === 0)) {
        toast.success('密码修改成功')
        reset()
      } else {
        throw new Error((response as any)?.message || '密码修改失败')
      }
    } catch (err: any) {
      console.error('Failed to change password:', err)
      const errorMessage = err.response?.data?.message || err.message || '密码修改失败'
      
      if (errorMessage.includes('incorrect') || errorMessage.includes('错误')) {
        toast.error('当前密码错误')
      } else if (errorMessage.includes('8')) {
        toast.error('新密码至少需要8位')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="container-page py-6 space-y-6">
      <h1 className="text-xl font-semibold">其他设置</h1>

      {/* 主题色设置 */}
      <Card>
        <CardHeader>
          <h2 className="font-medium">主题色</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`relative h-9 px-3 rounded-md border ${
                  theme === p.key ? 'border-primary' : 'border-border'
                } flex items-center gap-2 hover:bg-accent transition-colors`}
                onClick={() => setTheme(p.key)}
              >
                <span className={`inline-block w-3 h-3 rounded-full ${p.color}`} />
                <span className="text-sm">{p.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            选择您喜欢的主题色，设置会自动保存
          </p>
        </CardContent>
      </Card>

      {/* 配色方案设置 */}
      <Card>
        <CardHeader>
          <h2 className="font-medium">配色方案</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              variant={scheme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScheme('system')}
            >
              跟随系统
            </Button>
            <Button
              variant={scheme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScheme('light')}
            >
              浅色
            </Button>
            <Button
              variant={scheme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScheme('dark')}
            >
              深色
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            选择配色方案，设置会自动保存
          </p>
        </CardContent>
      </Card>

      {/* 密码修改 */}
      <Card>
        <CardHeader>
          <h2 className="font-medium">修改管理员密码</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">当前密码</Label>
              <Input
                id="oldPassword"
                type="password"
                {...register('oldPassword')}
                placeholder="请输入当前密码"
              />
              {errors.oldPassword && (
                <p className="text-sm text-destructive">{errors.oldPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                placeholder="请输入新密码（至少8位）"
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                placeholder="请再次输入新密码"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? '修改中...' : '修改密码'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={changingPassword}
              >
                重置
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              新密码至少需要8位字符，请妥善保管您的密码
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

