import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

/**
 * AES-256-GCM 加密
 * @param plaintext 明文
 * @param key 密钥（32字节，从环境变量获取）
 * @returns 加密后的字符串（格式：iv:authTag:ciphertext，均为hex编码）
 */
export function encrypt(plaintext: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPT_KEY must be 64 hex characters (32 bytes)')
  }

  const keyBuffer = Buffer.from(key, 'hex')
  const iv = randomBytes(12) // GCM 推荐 12 字节 IV
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // 格式：iv:authTag:ciphertext（均为hex）
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`
}

/**
 * AES-256-GCM 解密
 * @param ciphertext 密文（格式：iv:authTag:ciphertext）
 * @param key 密钥（32字节，从环境变量获取）
 * @returns 解密后的明文
 */
export function decrypt(ciphertext: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPT_KEY must be 64 hex characters (32 bytes)')
  }

  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected: iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const keyBuffer = Buffer.from(key, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(encryptedHex, 'hex', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * 从环境变量获取加密密钥
 * 如果未设置，生成一个随机密钥（仅用于开发环境）
 */
export function getEncryptKey(): string {
  const key = process.env.ENCRYPT_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPT_KEY is required in production environment')
    }
    // 开发环境：生成一个固定的测试密钥（仅用于开发）
    console.warn('⚠️  ENCRYPT_KEY not set, using development key. DO NOT use in production!')
    return '0'.repeat(64) // 64个0作为开发密钥
  }

  // 验证密钥格式（64个hex字符 = 32字节）
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPT_KEY must be 64 hex characters (32 bytes)')
  }

  return key
}

/**
 * 生成随机加密密钥（用于初始化）
 * @returns 64位hex字符串（32字节）
 */
export function generateEncryptKey(): string {
  return randomBytes(32).toString('hex')
}

