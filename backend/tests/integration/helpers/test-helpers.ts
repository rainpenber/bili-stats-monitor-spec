// T067: 集成测试通用辅助函数
import type { Server } from 'bun'
import type { DrizzleInstance } from '../../../src/db'
import { createDb } from '../../../src/db'
import { createTestDb, migrateDb, cleanupDb } from '../../helpers/test-db'

/**
 * 测试上下文
 */
export interface TestContext {
  db: DrizzleInstance
  server?: Server
  baseUrl: string
}

/**
 * 创建测试数据库
 */
export async function setupTestDatabase(): Promise<DrizzleInstance> {
  const db = createTestDb()
  await migrateDb(db)
  return db
}

/**
 * 清理测试数据库
 */
export async function teardownTestDatabase(db: DrizzleInstance): Promise<void> {
  await cleanupDb(db)
}

/**
 * HTTP请求辅助函数
 */
export async function request(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options: {
    headers?: Record<string, string>
    body?: any
    token?: string
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  if (options.body && (method === 'POST' || method === 'PUT')) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, fetchOptions)
  const text = await response.text()

  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  }
}

/**
 * GET 请求
 */
export async function get(url: string, token?: string) {
  return request('GET', url, { token })
}

/**
 * POST 请求
 */
export async function post(url: string, body: any, token?: string) {
  return request('POST', url, { body, token })
}

/**
 * PUT 请求
 */
export async function put(url: string, body: any, token?: string) {
  return request('PUT', url, { body, token })
}

/**
 * DELETE 请求
 */
export async function del(url: string, token?: string) {
  return request('DELETE', url, { token })
}

/**
 * 等待指定时间（用于异步操作）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 断言响应成功
 */
export function expectSuccess(response: Awaited<ReturnType<typeof request>>) {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Expected success status, got ${response.status}: ${JSON.stringify(response.data)}`)
  }
  return response
}

/**
 * 断言响应失败
 */
export function expectError(
  response: Awaited<ReturnType<typeof request>>,
  expectedStatus: number
) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(response.data)}`
    )
  }
  return response
}

/**
 * 创建测试账号数据
 */
export function createTestAccount(overrides: Partial<any> = {}) {
  return {
    id: `test-acc-${randomString(8)}`,
    uid: `${Math.floor(Math.random() * 1000000)}`,
    nickname: `Test User ${randomString(4)}`,
    sessdata: `test_sessdata_${randomString(16)}`,
    biliJct: `test_jct_${randomString(8)}`,
    bindMethod: 'cookie' as const,
    status: 'valid' as const,
    lastFailures: 0,
    boundAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * 创建测试任务数据
 */
export function createTestTask(overrides: Partial<any> = {}) {
  return {
    type: 'video' as const,
    targetId: `BV${randomString(10)}`,
    title: `Test Task ${randomString(4)}`,
    strategy: { mode: 'smart_video' },
    status: 'running' as const,
    tags: [],
    nextRunAt: new Date(),
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    ...overrides,
  }
}

/**
 * 验证API响应格式
 */
export function validateApiResponse(
  data: any,
  expectedFields: string[]
): void {
  for (const field of expectedFields) {
    if (!(field in data)) {
      throw new Error(`Missing field in API response: ${field}`)
    }
  }
}

