import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PropsWithChildren, useEffect, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'
import { UserStatus } from '@/components/auth/UserStatus'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
      end
    >
      {label}
    </NavLink>
  )
}

function SettingsSubNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 pl-8 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function AppLayout({ children }: PropsWithChildren) {
  const { theme, scheme, setScheme } = useUISelection()
  const location = useLocation()
  
  // 系统设置菜单展开状态（URL驱动）
  const isSettingsRoute = location.pathname.startsWith('/settings')
  const [settingsExpanded, setSettingsExpanded] = useState(isSettingsRoute)

  // URL变化时自动展开/收起
  useEffect(() => {
    setSettingsExpanded(isSettingsRoute)
  }, [isSettingsRoute])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // 处理配色方案（system / light / dark）
  useEffect(() => {
    const apply = (dark: boolean) => {
      if (dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    if (scheme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const listener = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    } else {
      apply(scheme === 'dark')
    }
  }, [scheme])

  return (
    <div className="h-full grid grid-cols-[240px_1fr]">
      <aside className="border-r border-border p-4 bg-card flex flex-col">
        <div className="text-xl font-semibold mb-4">Bili Monitor</div>
        <nav className="space-y-1 flex-1">
          <NavItem to="/" label="我的账号" />
          <NavItem to="/tasks" label="监视任务" />
          
          {/* 系统设置可折叠菜单 */}
          <div>
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isSettingsRoute
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>系统设置</span>
              <span className={`transition-transform duration-200 ${settingsExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
            
            {/* 二级菜单 */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                settingsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-1 mt-1">
                <SettingsSubNavItem to="/settings/accounts" label="账号管理" />
                <SettingsSubNavItem to="/settings/notifications" label="通知设置" />
                <SettingsSubNavItem to="/settings/logs" label="日志" />
                <SettingsSubNavItem to="/settings/other" label="其他设置" />
              </div>
            </div>
          </div>
        </nav>
        
        {/* 分隔线 */}
        <div className="border-t border-border my-2" />
        
        {/* 用户状态模块 */}
        <UserStatus />
      </aside>
      <main className="overflow-y-auto bg-background">
        {/* 顶部工具条：快速切换明暗模式 */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border sticky top-0 bg-background z-10">
          <Button variant={scheme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('system')}>跟随系统</Button>
          <Button variant={scheme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('light')}>浅色</Button>
          <Button variant={scheme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('dark')}>深色</Button>
        </div>
        {/* 使用Outlet渲染子路由，支持children作为后备 */}
        <Outlet />
        {children}
      </main>
    </div>
  )
}
