import { describe, it, expect, beforeEach } from 'bun:test'
import { WbiService } from '../../../src/services/bili/wbi'

describe('WbiService', () => {
  let wbiService: WbiService

  beforeEach(() => {
    wbiService = new WbiService()
  })

  describe('extractKeysFromNav', () => {
    it('should extract keys from nav response', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
            sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toEqual({
        imgKey: '7cd084941338484aae1ad9425b84077c',
        subKey: '4932caff0ff746eab6f01bf08b70ac45',
      })
    })

    it('should return null for invalid response', () => {
      expect(wbiService.extractKeysFromNav({})).toBeNull()
      expect(wbiService.extractKeysFromNav({ data: {} })).toBeNull()
      expect(wbiService.extractKeysFromNav(null as any)).toBeNull()
    })
  })

  describe('refreshKeys', () => {
    it('should store keys with expiration', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'

      wbiService.refreshKeys(imgKey, subKey)
      const keys = wbiService.getKeys()

      expect(keys).toEqual({ imgKey, subKey })
    })
  })

  describe('signParams', () => {
    it('should add wts and w_rid to params', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'
      wbiService.refreshKeys(imgKey, subKey)

      const params = { foo: '114', bar: '514', baz: 1919810 }
      const signed = wbiService.signParams(params)

      expect(signed.wts).toBeDefined()
      expect(typeof signed.wts).toBe('number')
      expect(signed.w_rid).toBeDefined()
      expect(String(signed.w_rid)).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should preserve original params', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'
      wbiService.refreshKeys(imgKey, subKey)

      const params = { foo: '114', bar: '514' }
      const signed = wbiService.signParams(params)

      expect(signed.foo).toBe('114')
      expect(signed.bar).toBe('514')
    })

    it('should throw error when keys not available', () => {
      const params = { foo: '114' }
      expect(() => wbiService.signParams(params)).toThrow('WBI keys not available')
    })

    it('should filter special characters from values', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'
      wbiService.refreshKeys(imgKey, subKey)

      const params = { foo: "test!'()*chars" }
      const signed = wbiService.signParams(params)

      // 应该能正常签名（特殊字符被过滤）
      expect(signed.w_rid).toBeDefined()
    })
  })

  describe('key expiration', () => {
    it('should return null when keys expired', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'
      wbiService.refreshKeys(imgKey, subKey)

      // 模拟过期：直接修改内部状态（测试用）
      ;(wbiService as any).keys = {
        imgKey,
        subKey,
        expiresAt: Date.now() - 1000, // 已过期
      }

      expect(wbiService.getKeys()).toBeNull()
    })
  })
})

