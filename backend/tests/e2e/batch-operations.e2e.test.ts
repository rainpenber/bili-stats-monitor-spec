// T107: E2E测试 - 批量启停任务
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
 * E2E测试：批量操作任务
 * 
 * 用户故事：
 * 作为管理员，我希望能够同时选择多个任务进行批量操作，
 * 例如批量启动、批量停止，以提高管理效率。
 * 
 * 测试流程：
 * 1. 创建多个任务
 * 2. 批量选择任务
 * 3. 批量停止任务
 * 4. 验证所有任务已停止
 * 5. 批量启动任务
 * 6. 验证所有任务已启动
 */
describe('E2E: Batch Operations', () => {
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

  test.skip('应能批量停止和启动任务', async () => {
    // ========== 第1步: 创建测试账号 ==========
    const account = createTestAccount({
      uid: '111111111',
      nickname: 'Batch Test User',
      status: 'valid',
    })
    await db.insert(accounts).values(account)

    // ========== 第2步: 创建多个任务 ==========
    const taskIds: string[] = []
    
    for (let i = 0; i < 5; i++) {
      const taskData = {
        type: i % 2 === 0 ? 'video' : 'author',
        targetId: i % 2 === 0 ? `BV1batch${i}` : `${100000 + i}`,
        title: `批量测试任务 ${i + 1}`,
        accountId: account.id,
        strategy: {
          mode: i % 2 === 0 ? 'smart_video' : 'smart_author',
        },
        tags: ['batch-test'],
      }

      const createResponse = await post(
        `${BASE_URL}/api/v1/tasks`,
        taskData,
        adminToken
      )

      expect(createResponse.status).toBe(201)
      expect(createResponse.data.data.status).toBe('running')
      taskIds.push(createResponse.data.data.id)
    }

    expect(taskIds.length).toBe(5)

    // ========== 第3步: 验证所有任务都在运行 ==========
    for (const taskId of taskIds) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )
      expect(taskResponse.data.data.status).toBe('running')
    }

    // ========== 第4步: 批量停止任务 ==========
    const batchStopResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'stop',
        taskIds: taskIds,
      },
      adminToken
    )

    expect(batchStopResponse.status).toBe(200)
    expect(batchStopResponse.data.data.success).toBe(5)
    expect(batchStopResponse.data.data.failed).toBe(0)

    // ========== 第5步: 验证所有任务已停止 ==========
    for (const taskId of taskIds) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )
      expect(taskResponse.data.data.status).toBe('stopped')
    }

    // ========== 第6步: 批量启动任务 ==========
    const batchStartResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'start',
        taskIds: taskIds,
      },
      adminToken
    )

    expect(batchStartResponse.status).toBe(200)
    expect(batchStartResponse.data.data.success).toBe(5)
    expect(batchStartResponse.data.data.failed).toBe(0)

    // ========== 第7步: 验证所有任务已启动 ==========
    for (const taskId of taskIds) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )
      expect(taskResponse.data.data.status).toBe('running')
    }

    // ========== 第8步: 验证列表查询 ==========
    const listResponse = await get(
      `${BASE_URL}/api/v1/tasks?tags=batch-test`,
      adminToken
    )

    expect(listResponse.status).toBe(200)
    expect(listResponse.data.data.length).toBe(5)
    expect(listResponse.data.data.every((t: any) => t.status === 'running')).toBe(true)
  })

  test.skip('应处理部分失败的批量操作', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建2个任务
    const validTaskIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const createResponse = await post(
        `${BASE_URL}/api/v1/tasks`,
        {
          type: 'video',
          targetId: `BV1partial${i}`,
          title: `Partial Test ${i}`,
          accountId: account.id,
          strategy: { mode: 'smart_video' },
        },
        adminToken
      )
      validTaskIds.push(createResponse.data.data.id)
    }

    // 添加一些不存在的任务ID
    const allTaskIds = [...validTaskIds, 'non-existent-1', 'non-existent-2']

    // 批量停止（包含不存在的ID）
    const batchResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'stop',
        taskIds: allTaskIds,
      },
      adminToken
    )

    expect(batchResponse.status).toBe(200)
    expect(batchResponse.data.data.success).toBe(2)
    expect(batchResponse.data.data.failed).toBe(2)
    
    // 应该有失败详情
    expect(batchResponse.data.data.failures).toBeInstanceOf(Array)
    expect(batchResponse.data.data.failures.length).toBe(2)

    // 验证有效的任务已停止
    for (const taskId of validTaskIds) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )
      expect(taskResponse.data.data.status).toBe('stopped')
    }
  })

  test.skip('应支持按标签批量选择任务', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建带有不同标签的任务
    const tasksByTag: Record<string, string[]> = {
      'tag-a': [],
      'tag-b': [],
      'tag-both': [],
    }

    // 创建tag-a任务
    for (let i = 0; i < 2; i++) {
      const response = await post(
        `${BASE_URL}/api/v1/tasks`,
        {
          type: 'video',
          targetId: `BV1taga${i}`,
          title: `Tag A ${i}`,
          accountId: account.id,
          strategy: { mode: 'smart_video' },
          tags: ['tag-a'],
        },
        adminToken
      )
      tasksByTag['tag-a'].push(response.data.data.id)
    }

    // 创建tag-b任务
    for (let i = 0; i < 2; i++) {
      const response = await post(
        `${BASE_URL}/api/v1/tasks`,
        {
          type: 'video',
          targetId: `BV1tagb${i}`,
          title: `Tag B ${i}`,
          accountId: account.id,
          strategy: { mode: 'smart_video' },
          tags: ['tag-b'],
        },
        adminToken
      )
      tasksByTag['tag-b'].push(response.data.data.id)
    }

    // 创建同时有两个标签的任务
    const bothTagsResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      {
        type: 'video',
        targetId: 'BV1both',
        title: 'Both Tags',
        accountId: account.id,
        strategy: { mode: 'smart_video' },
        tags: ['tag-a', 'tag-b'],
      },
      adminToken
    )
    tasksByTag['tag-both'].push(bothTagsResponse.data.data.id)

    // 按tag-a筛选并批量停止
    const tagAResponse = await get(
      `${BASE_URL}/api/v1/tasks?tags=tag-a`,
      adminToken
    )

    expect(tagAResponse.status).toBe(200)
    expect(tagAResponse.data.data.length).toBe(3) // 2个tag-a + 1个both

    const tagATaskIds = tagAResponse.data.data.map((t: any) => t.id)
    
    const batchStopResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'stop',
        taskIds: tagATaskIds,
      },
      adminToken
    )

    expect(batchStopResponse.data.data.success).toBe(3)

    // 验证tag-b的任务仍在运行
    for (const taskId of tasksByTag['tag-b']) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )
      expect(taskResponse.data.data.status).toBe('running')
    }
  })

  test.skip('应支持批量删除任务', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建3个任务
    const taskIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const response = await post(
        `${BASE_URL}/api/v1/tasks`,
        {
          type: 'video',
          targetId: `BV1delete${i}`,
          title: `To Delete ${i}`,
          accountId: account.id,
          strategy: { mode: 'smart_video' },
        },
        adminToken
      )
      taskIds.push(response.data.data.id)
    }

    // 批量删除
    const batchDeleteResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'delete',
        taskIds: taskIds,
      },
      adminToken
    )

    expect(batchDeleteResponse.status).toBe(200)
    expect(batchDeleteResponse.data.data.success).toBe(3)

    // 验证任务已删除或停止
    for (const taskId of taskIds) {
      const taskResponse = await get(
        `${BASE_URL}/api/v1/tasks/${taskId}`,
        adminToken
      )

      // 任务应该404或状态为stopped
      expect([404, 200]).toContain(taskResponse.status)
      if (taskResponse.status === 200) {
        expect(taskResponse.data.data.status).toBe('stopped')
      }
    }
  })

  test.skip('应验证批量操作权限', async () => {
    // 创建viewer用户
    const { token: viewerToken } = await createAuthenticatedUser(
      db,
      BASE_URL,
      'viewer'
    )

    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建任务
    const taskData = {
      type: 'video',
      targetId: 'BV1perm',
      title: 'Permission Test',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )
    const taskId = createResponse.data.data.id

    // viewer尝试批量停止
    const batchResponse = await post(
      `${BASE_URL}/api/v1/tasks/batch`,
      {
        action: 'stop',
        taskIds: [taskId],
      },
      viewerToken
    )

    // 应该被拒绝或只能操作自己的任务
    if (batchResponse.status === 403) {
      expect(batchResponse.data.error).toContain('permission')
    } else if (batchResponse.status === 200) {
      // 如果允许，应该有适当的权限过滤
      expect(batchResponse.data.data.success).toBeLessThanOrEqual(1)
    }
  })
})

