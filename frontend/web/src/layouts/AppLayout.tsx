import { NavLink } from 'react-router-dom'
import { PropsWithChildren, useEffect } from 'react'
import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'

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

export default function AppLayout({ children }: PropsWithChildren) {
  const { theme, scheme, setScheme } = useUISelection()

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
      <aside className="border-r border-border p-4 bg-card">
        <div className="text-xl font-semibold mb-4">Bili Monitor</div>
        <nav className="space-y-1">
          <NavItem to="/" label="仪表板" />
          <NavItem to="/accounts" label="账号管理" />
          <NavItem to="/notifications" label="通知设置" />
          <NavItem to="/logs" label="日志" />
          <NavItem to="/settings" label="系统设置" />
        </nav>
      </aside>
      <main className="overflow-y-auto bg-background">
        {/* 顶部工具条：快速切换明暗模式 */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border sticky top-0 bg-background z-10">
          <Button variant={scheme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('system')}>跟随系统</Button>
          <Button variant={scheme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('light')}>浅色</Button>
          <Button variant={scheme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setScheme('dark')}>深色</Button>
        </div>
        {children}
      </main>
    </div>
  )
}
