/**
 * HTTP请求拦截器
 * 
 * 功能：
 * 1. 自动为所有请求注入JWT token (Authorization: Bearer <token>)
 * 2. 捕获401错误，触发登录Modal
 * 3. 保存Pending Action，登录成功后重试
 */

import { getToken } from './token'

/**
 * 请求拦截器 - 注入JWT token
 */
export function requestInterceptor(config: any) {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}

/**
 * 响应错误拦截器 - 处理401错误
 * 
 * @param error Axios错误对象
 * @param onUnauthorized 401回调函数
 */
export function responseErrorInterceptor(
  error: any,
  onUnauthorized: (retryRequest: () => Promise<any>) => void
) {
  if (error.response && error.response.status === 401) {
    // 创建重试函数
    const retryRequest = async () => {
      const token = getToken()
      if (token) {
        // 更新请求头并重试
        error.config.headers['Authorization'] = `Bearer ${token}`
        const axios = (await import('axios')).default
        return axios.request(error.config)
      }
      throw error
    }

    // 触发登录Modal并传入重试函数
    onUnauthorized(retryRequest)
  }

  return Promise.reject(error)
}

