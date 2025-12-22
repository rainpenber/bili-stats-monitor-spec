import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import AccountsPage from '@/pages/AccountsPage'
import SettingsPage from '@/pages/SettingsPage'
import LogsPage from '@/pages/LogsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import TaskFormModal from '@/components/modals/TaskFormModal'
import AccountBindModal from '@/components/modals/AccountBindModal'
import AddTaskModal from '@/components/modals/AddTaskModal'
import SelectAuthorVideosModal from '@/components/modals/SelectAuthorVideosModal'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { Toaster } from '@/components/ui/Toaster'

export default function App() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<div className="p-6">未找到页面</div>} />
        </Routes>
        {/* 全局挂载的编辑/绑定/新建/选择视频 Modal（低保真） */}
        <TaskFormModal />
        <AccountBindModal />
        <AddTaskModal />
        <SelectAuthorVideosModal />
        <Toaster />
      </AppLayout>
    </ErrorBoundary>
  )
}
