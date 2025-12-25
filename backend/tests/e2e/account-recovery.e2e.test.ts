// T106: E2E测试 - 账号过期后重新绑定并恢复任务
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'bun'
import {
  setupTestDatabase,
  teardownTestDatabase,
  post,
  get,
  createTestAccount,
  sleep,
} from '../integration/helpers/test-helpers'
import { createAuthenticatedUser } from '../integration/helpers/auth-helper'
import type { DrizzleInstance } from '../../src/db'
import { accounts, tasks } from '../../src/db/schema'

/**
 * E2E测试：账号过期后的恢复流程
 * 
 * 用户故事：
 * 当Bilibili账号cookie过期时，系统应自动暂停相关任务。
 * 用户重新绑定账号后，任务应能恢复运行并继续采集数据。
 * 
 * 测试流程：
 * 1. 创建任务并绑定账号
 * 2. 模拟账号过期（设置账号状态为invalid）
 * 3. 验证任务自动暂停
 * 4. 重新绑定有效账号
 * 5. 恢复任务运行
 * 6. 验证数据采集正常
 */
describe('E2E: Account Recovery', () => {
  let db: DrizzleInstance
  let server: Server
  let adminToken: string
  const BASE_URL = 'http://localhost:3000'

  beforeAll(async () => {
    db = await setupTestDatabase()
    // TODO: 启动测试服务器
    // server = await startTestServer(db)

    const { token } = await createAuthenticatedUser(db, BASE_URL, 'admin')
    adminToken = token
  })

  afterAll(async () => {
    // TODO: 停止测试服务器
    await teardownTestDatabase(db)
  })

  test.skip('应在账号过期后暂停任务并支持恢复', async () => {
    // ========== 第1步: 创建账号和任务 ==========
    const account = createTestAccount({
      uid: '987654321',
      nickname: 'Recovery Test User',
      status: 'valid',
      lastFailures: 0,
    })
    await db.insert(accounts).values(account)

    const taskData = {
      type: 'video',
      targetId: 'BV1recovery123',
      title: '账号恢复测试视频',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    expect(createResponse.status).toBe(201)
    const taskId = createResponse.data.data.id
    expect(createResponse.data.data.status).toBe('running')

    // ========== 第2步: 模拟账号过期 ==========
    // 更新账号状态为invalid
    const expireResponse = await post(
      `${BASE_URL}/api/v1/accounts/${account.id}/action`,
      { action: 'expire' }, // 假设有expire操作
      adminToken
    )

    // 或者直接更新数据库
    await db
      .update(accounts)
      .set({ status: 'invalid', lastFailures: 3 })
      .where({ id: account.id })

    // ========== 第3步: 触发数据采集（会失败） ==========
    // 在实际场景中，调度器会尝试采集并发现账号失效
    // 这里我们模拟这个过程
    const collectResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}/collect`,
      {},
      adminToken
    )

    // 采集应该失败，因为账号无效
    expect([400, 500, 503]).toContain(collectResponse.status)

    // ========== 第4步: 验证任务自动暂停 ==========
    // 等待一小段时间让系统处理
    await sleep(100)

    const taskStatusResponse = await get(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      adminToken
    )

    expect(taskStatusResponse.status).toBe(200)
    // 任务应该被暂停或标记为失败
    expect(['paused', 'error', 'stopped']).toContain(
      taskStatusResponse.data.data.status
    )

    // ========== 第5步: 重新绑定有效账号 ==========
    const newAccountData = {
      sessdata: 'new_valid_sessdata_value',
      biliJct: 'new_valid_jct_value',
    }

    const rebindResponse = await post(
      `${BASE_URL}/api/v1/accounts/cookie`,
      newAccountData,
      adminToken
    )

    expect(rebindResponse.status).toBe(201)
    const newAccountId = rebindResponse.data.data.id
    expect(rebindResponse.data.data.status).toBe('valid')

    // ========== 第6步: 将任务关联到新账号 ==========
    const updateTaskResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      { accountId: newAccountId },
      adminToken
    )

    expect(updateTaskResponse.status).toBe(200)
    expect(updateTaskResponse.data.data.accountId).toBe(newAccountId)

    // ========== 第7步: 恢复任务运行 ==========
    const resumeResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      { status: 'running' },
      adminToken
    )

    expect(resumeResponse.status).toBe(200)
    expect(resumeResponse.data.data.status).toBe('running')

    // ========== 第8步: 验证任务可以正常采集 ==========
    const finalCollectResponse = await post(
      `${BASE_URL}/api/v1/tasks/${taskId}/collect`,
      {},
      adminToken
    )

    // 现在采集应该成功
    expect(finalCollectResponse.status).toBe(200)

    // ========== 第9步: 验证数据已保存 ==========
    const metricsResponse = await get(
      `${BASE_URL}/api/v1/videos/BV1recovery123/metrics`,
      adminToken
    )

    expect(metricsResponse.status).toBe(200)
    expect(metricsResponse.data.data).toBeInstanceOf(Array)
    // 应该有至少一条数据
    expect(metricsResponse.data.data.length).toBeGreaterThan(0)
  })

  test.skip('应在账号验证失败时显示错误信息', async () => {
    const account = createTestAccount({ status: 'invalid' })
    await db.insert(accounts).values(account)

    const taskData = {
      type: 'video',
      targetId: 'BV1test123',
      title: 'Test',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    // 尝试创建任务
    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    // 应该警告或拒绝使用无效账号
    if (createResponse.status === 201) {
      // 如果允许创建，任务应该处于paused或error状态
      expect(['paused', 'error']).toContain(
        createResponse.data.data.status
      )
    } else {
      // 或者直接拒绝创建
      expect(createResponse.status).toBe(400)
      expect(createResponse.data.error).toContain('invalid')
    }
  })

  test.skip('应支持账号验证操作', async () => {
    const account = createTestAccount({ status: 'unknown' })
    await db.insert(accounts).values(account)

    // 验证账号
    const validateResponse = await post(
      `${BASE_URL}/api/v1/accounts/${account.id}/action`,
      { action: 'validate' },
      adminToken
    )

    expect(validateResponse.status).toBe(200)
    expect(validateResponse.data.data.status).toMatch(/valid|invalid/)

    // 如果验证失败，应该有错误信息
    if (validateResponse.data.data.status === 'invalid') {
      expect(validateResponse.data.data.error).toBeTruthy()
    }
  })

  test.skip('应跟踪账号失败次数', async () => {
    const account = createTestAccount({
      status: 'valid',
      lastFailures: 0,
    })
    await db.insert(accounts).values(account)

    // 模拟多次失败
    for (let i = 0; i < 3; i++) {
      await post(
        `${BASE_URL}/api/v1/accounts/${account.id}/action`,
        { action: 'record_failure' },
        adminToken
      )
    }

    // 检查账号状态
    const accountResponse = await get(
      `${BASE_URL}/api/v1/accounts/${account.id}`,
      adminToken
    )

    expect(accountResponse.status).toBe(200)
    expect(accountResponse.data.data.lastFailures).toBeGreaterThanOrEqual(3)
    
    // 连续失败应该导致账号被标记为invalid
    if (accountResponse.data.data.lastFailures >= 3) {
      expect(accountResponse.data.data.status).toBe('invalid')
    }
  })

  test.skip('应在账号恢复后重置失败计数', async () => {
    const account = createTestAccount({
      status: 'invalid',
      lastFailures: 5,
    })
    await db.insert(accounts).values(account)

    // 重新绑定账号
    const rebindResponse = await post(
      `${BASE_URL}/api/v1/accounts/${account.id}/action`,
      {
        action: 'rebind',
        sessdata: 'new_sessdata',
        biliJct: 'new_jct',
      },
      adminToken
    )

    expect(rebindResponse.status).toBe(200)
    expect(rebindResponse.data.data.status).toBe('valid')
    expect(rebindResponse.data.data.lastFailures).toBe(0)
  })
})

