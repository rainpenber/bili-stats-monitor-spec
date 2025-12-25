#!/usr/bin/env bun
/**
 * 数据加密密钥生成工具
 * Encryption Key Generator
 * 
 * 用于生成安全的数据加密密钥（ENCRYPT_KEY）
 * 该密钥用于加密敏感数据，如账号cookie、通知密码等
 */

import { randomBytes } from 'crypto'

console.log('🔐 Encryption Key Generator')
console.log('=' .repeat(60))
console.log('')

// 生成32字节（64个hex字符）的加密密钥
const encryptKey = randomBytes(32).toString('hex')

console.log('✅ Generated ENCRYPT_KEY:')
console.log('')
console.log(encryptKey)
console.log('')
console.log('=' .repeat(60))
console.log('')
console.log('📋 Usage:')
console.log('')
console.log('1. Copy the key above')
console.log('2. Open your .env.production file')
console.log('3. Replace the ENCRYPT_KEY value with this key')
console.log('')
console.log('Example:')
console.log(`ENCRYPT_KEY=${encryptKey}`)
console.log('')
console.log('⚠️  Important:')
console.log('- This key is used to encrypt sensitive data (cookies, passwords, etc.)')
console.log('- Keep this key safe and never commit it to version control!')
console.log('- If you lose this key, encrypted data cannot be decrypted!')
console.log('- Must be exactly 64 hexadecimal characters (32 bytes)')
console.log('')
console.log('💡 Tip:')
console.log('- Store this key in a secure place (password manager, vault, etc.)')
console.log('- Back up this key separately from your database')
console.log('- Rotate keys periodically for better security')
console.log('')

