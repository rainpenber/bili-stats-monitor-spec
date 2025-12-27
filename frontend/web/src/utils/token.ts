/**
 * Token存储工具函数
 * 
 * 支持localStorage和sessionStorage两种存储方式
 */

const TOKEN_KEY = 'auth_token'

/**
 * 保存Token
 * @param token JWT token
 * @param rememberMe 是否记住我（使用localStorage vs sessionStorage）
 */
export function saveToken(token: string, rememberMe = false): void {
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

/**
 * 获取Token
 * @returns JWT token or null
 */
export function getToken(): string | null {
  // 优先从sessionStorage读取，如果没有则从localStorage读取
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

/**
 * 删除Token（登出时调用）
 */
export function removeToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 检查Token是否存在
 */
export function hasToken(): boolean {
  return getToken() !== null
}

