/**
 * 认证相关TypeScript类型定义
 * 
 * 包含用户信息、登录请求/响应、认证状态等类型
 */

/**
 * 用户信息
 */
export interface User {
  id: string
  username: string
  role: string
}

/**
 * 登录请求参数
 */
export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
  user: User
}

/**
 * 认证状态
 */
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

/**
 * Pending Action类型
 * 用于登录后自动重试之前的操作
 */
export interface PendingAction {
  type: 'api-call' | 'modal-open'
  payload: {
    apiCall?: () => Promise<any>
    modalAction?: () => void
  }
}

