#!/usr/bin/env bun
/**
 * 生产环境启动脚本
 * Production Environment Startup Script
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// 加载 .env.production 文件
const envPath = resolve(import.meta.dir, '../.env.production')
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
    console.log('✅ Loaded .env.production')
  } catch (error) {
    console.warn('⚠️  Failed to load .env.production:', error)
  }
} else {
  console.warn('⚠️  .env.production not found')
}

// 设置环境变量
process.env.NODE_ENV = 'production'

console.log('🚀 Starting Bili Stats Monitor in PRODUCTION mode...')
console.log('📝 Environment: production')
console.log('🔒 Security: Enhanced')
console.log('⚡ Performance: Optimized')
console.log('')

// 验证生产环境必需的环境变量
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPT_KEY']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('')
  console.error('Please set these variables in your .env.production file or environment.')
  console.error('')
  console.error('💡 Tips:')
  console.error('   - Generate JWT_SECRET: npm run generate-secret')
  console.error('   - Generate ENCRYPT_KEY: npm run generate-encrypt-key')
  process.exit(1)
}

// 验证ENCRYPT_KEY格式（必须是64个hex字符）
const encryptKey = process.env.ENCRYPT_KEY
if (encryptKey && !/^[0-9a-fA-F]{64}$/.test(encryptKey)) {
  console.error('❌ Invalid ENCRYPT_KEY format!')
  console.error('')
  console.error('ENCRYPT_KEY must be exactly 64 hexadecimal characters (32 bytes).')
  console.error('')
  console.error('💡 Generate a valid key:')
  console.error('   npm run generate-encrypt-key')
  console.error('')
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

