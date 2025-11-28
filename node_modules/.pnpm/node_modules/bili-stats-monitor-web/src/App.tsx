import { Routes, Route, NavLink } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import AccountsPage from '@/pages/AccountsPage'
import SettingsPage from '@/pages/SettingsPage'
import LogsPage from '@/pages/LogsPage'
import NotificationsPage from '@/pages/NotificationsPage'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<div className="p-6">未找到页面</div>} />
      </Routes>
    </AppLayout>
  )
}

