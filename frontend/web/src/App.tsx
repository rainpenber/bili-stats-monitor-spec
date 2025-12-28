import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import MyAccountPage from '@/pages/MyAccountPage'
import TasksMonitorPage from '@/pages/TasksMonitorPage'
import AccountsPage from '@/pages/AccountsPage'
import SettingsPage from '@/pages/SettingsPage'
import LogsPage from '@/pages/LogsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import LoginPage from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginModal } from '@/components/auth/LoginModal'
import TaskFormModal from '@/components/modals/TaskFormModal'
import AccountBindModal from '@/components/modals/AccountBindModal'
import AddTaskModal from '@/components/modals/AddTaskModal'
import SelectAuthorVideosModal from '@/components/modals/SelectAuthorVideosModal'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { Toaster } from '@/components/ui/Toaster'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* 独立登录页面（不使用AppLayout） */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 主应用路由（使用AppLayout + ProtectedRoute） */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<MyAccountPage />} />
          <Route path="/tasks" element={<TasksMonitorPage />} />
          <Route path="/dashboard" element={<Navigate to="/tasks" replace />} />
          <Route 
            path="/accounts" 
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/logs" 
            element={
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<div className="p-6">未找到页面</div>} />
        </Route>
      </Routes>
      
      {/* 全局挂载的编辑/绑定/新建/选择视频 Modal（低保真） */}
      <LoginModal />
      <TaskFormModal />
      <AccountBindModal />
      <AddTaskModal />
      <SelectAuthorVideosModal />
      <Toaster />
    </ErrorBoundary>
  )
}
