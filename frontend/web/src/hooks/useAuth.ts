/**
 * useAuth Hook - 认证状态管理
 * 
 * 提供：
 * - 当前用户信息
 * - 登录状态
 * - 登录/登出方法
 */

import { useEffect } from 'react'
import { getToken, saveToken, removeToken } from '@/utils/token'
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '@/lib/api'
import { useUISelection } from '@/store/uiSelection'
import type { LoginRequest } from '@/types/auth'

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isAuthLoading: isLoading,
    setUser,
    setIsAuthenticated,
    setIsAuthLoading: setIsLoading,
  } = useUISelection()

  // 初始化：从token恢复用户信息
  useEffect(() => {
    const token = getToken()
    if (token) {
      // 尝试获取用户信息
      getCurrentUser()
        .then((userData) => {
          setUser(userData)
          setIsAuthenticated(true)
        })
        .catch(() => {
          // Token无效，清除
          removeToken()
          setUser(null)
          setIsAuthenticated(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [setUser, setIsAuthenticated, setIsLoading])

  // 登录
  const login = async (credentials: LoginRequest) => {
    const response = await apiLogin(credentials)
    const { token, user: userData } = response

    // 保存token
    saveToken(token, credentials.rememberMe)

    // 更新全局状态
    setUser(userData)
    setIsAuthenticated(true)

    return response
  }

  // 登出
  const logout = async () => {
    await apiLogout()
    removeToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}

