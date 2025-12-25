#!/usr/bin/env bun
/**
 * 开发环境启动脚本
 * Development Environment Startup Script
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// 加载 .env.development 文件
const envPath = resolve(import.meta.dir, '../.env.development')
if (existsSync(envPath)) {
  try {
    const envFile = readFileSync(envPath, 'utf-8')
    envFile.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...values] = line.split('=')
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = values.join('=').trim()
        }
      }
    })
    console.log('✅ Loaded .env.development')
  } catch (error) {
    console.warn('⚠️  Failed to load .env.development:', error)
  }
} else {
  console.warn('⚠️  .env.development not found')
}

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

