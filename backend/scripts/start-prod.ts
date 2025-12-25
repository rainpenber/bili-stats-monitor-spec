#!/usr/bin/env bun
/**
 * 生产环境启动脚本
 * Production Environment Startup Script
 */

// 设置环境变量
process.env.NODE_ENV = 'production'

console.log('🚀 Starting Bili Stats Monitor in PRODUCTION mode...')
console.log('📝 Environment: production')
console.log('🔒 Security: Enhanced')
console.log('⚡ Performance: Optimized')
console.log('')

// 验证生产环境必需的环境变量
const requiredEnvVars = ['JWT_SECRET']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('')
  console.error('Please set these variables in your .env.production file or environment.')
  process.exit(1)
}

// 导入并启动应用
import('../src/index')
  .then(() => {
    console.log('✅ Production server started successfully!')
  })
  .catch((error) => {
    console.error('❌ Failed to start production server:', error)
    process.exit(1)
  })

