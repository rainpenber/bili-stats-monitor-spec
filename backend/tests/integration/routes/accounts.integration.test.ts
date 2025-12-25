// T072-T077: Accounts模块集成测试
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'bun'
import {
  setupTestDatabase,
  teardownTestDatabase,
  post,
  get,
  createTestAccount,
} from '../helpers/test-helpers'
import { createAuthenticatedUser } from '../helpers/auth-helper'
import type { DrizzleInstance } from '../../../src/db'
import { accounts } from '../../../src/db/schema'

describe('Accounts API Integration Tests', () => {
  let db: DrizzleInstance
  let server: Server
  let token: string
  const BASE_URL = 'http://localhost:3000'

  beforeAll(async () => {
    db = await setupTestDatabase()
    // TODO: 启动测试服务器
    const { token: authToken } = await createAuthenticatedUser(db, BASE_URL)
    token = authToken
  })

  afterAll(async () => {
    // TODO: 停止测试服务器
    await teardownTestDatabase(db)
  })

  beforeEach(async () => {
    await db.delete(accounts)
  })

  describe('GET /api/v1/accounts', () => {
    test.skip('应返回账号列表', async () => {
      // 创建测试账号
      const account1 = createTestAccount()
      const account2 = createTestAccount({ status: 'invalid' })
      await db.insert(accounts).values([account1, account2])

      const response = await get(`${BASE_URL}/api/v1/accounts`, token)

      expect(response.status).toBe(200)
      expect(response.data.data).toBeInstanceOf(Array)
      expect(response.data.data.length).toBe(2)
    })

    test.skip('应支持分页', async () => {
      // 创建10个账号
      const accountList = Array.from({ length: 10 }, () => createTestAccount())
      await db.insert(accounts).values(accountList)

      const response = await get(
        `${BASE_URL}/api/v1/accounts?page=1&pageSize=5`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.length).toBe(5)
      expect(response.data.pagination).toEqual({
        page: 1,
        pageSize: 5,
        total: 10,
      })
    })

    test.skip('应支持状态筛选', async () => {
      const validAccount = createTestAccount({ status: 'valid' })
      const invalidAccount = createTestAccount({ status: 'invalid' })
      await db.insert(accounts).values([validAccount, invalidAccount])

      const response = await get(
        `${BASE_URL}/api/v1/accounts?status=valid`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.every((a: any) => a.status === 'valid')).toBe(true)
    })

    test.skip('应要求认证', async () => {
      const response = await get(`${BASE_URL}/api/v1/accounts`)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/v1/accounts/default', () => {
    test.skip('应返回默认账号', async () => {
      const defaultAccount = createTestAccount({ isDefault: true })
      await db.insert(accounts).values(defaultAccount)

      const response = await get(`${BASE_URL}/api/v1/accounts/default`, token)

      expect(response.status).toBe(200)
      expect(response.data.data.id).toBe(defaultAccount.id)
      expect(response.data.data.isDefault).toBe(true)
    })

    test.skip('应返回404当没有默认账号', async () => {
      const response = await get(`${BASE_URL}/api/v1/accounts/default`, token)

      expect(response.status).toBe(404)
      expect(response.data.error).toContain('No default account')
    })
  })

  describe('POST /api/v1/accounts/default', () => {
    test.skip('应设置默认账号', async () => {
      const account = createTestAccount()
      await db.insert(accounts).values(account)

      const response = await post(
        `${BASE_URL}/api/v1/accounts/default`,
        { accountId: account.id },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.isDefault).toBe(true)
    })

    test.skip('应取消旧的默认账号', async () => {
      const oldDefault = createTestAccount({ isDefault: true })
      const newDefault = createTestAccount()
      await db.insert(accounts).values([oldDefault, newDefault])

      await post(
        `${BASE_URL}/api/v1/accounts/default`,
        { accountId: newDefault.id },
        token
      )

      const response = await get(`${BASE_URL}/api/v1/accounts/default`, token)
      expect(response.data.data.id).toBe(newDefault.id)
    })
  })

  describe('POST /api/v1/accounts/cookie', () => {
    test.skip('应通过Cookie绑定账号', async () => {
      const cookieData = {
        sessdata: 'test_sessdata_value',
        biliJct: 'test_bili_jct',
      }

      const response = await post(
        `${BASE_URL}/api/v1/accounts/cookie`,
        cookieData,
        token
      )

      expect(response.status).toBe(201)
      expect(response.data.data.id).toBeTruthy()
      expect(response.data.data.bindMethod).toBe('cookie')
      expect(response.data.data.status).toBe('valid')
    })

    test.skip('应验证Cookie格式', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/accounts/cookie`,
        { sessdata: 'invalid' },
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('bili_jct')
    })

    test.skip('应拒绝过期的Cookie', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/accounts/cookie`,
        {
          sessdata: 'expired_sessdata',
          biliJct: 'expired_jct',
        },
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('invalid')
    })
  })

  describe('POST /api/v1/accounts/qrcode', () => {
    test.skip('应生成二维码登录', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/accounts/qrcode`,
        {},
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.qrcodeKey).toBeTruthy()
      expect(response.data.data.qrcodeUrl).toMatch(/^https?:\/\//)
    })
  })

  describe('GET /api/v1/accounts/qrcode/status', () => {
    test.skip('应查询二维码扫描状态', async () => {
      // 先生成二维码
      const qrcodeRes = await post(
        `${BASE_URL}/api/v1/accounts/qrcode`,
        {},
        token
      )
      const qrcodeKey = qrcodeRes.data.data.qrcodeKey

      // 查询状态
      const response = await get(
        `${BASE_URL}/api/v1/accounts/qrcode/status?key=${qrcodeKey}`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.status).toMatch(/pending|scanned|confirmed|expired/)
    })

    test.skip('应在扫码成功后返回账号信息', async () => {
      const qrcodeKey = 'test_confirmed_key'

      const response = await get(
        `${BASE_URL}/api/v1/accounts/qrcode/status?key=${qrcodeKey}`,
        token
      )

      if (response.data.data.status === 'confirmed') {
        expect(response.data.data.account).toBeTruthy()
        expect(response.data.data.account.uid).toBeTruthy()
      }
    })
  })

  describe('POST /api/v1/accounts/:id/action', () => {
    test.skip('应验证账号（action=validate）', async () => {
      const account = createTestAccount({ status: 'unknown' })
      await db.insert(accounts).values(account)

      const response = await post(
        `${BASE_URL}/api/v1/accounts/${account.id}/action`,
        { action: 'validate' },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.status).toMatch(/valid|invalid/)
    })

    test.skip('应解绑账号（action=unbind）', async () => {
      const account = createTestAccount()
      await db.insert(accounts).values(account)

      const response = await post(
        `${BASE_URL}/api/v1/accounts/${account.id}/action`,
        { action: 'unbind' },
        token
      )

      expect(response.status).toBe(200)

      // 验证账号已删除或标记为解绑
      const getRes = await get(`${BASE_URL}/api/v1/accounts`, token)
      const found = getRes.data.data.find((a: any) => a.id === account.id)
      expect(found).toBeFalsy()
    })

    test.skip('应拒绝无效的action', async () => {
      const account = createTestAccount()
      await db.insert(accounts).values(account)

      const response = await post(
        `${BASE_URL}/api/v1/accounts/${account.id}/action`,
        { action: 'invalid_action' },
        token
      )

      expect(response.status).toBe(400)
    })

    test.skip('应返回404当账号不存在', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/accounts/non-existent/action`,
        { action: 'validate' },
        token
      )

      expect(response.status).toBe(404)
    })
  })
})

