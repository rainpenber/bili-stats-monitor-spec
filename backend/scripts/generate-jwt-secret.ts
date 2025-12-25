#!/usr/bin/env bun
/**
 * JWT密钥生成工具
 * JWT Secret Generator
 * 
 * 用于生成安全的JWT密钥
 */

import { randomBytes } from 'crypto'

console.log('🔐 JWT Secret Generator')
console.log('=' .repeat(60))
console.log('')

// 生成强密钥（48字节 = 64个base64字符）
const secret = randomBytes(48).toString('base64')

console.log('✅ Generated JWT Secret:')
console.log('')
console.log(secret)
console.log('')
console.log('=' .repeat(60))
console.log('')
console.log('📋 Usage:')
console.log('')
console.log('1. Copy the secret above')
console.log('2. Open your .env.production file')
console.log('3. Replace the JWT_SECRET value with this secret')
console.log('')
console.log('Example:')
console.log(`JWT_SECRET=${secret}`)
console.log('')
console.log('⚠️  Important: Keep this secret safe and never commit it to version control!')
console.log('')

