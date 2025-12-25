#!/usr/bin/env bun
/**
 * 开发环境启动脚本
 * Development Environment Startup Script
 */

// 设置环境变量
process.env.NODE_ENV = 'development'

console.log('🚀 Starting Bili Stats Monitor in DEVELOPMENT mode...')
console.log('📝 Environment: development')
console.log('🔧 Features: Hot Reload, Detailed Errors, API Logging')
console.log('')

// 导入并启动应用
import('../src/index')
  .then(() => {
    console.log('✅ Development server started successfully!')
  })
  .catch((error) => {
    console.error('❌ Failed to start development server:', error)
    process.exit(1)
  })

