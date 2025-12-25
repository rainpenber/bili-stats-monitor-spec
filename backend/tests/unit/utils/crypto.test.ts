// T063: 加密工具补充单元测试（扩展边界情况）
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { encrypt, decrypt, generateEncryptKey, getEncryptKey } from '../../../src/utils/crypto'

describe('Crypto Utils - 补充单元测试 (T063)', () => {
  const testKey = generateEncryptKey()

  beforeEach(() => {
    // 清除环境变量
    delete process.env.ENCRYPT_KEY
    delete process.env.NODE_ENV
  })

  describe('encrypt/decrypt - 现有功能', () => {
    test('应正确加密和解密文本', () => {
      const plaintext = 'test message 123'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
      expect(ciphertext).toContain(':')
    })

    test('相同明文应产生不同密文（随机IV）', () => {
      const plaintext = 'same message'
      const ciphertext1 = encrypt(plaintext, testKey)
      const ciphertext2 = encrypt(plaintext, testKey)

      expect(ciphertext1).not.toBe(ciphertext2)
      expect(decrypt(ciphertext1, testKey)).toBe(plaintext)
      expect(decrypt(ciphertext2, testKey)).toBe(plaintext)
    })

    test('应处理空字符串', () => {
      const plaintext = ''
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
    })

    test('应处理特殊字符和Unicode', () => {
      const plaintext = '测试中文 🎉 !@#$%^&*()'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(plaintext)
    })

    test('错误的密钥应无法解密', () => {
      const plaintext = 'test message'
      const key1 = generateEncryptKey()
      const key2 = generateEncryptKey()
      const ciphertext = encrypt(plaintext, key1)

      expect(() => decrypt(ciphertext, key2)).toThrow()
    })
  })

  describe('encrypt - 边界情况补充', () => {
    test('应处理非常长的文本（10KB）', () => {
      const longText = 'A'.repeat(10 * 1024) // 10KB
      const ciphertext = encrypt(longText, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(longText)
      expect(ciphertext.length).toBeGreaterThan(longText.length)
    })

    test('应处理超长文本（1MB）', () => {
      const veryLongText = 'B'.repeat(1024 * 1024) // 1MB
      const ciphertext = encrypt(veryLongText, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(veryLongText)
    })

    test('应处理单个字符', () => {
      const singleChar = 'A'
      const ciphertext = encrypt(singleChar, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(singleChar)
    })

    test('应处理换行符和制表符', () => {
      const textWithWhitespace = 'Line1\nLine2\tTabbed\r\nCRLF'
      const ciphertext = encrypt(textWithWhitespace, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(textWithWhitespace)
    })

    test('应处理JSON字符串', () => {
      const jsonData = JSON.stringify({
        user: 'test',
        password: 'secret123',
        nested: { a: 1, b: [1, 2, 3] },
      })
      const ciphertext = encrypt(jsonData, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(jsonData)
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData))
    })

    test('应处理各种Emoji', () => {
      const emojiText = '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇'
      const ciphertext = encrypt(emojiText, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(emojiText)
    })

    test('应处理HTML和XML', () => {
      const html = '<html><body><p>Test &amp; "quotes"</p></body></html>'
      const ciphertext = encrypt(html, testKey)
      const decrypted = decrypt(ciphertext, testKey)

      expect(decrypted).toBe(html)
    })

    test('无效密钥长度应抛出错误', () => {
      expect(() => encrypt('test', '')).toThrow('ENCRYPT_KEY must be 64 hex characters')
      expect(() => encrypt('test', 'short')).toThrow()
      expect(() => encrypt('test', '0'.repeat(63))).toThrow() // 63字符
      expect(() => encrypt('test', '0'.repeat(65))).toThrow() // 65字符
    })

    test('非hex字符的密钥应抛出错误（通过getEncryptKey）', () => {
      const nonHexKey = '0'.repeat(63) + 'G' // 包含非hex字符
      // 直接调用encrypt时不会检查hex，但getEncryptKey会
      // 这里测试encrypt的行为
      expect(() => encrypt('test', nonHexKey)).toThrow()
    })
  })

  describe('decrypt - 错误处理补充', () => {
    test('格式错误：缺少冒号分隔符', () => {
      expect(() => decrypt('invalidformat', testKey)).toThrow('Invalid ciphertext format')
    })

    test('格式错误：只有一个冒号', () => {
      expect(() => decrypt('part1:part2', testKey)).toThrow('Invalid ciphertext format')
    })

    test('格式错误：太多冒号', () => {
      expect(() => decrypt('a:b:c:d:e', testKey)).toThrow()
    })

    test('格式错误：空字符串', () => {
      expect(() => decrypt('', testKey)).toThrow()
    })

    test('非法IV：非hex字符', () => {
      expect(() => decrypt('ZZZZ:authTag:cipher', testKey)).toThrow()
    })

    test('非法authTag：长度不正确', () => {
      const validIV = 'a'.repeat(24) // 12字节 = 24 hex字符
      expect(() => decrypt(`${validIV}:short:cipher`, testKey)).toThrow()
    })

    test('密文被篡改应解密失败', () => {
      const plaintext = 'original message'
      const ciphertext = encrypt(plaintext, testKey)
      
      // 篡改密文的一部分
      const parts = ciphertext.split(':')
      const tamperedCipher = parts[0] + ':' + parts[1] + ':' + parts[2].slice(0, -2) + 'FF'
      
      expect(() => decrypt(tamperedCipher, testKey)).toThrow()
    })

    test('authTag被篡改应解密失败', () => {
      const plaintext = 'secure data'
      const ciphertext = encrypt(plaintext, testKey)
      
      const parts = ciphertext.split(':')
      const tamperedAuthTag = parts[0] + ':FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:' + parts[2]
      
      expect(() => decrypt(tamperedAuthTag, testKey)).toThrow()
    })

    test('IV被篡改应解密失败', () => {
      const plaintext = 'protected'
      const ciphertext = encrypt(plaintext, testKey)
      
      const parts = ciphertext.split(':')
      const tamperedIV = 'FFFFFFFFFFFFFFFFFFFFFFFF:' + parts[1] + ':' + parts[2]
      
      expect(() => decrypt(tamperedIV, testKey)).toThrow()
    })
  })

  describe('generateEncryptKey - 补充测试', () => {
    test('应生成64个hex字符', () => {
      const key = generateEncryptKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(key.length).toBe(64)
    })

    test('应生成不同的密钥（随机性）', () => {
      const keys = new Set()
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptKey())
      }
      
      // 100次生成应该都不同
      expect(keys.size).toBe(100)
    })

    test('生成的密钥应可用于加密', () => {
      const key = generateEncryptKey()
      const plaintext = 'test with generated key'
      
      expect(() => {
        const ciphertext = encrypt(plaintext, key)
        decrypt(ciphertext, key)
      }).not.toThrow()
    })

    test('生成的密钥应为小写hex', () => {
      const key = generateEncryptKey()
      expect(key).toBe(key.toLowerCase())
      expect(key).not.toMatch(/[A-F]/)
    })
  })

  describe('getEncryptKey - 环境变量处理', () => {
    test('应从环境变量返回密钥', () => {
      const envKey = generateEncryptKey()
      process.env.ENCRYPT_KEY = envKey
      expect(getEncryptKey()).toBe(envKey)
    })

    test('应拒绝无效长度的密钥', () => {
      process.env.ENCRYPT_KEY = '0'.repeat(32) // 只有32字符
      expect(() => getEncryptKey()).toThrow('ENCRYPT_KEY must be 64 hex characters')
    })

    test('应拒绝非hex字符的密钥', () => {
      process.env.ENCRYPT_KEY = '0'.repeat(63) + 'G'
      expect(() => getEncryptKey()).toThrow('ENCRYPT_KEY must be 64 hex characters')
    })

    test('应拒绝包含空格的密钥', () => {
      process.env.ENCRYPT_KEY = '0'.repeat(32) + ' ' + '0'.repeat(31)
      expect(() => getEncryptKey()).toThrow()
    })

    test('开发环境未设置应返回默认密钥', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.ENCRYPT_KEY
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const key = getEncryptKey()
      expect(key).toBe('0'.repeat(64))
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENCRYPT_KEY not set')
      )
      
      consoleWarnSpy.mockRestore()
    })

    test('生产环境未设置应抛出错误', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.ENCRYPT_KEY
      
      expect(() => getEncryptKey()).toThrow('ENCRYPT_KEY is required in production')
    })

    test('test环境应视为开发环境', () => {
      process.env.NODE_ENV = 'test'
      delete process.env.ENCRYPT_KEY
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const key = getEncryptKey()
      
      expect(key).toBe('0'.repeat(64))
      consoleWarnSpy.mockRestore()
    })

    test('应接受大写hex字符', () => {
      const mixedCaseKey = '0123456789ABCDEF'.repeat(4) // 64字符
      process.env.ENCRYPT_KEY = mixedCaseKey
      
      expect(() => getEncryptKey()).not.toThrow()
      expect(getEncryptKey()).toBe(mixedCaseKey)
    })
  })

  describe('加密格式验证', () => {
    test('加密输出应包含3部分', () => {
      const ciphertext = encrypt('test', testKey)
      const parts = ciphertext.split(':')
      
      expect(parts.length).toBe(3)
    })

    test('IV应为24个hex字符（12字节）', () => {
      const ciphertext = encrypt('test', testKey)
      const iv = ciphertext.split(':')[0]
      
      expect(iv.length).toBe(24)
      expect(iv).toMatch(/^[0-9a-f]{24}$/)
    })

    test('authTag应为32个hex字符（16字节）', () => {
      const ciphertext = encrypt('test', testKey)
      const authTag = ciphertext.split(':')[1]
      
      expect(authTag.length).toBe(32)
      expect(authTag).toMatch(/^[0-9a-f]{32}$/)
    })

    test('密文应为hex字符串', () => {
      const ciphertext = encrypt('test', testKey)
      const encrypted = ciphertext.split(':')[2]
      
      expect(encrypted).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('性能和安全特性', () => {
    test('加密应在合理时间内完成（< 100ms for 1KB）', () => {
      const text = 'A'.repeat(1024)
      const start = Date.now()
      encrypt(text, testKey)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    test('解密应在合理时间内完成（< 100ms for 1KB）', () => {
      const text = 'A'.repeat(1024)
      const ciphertext = encrypt(text, testKey)
      
      const start = Date.now()
      decrypt(ciphertext, testKey)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    test('IV应为随机生成（统计测试）', () => {
      const ivs = new Set()
      for (let i = 0; i < 50; i++) {
        const ciphertext = encrypt('test', testKey)
        const iv = ciphertext.split(':')[0]
        ivs.add(iv)
      }
      
      // 50次加密应生成50个不同的IV
      expect(ivs.size).toBe(50)
    })
  })
})


