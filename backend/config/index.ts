/**
 * 配置管理中心
 * Configuration Manager
 * 
 * 根据环境自动加载对应的配置文件
 */

import { developmentConfig } from './development'
import { productionConfig } from './production'

export type AppConfig = typeof developmentConfig

/**
 * 获取当前环境名称
 */
export function getEnvironment(): 'development' | 'production' {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'production') {
    return 'production'
  }
  
  return 'development'
}

/**
 * 根据环境加载配置
 */
export function loadConfig(): AppConfig {
  const env = getEnvironment()
  
  console.log(`[Config] Loading ${env} configuration...`)
  
  const config = env === 'production' ? productionConfig : developmentConfig
  
  // 验证必需的配置项
  validateConfig(config)
  
  return config
}

/**
 * 验证配置的有效性
 */
function validateConfig(config: AppConfig): void {
  // 验证端口
  if (!config.app.port || config.app.port < 1 || config.app.port > 65535) {
    throw new Error(`Invalid port: ${config.app.port}`)
  }
  
  // 验证数据库URL
  if (!config.database.url) {
    throw new Error('Database URL is required')
  }
  
  // 验证JWT密钥
  if (!config.jwt.secret) {
    throw new Error('JWT secret is required')
  }
  
  // 生产环境额外验证
  if (config.app.nodeEnv === 'production') {
    // 确保使用强JWT密钥
    if (config.jwt.secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters in production')
    }
    
    // 确保CORS配置正确
    if (config.cors.origin.includes('localhost') || config.cors.origin.includes('127.0.0.1')) {
      console.warn('[Config] Warning: CORS origin includes localhost in production!')
    }
  }
  
  console.log('[Config] Configuration validated successfully')
}

/**
 * 默认导出当前环境的配置
 */
export const config = loadConfig()

/**
 * 导出配置类型
 */
export type { AppConfig }

