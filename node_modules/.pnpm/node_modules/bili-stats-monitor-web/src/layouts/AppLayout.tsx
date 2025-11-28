import { NavLink } from 'react-router-dom'
import { PropsWithChildren } from 'react'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
      }
      end
    >
      {label}
    </NavLink>
  )
}

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-full grid grid-cols-[240px_1fr]">
      <aside className="border-r border-gray-200 p-4">
        <div className="text-xl font-semibold mb-4">Bili Monitor</div>
        <nav className="space-y-1">
          <NavItem to="/" label="仪表板" />
          <NavItem to="/accounts" label="账号管理" />
          <NavItem to="/notifications" label="通知设置" />
          <NavItem to="/logs" label="日志" />
          <NavItem to="/settings" label="系统设置" />
        </nav>
      </aside>
      <main className="overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

