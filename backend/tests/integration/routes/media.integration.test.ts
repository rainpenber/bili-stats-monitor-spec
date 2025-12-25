// T086-T088: Media模块集成测试
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'bun'
import { setupTestDatabase, teardownTestDatabase, get, post } from '../helpers/test-helpers'
import { createAuthenticatedUser } from '../helpers/auth-helper'
import type { DrizzleInstance } from '../../../src/db'

describe('Media API Integration Tests', () => {
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

  describe('GET /api/v1/media/videos/:bv/cover', () => {
    test.skip('应返回视频封面URL', async () => {
      const bv = 'BV1xx411c7m4'

      const response = await get(
        `${BASE_URL}/api/v1/media/videos/${bv}/cover`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.coverUrl).toMatch(/^https?:\/\//)
    })

    test.skip('应支持多种尺寸', async () => {
      const bv = 'BV1xx411c7m4'

      const response = await get(
        `${BASE_URL}/api/v1/media/videos/${bv}/cover?size=large`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.size).toBe('large')
      expect(response.data.data.coverUrl).toBeTruthy()
    })

    test.skip('应缓存封面URL', async () => {
      const bv = 'BV1xx411c7m4'

      const response = await get(
        `${BASE_URL}/api/v1/media/videos/${bv}/cover`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBeTruthy()
    })

    test.skip('应返回404当视频不存在', async () => {
      const response = await get(
        `${BASE_URL}/api/v1/media/videos/BVnonexistent/cover`,
        token
      )

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/v1/media/authors/:uid/avatar', () => {
    test.skip('应返回UP主头像URL', async () => {
      const uid = '123456'

      const response = await get(
        `${BASE_URL}/api/v1/media/authors/${uid}/avatar`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.avatarUrl).toMatch(/^https?:\/\//)
    })

    test.skip('应支持多种尺寸', async () => {
      const uid = '123456'

      const response = await get(
        `${BASE_URL}/api/v1/media/authors/${uid}/avatar?size=small`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.size).toBe('small')
    })

    test.skip('应缓存头像URL', async () => {
      const uid = '123456'

      const response = await get(
        `${BASE_URL}/api/v1/media/authors/${uid}/avatar`,
        token
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBeTruthy()
    })

    test.skip('应返回404当UP主不存在', async () => {
      const response = await get(
        `${BASE_URL}/api/v1/media/authors/999999999/avatar`,
        token
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/v1/media/refresh', () => {
    test.skip('应刷新视频封面缓存', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/media/refresh`,
        {
          type: 'video',
          id: 'BV1xx411c7m4',
        },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.refreshed).toBe(true)
    })

    test.skip('应刷新UP主头像缓存', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/media/refresh`,
        {
          type: 'author',
          id: '123456',
        },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.refreshed).toBe(true)
    })

    test.skip('应批量刷新媒体', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/media/refresh`,
        {
          items: [
            { type: 'video', id: 'BV1xx411c7m4' },
            { type: 'author', id: '123456' },
          ],
        },
        token
      )

      expect(response.status).toBe(200)
      expect(response.data.data.success).toBe(2)
    })

    test.skip('应验证必填字段', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/media/refresh`,
        { type: 'video' }, // 缺少id
        token
      )

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('id')
    })

    test.skip('应要求认证', async () => {
      const response = await post(
        `${BASE_URL}/api/v1/media/refresh`,
        { type: 'video', id: 'BV1xx411c7m4' }
      )

      expect(response.status).toBe(401)
    })
  })
})

