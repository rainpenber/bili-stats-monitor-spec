// T105: E2E测试 - 管理员登录并创建视频监控任务
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'bun'
import {
  setupTestDatabase,
  teardownTestDatabase,
  post,
  get,
  createTestAccount,
} from '../integration/helpers/test-helpers'
import { createAuthenticatedUser } from '../integration/helpers/auth-helper'
import type { DrizzleInstance } from '../../src/db'
import { accounts } from '../../src/db/schema'

/**
 * E2E测试：任务完整生命周期
 * 
 * 用户故事：
 * 作为管理员，我希望能够登录系统、创建视频监控任务、
 * 查看任务运行状态，并在需要时停止任务。
 * 
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建视频监控任务
 * 3. 验证任务状态为"running"
 * 4. 查看任务详情
 * 5. 停止任务
 * 6. 验证任务状态为"stopped"
 */
describe('E2E: Task Lifecycle', () => {
  let db: DrizzleInstance
  let server: Server
  let adminToken: string
  const BASE_URL = 'http://localhost:3000'

  beforeAll(async () => {
    db = await setupTestDatabase()
    // TODO: 启动测试服务器
    // server = await startTestServer(db)

    // 创建管理员用户
    const { token } = await createAuthenticatedUser(db, BASE_URL, 'admin')
    adminToken = token
  })

  afterAll(async () => {
    // TODO: 停止测试服务器
    // if (server) await server.stop()
    await teardownTestDatabase(db)
  })

  test.skip('应完成完整的任务生命周期', async () => {
    // ========== 第1步: 管理员登录 ==========
    // 已在beforeAll中完成，验证token存在
    expect(adminToken).toBeTruthy()
    expect(adminToken.length).toBeGreaterThan(0)

    // ========== 第2步: 创建测试账号 ==========
    const account = createTestAccount({
      uid: '123456789',
      nickname: 'Test User',
      status: 'valid',
    })
    await db.insert(accounts).values(account)

    // ========== 第3步: 创建视频监控任务 ==========
    const taskData = {
      type: 'video',
      targetId: 'BV1xx411c7m4',
      title: 'E2E测试视频',
      accountId: account.id,
      strategy: {
        mode: 'smart_video',
      },
      tags: ['e2e-test'],
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    expect(createResponse.status).toBe(201)
    expect(createResponse.data.data).toMatchObject({
      id: expect.any(String),
      type: 'video',
      targetId: 'BV1xx411c7m4',
      status: 'running', // 新创建的任务应该是running状态
    })

    const taskId = createResponse.data.data.id

    // ========== 第4步: 查看任务详情 ==========
    const detailResponse = await get(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      adminToken
    )

    expect(detailResponse.status).toBe(200)
    expect(detailResponse.data.data).toMatchObject({
      id: taskId,
      type: 'video',
      targetId: 'BV1xx411c7m4',
      title: 'E2E测试视频',
      status: 'running',
      accountId: account.id,
    })

    // ========== 第5步: 验证任务在列表中 ==========
    const listResponse = await get(
      `${BASE_URL}/api/v1/tasks`,
      adminToken
    )

    expect(listResponse.status).toBe(200)
    expect(listResponse.data.data).toBeInstanceOf(Array)
    
    const foundTask = listResponse.data.data.find((t: any) => t.id === taskId)
    expect(foundTask).toBeTruthy()
    expect(foundTask.status).toBe('running')

    // ========== 第6步: 停止任务 ==========
    const stopResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      { status: 'stopped' },
      adminToken
    )

    expect(stopResponse.status).toBe(200)
    expect(stopResponse.data.data.status).toBe('stopped')

    // ========== 第7步: 验证任务已停止 ==========
    const finalDetailResponse = await get(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      adminToken
    )

    expect(finalDetailResponse.status).toBe(200)
    expect(finalDetailResponse.data.data.status).toBe('stopped')

    // ========== 第8步: 验证停止后的任务在列表中的状态 ==========
    const finalListResponse = await get(
      `${BASE_URL}/api/v1/tasks?status=stopped`,
      adminToken
    )

    expect(finalListResponse.status).toBe(200)
    const stoppedTask = finalListResponse.data.data.find((t: any) => t.id === taskId)
    expect(stoppedTask).toBeTruthy()
    expect(stoppedTask.status).toBe('stopped')
  })

  test.skip('应能创建UP主监控任务', async () => {
    // 创建账号
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建UP主任务
    const taskData = {
      type: 'author',
      targetId: '123456',
      title: 'E2E测试UP主',
      accountId: account.id,
      strategy: {
        mode: 'smart_author',
      },
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    expect(createResponse.status).toBe(201)
    expect(createResponse.data.data.type).toBe('author')
    expect(createResponse.data.data.targetId).toBe('123456')
  })

  test.skip('应拒绝创建重复任务', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    const taskData = {
      type: 'video',
      targetId: 'BV1duplicate123',
      title: 'Test',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    // 第一次创建
    const firstResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )
    expect(firstResponse.status).toBe(201)

    // 第二次创建相同任务
    const secondResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    expect(secondResponse.status).toBe(409) // Conflict
    expect(secondResponse.data.error).toContain('already exists')
  })

  test.skip('应能删除任务', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建任务
    const taskData = {
      type: 'video',
      targetId: 'BV1todelete',
      title: 'To Delete',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )
    const taskId = createResponse.data.data.id

    // 删除任务
    const deleteResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      { action: 'delete' },
      adminToken
    )

    expect(deleteResponse.status).toBe(200)

    // 验证任务状态
    const getResponse = await get(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      adminToken
    )

    // 任务应该被软删除（状态为stopped或不可见）
    expect([404, 200]).toContain(getResponse.status)
    if (getResponse.status === 200) {
      expect(getResponse.data.data.status).toBe('stopped')
    }
  })
})

