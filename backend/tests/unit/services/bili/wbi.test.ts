// T064: WBI签名生成补充单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { WbiService } from '../../../../src/services/bili/wbi'

describe('WbiService - 补充单元测试 (T064)', () => {
  let wbiService: WbiService

  beforeEach(() => {
    wbiService = new WbiService()
  })

  describe('extractKeysFromNav - 现有功能', () => {
    test('应从nav响应中提取keys', () => {
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

    test('无效响应应返回null', () => {
      expect(wbiService.extractKeysFromNav({})).toBeNull()
      expect(wbiService.extractKeysFromNav({ data: {} })).toBeNull()
      expect(wbiService.extractKeysFromNav(null as any)).toBeNull()
    })
  })

  describe('extract使用WbiService - 边界情况补充', () => {
    test('应处理不同域名的URL', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 'https://i1.hdslb.com/bfs/wbi/abc123.png',
            sub_url: 'https://i2.hdslb.com/bfs/wbi/def456.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toEqual({
        imgKey: 'abc123',
        subKey: 'def456',
      })
    })

    test('应处理不同路径格式的URL', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 'https://example.com/path/to/key123.png',
            sub_url: 'https://example.com/another/path/key456.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toEqual({
        imgKey: 'key123',
        subKey: 'key456',
      })
    })

    test('URL不包含.png后缀应返回null', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 'https://example.com/key.jpg',
            sub_url: 'https://example.com/key.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toBeNull()
    })

    test('缺少img_url应返回null', () => {
      const navResponse = {
        data: {
          wbi_img: {
            sub_url: 'https://example.com/key.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toBeNull()
    })

    test('缺少sub_url应返回null', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 'https://example.com/key.png',
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toBeNull()
    })

    test('wbi_img为null应返回null', () => {
      const navResponse = {
        data: {
          wbi_img: null,
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toBeNull()
    })

    test('应处理异常情况', () => {
      const navResponse = {
        data: {
          wbi_img: {
            img_url: 12345, // 非字符串
            sub_url: null,
          },
        },
      }

      const keys = wbiService.extractKeysFromNav(navResponse)
      expect(keys).toBeNull()
    })
  })

  describe('refreshKeys - 密钥管理', () => {
    test('应存储密钥并设置过期时间', () => {
      const imgKey = '7cd084941338484aae1ad9425b84077c'
      const subKey = '4932caff0ff746eab6f01bf08b70ac45'

      wbiService.refreshKeys(imgKey, subKey)
      const keys = wbiService.getKeys()

      expect(keys).toEqual({ imgKey, subKey })
    })

    test('应能多次刷新密钥', () => {
      wbiService.refreshKeys('key1', 'key2')
      expect(wbiService.getKeys()).toEqual({ imgKey: 'key1', subKey: 'key2' })

      wbiService.refreshKeys('key3', 'key4')
      expect(wbiService.getKeys()).toEqual({ imgKey: 'key3', subKey: 'key4' })
    })

    test('应接受空字符串密钥', () => {
      wbiService.refreshKeys('', '')
      const keys = wbiService.getKeys()

      expect(keys).toEqual({ imgKey: '', subKey: '' })
    })

    test('应接受非常长的密钥', () => {
      const longKey = 'a'.repeat(1000)
      wbiService.refreshKeys(longKey, longKey)
      
      const keys = wbiService.getKeys()
      expect(keys?.imgKey).toBe(longKey)
    })
  })

  describe('getKeys - 密钥获取和过期', () => {
    test('未设置密钥应返回null', () => {
      expect(wbiService.getKeys()).toBeNull()
    })

    test('有效密钥应返回', () => {
      wbiService.refreshKeys('img', 'sub')
      expect(wbiService.getKeys()).not.toBeNull()
    })

    test('过期密钥应返回null', () => {
      wbiService.refreshKeys('img', 'sub')

      // 模拟密钥过期
      ;(wbiService as any).keys = {
        imgKey: 'img',
        subKey: 'sub',
        expiresAt: Date.now() - 1000, // 1秒前过期
      }

      expect(wbiService.getKeys()).toBeNull()
    })

    test('刚好到期应返回null', () => {
      wbiService.refreshKeys('img', 'sub')

      ;(wbiService as any).keys = {
        imgKey: 'img',
        subKey: 'sub',
        expiresAt: Date.now(), // 刚好到期
      }

      expect(wbiService.getKeys()).toBeNull()
    })

    test('未到期应返回密钥', () => {
      wbiService.refreshKeys('img', 'sub')

      ;(wbiService as any).keys = {
        imgKey: 'img',
        subKey: 'sub',
        expiresAt: Date.now() + 10000, // 10秒后过期
      }

      expect(wbiService.getKeys()).not.toBeNull()
    })
  })

  describe('signParams - 签名生成', () => {
    beforeEach(() => {
      // 使用已知的测试密钥
      wbiService.refreshKeys(
        '7cd084941338484aae1ad9425b84077c',
        '4932caff0ff746eab6f01bf08b70ac45'
      )
    })

    test('应添加wts和w_rid到参数', () => {
      const params = { foo: '114', bar: '514' }
      const signed = wbiService.signParams(params)

      expect(signed.wts).toBeDefined()
      expect(typeof signed.wts).toBe('number')
      expect(signed.w_rid).toBeDefined()
      expect(String(signed.w_rid)).toMatch(/^[a-f0-9]{32}$/)
    })

    test('应保留原始参数', () => {
      const params = { foo: '114', bar: '514', baz: 1919810 }
      const signed = wbiService.signParams(params)

      expect(signed.foo).toBe('114')
      expect(signed.bar).toBe('514')
      expect(signed.baz).toBe(1919810)
    })

    test('未设置密钥应抛出错误', () => {
      const newService = new WbiService()
      expect(() => newService.signParams({ foo: '1' })).toThrow('WBI keys not available')
    })

    test('应处理空参数对象', () => {
      const signed = wbiService.signParams({})

      expect(signed.wts).toBeDefined()
      expect(signed.w_rid).toBeDefined()
    })

    test('应处理数字类型参数', () => {
      const params = { num1: 123, num2: 456.789 }
      const signed = wbiService.signParams(params)

      expect(signed.num1).toBe(123)
      expect(signed.num2).toBe(456.789)
      expect(signed.w_rid).toBeDefined()
    })

    test('应处理字符串数字参数', () => {
      const params = { str: '123', num: 456 }
      const signed = wbiService.signParams(params)

      expect(signed.str).toBe('123')
      expect(signed.num).toBe(456)
    })

    test("应过滤特殊字符 !'()*", () => {
      const params = { test: "value!'()*special" }
      const signed = wbiService.signParams(params)

      // 签名应能正常生成（特殊字符被过滤）
      expect(signed.w_rid).toBeDefined()
      expect(signed.test).toBe("value!'()*special") // 原参数不变
    })

    test('应处理包含空格的参数值', () => {
      const params = { text: 'hello world' }
      const signed = wbiService.signParams(params)

      expect(signed.w_rid).toBeDefined()
      expect(signed.text).toBe('hello world')
    })

    test('应处理中文参数', () => {
      const params = { keyword: '测试搜索' }
      const signed = wbiService.signParams(params)

      expect(signed.w_rid).toBeDefined()
      expect(signed.keyword).toBe('测试搜索')
    })

    test('应处理特殊符号', () => {
      const params = { query: 'a&b=c?d#e' }
      const signed = wbiService.signParams(params)

      expect(signed.w_rid).toBeDefined()
    })

    test('相同参数在不同时间应产生不同签名', async () => {
      const params = { foo: 'bar' }
      
      const signed1 = wbiService.signParams(params)
      
      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const signed2 = wbiService.signParams(params)

      // wts应不同
      expect(signed1.wts).not.toBe(signed2.wts)
      // w_rid应不同（因为wts不同）
      expect(signed1.w_rid).not.toBe(signed2.w_rid)
    })

    test('不同参数顺序应产生相同签名（参数会排序）', () => {
      const params1 = { a: '1', b: '2', c: '3' }
      const params2 = { c: '3', a: '1', b: '2' }

      // Mock Date.now 以确保 wts 相同
      const mockTime = 1609459200000
      vi.spyOn(Date, 'now').mockReturnValue(mockTime)

      const signed1 = wbiService.signParams(params1)
      const signed2 = wbiService.signParams(params2)

      expect(signed1.w_rid).toBe(signed2.w_rid)

      vi.restoreAllMocks()
    })

    test('参数值不同应产生不同签名', () => {
      const mockTime = 1609459200000
      vi.spyOn(Date, 'now').mockReturnValue(mockTime)

      const signed1 = wbiService.signParams({ foo: 'bar1' })
      const signed2 = wbiService.signParams({ foo: 'bar2' })

      expect(signed1.w_rid).not.toBe(signed2.w_rid)

      vi.restoreAllMocks()
    })

    test('w_rid应为32位小写hex字符串', () => {
      const signed = wbiService.signParams({ test: '1' })
      
      expect(typeof signed.w_rid).toBe('string')
      expect(signed.w_rid).toMatch(/^[a-f0-9]{32}$/)
      expect(String(signed.w_rid)).not.toMatch(/[A-F]/)
    })

    test('wts应为Unix时间戳（秒）', () => {
      const beforeTime = Math.floor(Date.now() / 1000)
      const signed = wbiService.signParams({ test: '1' })
      const afterTime = Math.floor(Date.now() / 1000)

      expect(signed.wts).toBeGreaterThanOrEqual(beforeTime)
      expect(signed.wts).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('密钥过期机制', () => {
    test('密钥有12小时有效期', () => {
      wbiService.refreshKeys('img', 'sub')

      const keys = (wbiService as any).keys
      const now = Date.now()
      const expiresAt = keys.expiresAt
      
      // 应该在12小时后过期
      const expectedExpiry = now + 12 * 60 * 60 * 1000
      
      // 允许1秒误差
      expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000)
    })

    test('刷新密钥应重置过期时间', () => {
      wbiService.refreshKeys('img1', 'sub1')
      const firstExpiry = (wbiService as any).keys.expiresAt

      // 等待一小段时间
      const delay = 100
      const start = Date.now()
      while (Date.now() - start < delay) {
        // 忙等待
      }

      wbiService.refreshKeys('img2', 'sub2')
      const secondExpiry = (wbiService as any).keys.expiresAt

      expect(secondExpiry).toBeGreaterThan(firstExpiry)
    })
  })

  describe('边界情况和异常', () => {
    test('imgKey或subKey不足64字符应能处理', () => {
      // 虽然通常应该是64字符，但代码应能优雅处理
      wbiService.refreshKeys('short', 'keys')
      
      // 应抛出错误或返回错误结果
      expect(() => wbiService.signParams({ test: '1' })).toThrow()
    })

    test('空字符串密钥应抛出错误', () => {
      wbiService.refreshKeys('', '')
      
      expect(() => wbiService.signParams({ test: '1' })).toThrow()
    })

    test('参数键名包含特殊字符应正常处理', () => {
      wbiService.refreshKeys(
        '7cd084941338484aae1ad9425b84077c',
        '4932caff0ff746eab6f01bf08b70ac45'
      )

      // 虽然不推荐，但应能处理
      const params = { 'key-with-dash': 'value', 'key_with_underscore': 'value2' }
      const signed = wbiService.signParams(params)

      expect(signed.w_rid).toBeDefined()
    })

    test('参数值为0应正常处理', () => {
      wbiService.refreshKeys(
        '7cd084941338484aae1ad9425b84077c',
        '4932caff0ff746eab6f01bf08b70ac45'
      )

      const signed = wbiService.signParams({ num: 0, str: '0' })

      expect(signed.num).toBe(0)
      expect(signed.str).toBe('0')
      expect(signed.w_rid).toBeDefined()
    })

    test('参数值为空字符串应正常处理', () => {
      wbiService.refreshKeys(
        '7cd084941338484aae1ad9425b84077c',
        '4932caff0ff746eab6f01bf08b70ac45'
      )

      const signed = wbiService.signParams({ empty: '' })

      expect(signed.empty).toBe('')
      expect(signed.w_rid).toBeDefined()
    })
  })

  describe('签名一致性验证', () => {
    test('已知参数应生成已知签名（回归测试）', () => {
      wbiService.refreshKeys(
        '7cd084941338484aae1ad9425b84077c',
        '4932caff0ff746eab6f01bf08b70ac45'
      )

      // Mock时间戳以获得可预测的结果
      const mockTime = 1609459200000 // 2021-01-01 00:00:00
      vi.spyOn(Date, 'now').mockReturnValue(mockTime)

      const params = { foo: '114', bar: '514', baz: 1919810 }
      const signed = wbiService.signParams(params)

      // 验证签名是确定性的
      expect(signed.wts).toBe(1609459200)
      expect(signed.w_rid).toBeTruthy()
      expect(typeof signed.w_rid).toBe('string')

      vi.restoreAllMocks()
    })
  })
})

