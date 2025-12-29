import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Demo helpers for testing Toast & HTTP SDK in console
import { toast } from 'sonner'
import { http } from '@/lib/http'

;(window as any).__demo_toast = () => {
  toast.info('这是一条 Info 提示')
  setTimeout(() => toast.success('保存成功（演示）'), 500)
  setTimeout(() => toast.error('操作失败：演示错误'), 1000)
}
;(window as any).__http_get = (url: string, opts?: any) => http.get(url, opts)
;(window as any).__http_post = (url: string, body?: any, opts?: any) => http.post(url, body, opts)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
