import { describe, it, expect, beforeEach } from 'bun:test'
import { encrypt, decrypt, generateEncryptKey, getEncryptKey } from '../../src/utils/crypto'

describe('crypto', () => {
  const testKey = generateEncryptKey()

  beforeEach(() => {
    // 清除环境变量缓存
    delete process.env.ENCRYPT_KEY
  })

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'test message 123'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
      expect(ciphertext).toContain(':') // 格式：iv:authTag:ciphertext
    })

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same message'
      const ciphertext1 = encrypt(plaintext, testKey)
      const ciphertext2 = encrypt(plaintext, testKey)

      // 由于 IV 是随机的，每次加密结果应该不同
      expect(ciphertext1).not.toBe(ciphertext2)
      
      // 但解密后应该相同
      expect(decrypt(ciphertext1, testKey)).toBe(plaintext)
      expect(decrypt(ciphertext2, testKey)).toBe(plaintext)
    })

    it('should handle empty string', () => {
      const plaintext = ''
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = '测试中文 🎉 !@#$%^&*()'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid key length', () => {
      const plaintext = 'test'
      const invalidKey = 'short'

      expect(() => encrypt(plaintext, invalidKey)).toThrow('ENCRYPT_KEY must be 64 hex characters')
      expect(() => decrypt('iv:tag:cipher', invalidKey)).toThrow('ENCRYPT_KEY must be 64 hex characters')
    })

    it('should throw error for invalid ciphertext format', () => {
      expect(() => decrypt('invalid', testKey)).toThrow('Invalid ciphertext format')
      expect(() => decrypt('iv:tag', testKey)).toThrow('Invalid ciphertext format')
    })

    it('should throw error for wrong key', () => {
      const plaintext = 'test message'
      const key1 = generateEncryptKey()
      const key2 = generateEncryptKey()
      const ciphertext = encrypt(plaintext, key1)

      expect(() => decrypt(ciphertext, key2)).toThrow()
    })
  })

  describe('generateEncryptKey', () => {
    it('should generate 64 hex characters', () => {
      const key = generateEncryptKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(key.length).toBe(64)
    })

    it('should generate different keys', () => {
      const key1 = generateEncryptKey()
      const key2 = generateEncryptKey()
      expect(key1).not.toBe(key2)
    })
  })

  describe('getEncryptKey', () => {
    it('should return key from environment variable', () => {
      const envKey = generateEncryptKey()
      process.env.ENCRYPT_KEY = envKey
      expect(getEncryptKey()).toBe(envKey)
    })

    it('should throw error for invalid key format', () => {
      process.env.ENCRYPT_KEY = 'invalid-key'
      expect(() => getEncryptKey()).toThrow('ENCRYPT_KEY must be 64 hex characters')
    })

    it('should use development key when not set in development', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.ENCRYPT_KEY
      const key = getEncryptKey()
      expect(key).toBe('0'.repeat(64))
    })

    it('should throw error when not set in production', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.ENCRYPT_KEY
      expect(() => getEncryptKey()).toThrow('ENCRYPT_KEY is required in production')
    })
  })
})

