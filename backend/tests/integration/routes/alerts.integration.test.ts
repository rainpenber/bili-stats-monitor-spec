// T094-T095: Alerts模块集成测试
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'bun'
import { setupTestDatabase, teardownTestDatabase, get, post } from '../helpers/test-helpers'
import { createAuthenticatedUser } from '../helpers/auth-helper'
import type { DrizzleInstance } from '../../../src/db'
import { alerts } from '../../../src/db/schema'

describe('Alerts API Integration Tests', () => {
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
    await db.delete(alerts)
  })

  describe('GET /api/v1/alerts/authors/:uid', () => {
    test.skip('应返回UP主告警配置', async () => {
      const uid = '123456'

      const response = await get(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data).toMatchObject({
        uid,
        enabled: expect.any(Boolean),
        checkInterval: expect.any(Number),
      })
    })

    test.skip('应返回默认配置当未配置时', async () => {
      const uid = '999999'

      const response = await get(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.enabled).toBe(false)
    })

    test.skip('应要求认证', async () => {
      const response = await get(`${BASE_URL}/api/v1/alerts/authors/123456`)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/v1/alerts/authors/:uid', () => {
    test.skip('应保存UP主告警配置（action=save）', async () => {
      const uid = '123456'
      const alertData = {
        action: 'save',
        enabled: true,
        checkInterval: 300, // 5分钟
        conditions: [
          {
            type: 'new_video',
            notify: true,
          },
          {
            type: 'live_start',
            notify: true,
          },
        ],
        channels: ['channel-id-1'],
      }

      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        alertData,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.enabled).toBe(true)
      expect(response.data.data.checkInterval).toBe(300)
    })

    test.skip('应更新已有配置', async () => {
      const uid = '123456'

      // 先创建配置
      await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        {
          action: 'save',
          enabled: true,
          checkInterval: 300,
          conditions: [],
          channels: [],
        },
        token
      )

      // 更新配置
      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        {
          action: 'save',
          enabled: true,
          checkInterval: 600, // 改为10分钟
          conditions: [],
          channels: [],
        },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.checkInterval).toBe(600)
    })

    test.skip('应禁用告警（action=disable）', async () => {
      const uid = '123456'

      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        { action: 'disable' },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.enabled).toBe(false)
    })

    test.skip('应验证检查间隔', async () => {
      const uid = '123456'

      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        {
          action: 'save',
          enabled: true,
          checkInterval: 10, // 太短，应该失败
          conditions: [],
          channels: [],
        },
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('interval')
    })

    test.skip('应验证条件配置', async () => {
      const uid = '123456'

      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        {
          action: 'save',
          enabled: true,
          checkInterval: 300,
          conditions: [{ type: 'invalid_type' }],
          channels: [],
        },
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('condition')
    })

    test.skip('应验证渠道存在性', async () => {
      const uid = '123456'

      const response = await post(
        `${BASE_URL}/api/v1/alerts/authors/${uid}`,
        {
          action: 'save',
          enabled: true,
          checkInterval: 300,
          conditions: [],
          channels: ['non-existent-channel'],
        },
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('channel')
    })
  })
})

