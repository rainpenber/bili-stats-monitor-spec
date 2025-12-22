import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createDb } from '../../src/db'
import { getDbConfig } from '../../src/config/database'
import { loadEnv } from '../../src/config/env'
import { AccountService } from '../../src/services/account'
import { accounts } from '../../src/db/schema'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'

describe('AccountService Integration', () => {
  let db: ReturnType<typeof createDb> | null = null
  let service: AccountService | null = null

  beforeEach(async () => {
    // 设置测试环境变量
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long'
    process.env.ENCRYPT_KEY = 'test-encrypt-key-minimum-32-characters-long'
    process.env.DB_TYPE = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'

    // 创建测试数据库
    const env = loadEnv()
    const dbConfig = getDbConfig(env)
    if (dbConfig.type === 'postgres') {
      return // 跳过 PostgreSQL 测试
    }
    db = createDb(dbConfig)
    service = new AccountService(db)
  })

  afterEach(async () => {
    if (db) {
      // 清理测试数据
      await db.delete(accounts)
    }
  })

  describe('listAccounts', () => {
    test('返回账号列表（不包含敏感信息）', async () => {
      if (!db) return

      // 插入测试账号
      const accountId = nanoid()
      await db.insert(accounts).values({
        id: accountId,
        uid: '12345',
        nickname: 'Test User',
        sessdata: 'encrypted-sessdata',
        biliJct: 'encrypted-bili-jct',
        bindMethod: 'cookie',
        status: 'valid',
        lastFailures: 0,
        boundAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const accountList = await service.listAccounts()

      expect(accountList).toHaveLength(1)
      expect(accountList[0].id).toBe(accountId)
      expect(accountList[0].uid).toBe('12345')
      expect(accountList[0].nickname).toBe('Test User')
      // 确保不返回敏感信息
      expect((accountList[0] as any).sessdata).toBeUndefined()
      expect((accountList[0] as any).biliJct).toBeUndefined()
    })

    test('返回空列表', async () => {
      if (!service) return
      const accountList = await service.listAccounts()
      expect(accountList).toHaveLength(0)
    })
  })

  describe('deleteAccount', () => {
    test('删除账号', async () => {
      if (!db || !service) return

      // 插入测试账号
      const accountId = nanoid()
      await db.insert(accounts).values({
        id: accountId,
        uid: '12345',
        nickname: 'Test User',
        sessdata: 'encrypted-sessdata',
        biliJct: 'encrypted-bili-jct',
        bindMethod: 'cookie',
        status: 'valid',
        lastFailures: 0,
        boundAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.deleteAccount(accountId)

      const result = await db.select().from(accounts).where(eq(accounts.id, accountId))
      expect(result).toHaveLength(0)
    })
  })

  describe('getDefaultAccount', () => {
    test('返回第一个有效账号', async () => {
      if (!db || !service) return

      // 插入多个测试账号
      const accountId1 = nanoid()
      const accountId2 = nanoid()

      await db.insert(accounts).values([
        {
          id: accountId1,
          uid: '12345',
          nickname: 'User 1',
          sessdata: 'encrypted-sessdata-1',
          biliJct: 'encrypted-bili-jct-1',
          bindMethod: 'cookie',
          status: 'valid',
          lastFailures: 0,
          boundAt: new Date(),
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date(),
        },
        {
          id: accountId2,
          uid: '67890',
          nickname: 'User 2',
          sessdata: 'encrypted-sessdata-2',
          biliJct: 'encrypted-bili-jct-2',
          bindMethod: 'cookie',
          status: 'valid',
          lastFailures: 0,
          boundAt: new Date(),
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date(),
        },
      ])

      const defaultAccount = await service.getDefaultAccount()

      expect(defaultAccount).not.toBeNull()
      expect(defaultAccount?.id).toBe(accountId1)
      expect(defaultAccount?.uid).toBe('12345')
      expect(defaultAccount?.nickname).toBe('User 1')
    })

    test('无有效账号时返回 null', async () => {
      if (!db || !service) return

      // 插入一个无效账号
      const accountId = nanoid()
      await db.insert(accounts).values({
        id: accountId,
        uid: '12345',
        nickname: 'Invalid User',
        sessdata: 'encrypted-sessdata',
        biliJct: 'encrypted-bili-jct',
        bindMethod: 'cookie',
        status: 'expired',
        lastFailures: 10,
        boundAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const defaultAccount = await service.getDefaultAccount()
      expect(defaultAccount).toBeNull()
    })
  })

  describe('findAccountById', () => {
    test('查找存在的账号', async () => {
      if (!db || !service) return

      const accountId = nanoid()
      await db.insert(accounts).values({
        id: accountId,
        uid: '12345',
        nickname: 'Test User',
        sessdata: 'encrypted-sessdata',
        biliJct: 'encrypted-bili-jct',
        bindMethod: 'cookie',
        status: 'valid',
        lastFailures: 0,
        boundAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const account = await service.findAccountById(accountId)

      expect(account).not.toBeNull()
      expect(account?.id).toBe(accountId)
      expect(account?.uid).toBe('12345')
    })

    test('查找不存在的账号', async () => {
      if (!service) return
      const account = await service.findAccountById('non-existent-id')
      expect(account).toBeNull()
    })
  })
})

