// T068: 认证 token 生成工具
import { sign } from 'jsonwebtoken'
import type { DrizzleInstance } from '../../../src/db'
import { users } from '../../../src/db/schema'
import { hashPassword } from '../../../src/utils/crypto'

/**
 * 测试用户信息
 */
export interface TestUser {
  id: string
  username: string
  password: string
  role: 'admin' | 'viewer'
}

/**
 * JWT密钥（测试用）
 */
const TEST_JWT_SECRET = 'test-jwt-secret-key-for-integration-tests'

/**
 * 生成测试JWT token
 */
export function generateTestToken(user: { id: string; username: string; role: string }): string {
  return sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  )
}

/**
 * 创建测试用户（数据库）
 */
export async function createTestUser(
  db: DrizzleInstance,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  const user: TestUser = {
    id: userData.id || `test-user-${Date.now()}`,
    username: userData.username || `testuser${Date.now()}`,
    password: userData.password || 'Test1234!',
    role: userData.role || 'viewer',
  }

  const passwordHash = await hashPassword(user.password)

  await db.insert(users).values({
    id: user.id,
    username: user.username,
    passwordHash,
    role: user.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return user
}

/**
 * 创建管理员用户
 */
export async function createAdminUser(db: DrizzleInstance): Promise<TestUser> {
  return createTestUser(db, {
    username: `admin${Date.now()}`,
    password: 'Admin1234!',
    role: 'admin',
  })
}

/**
 * 创建普通用户
 */
export async function createViewerUser(db: DrizzleInstance): Promise<TestUser> {
  return createTestUser(db, {
    username: `viewer${Date.now()}`,
    password: 'Viewer1234!',
    role: 'viewer',
  })
}

/**
 * 登录并获取token
 */
export async function loginAndGetToken(
  baseUrl: string,
  username: string,
  password: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  return data.token || data.data?.token
}

/**
 * 快速创建用户并获取token
 */
export async function createAuthenticatedUser(
  db: DrizzleInstance,
  baseUrl: string,
  role: 'admin' | 'viewer' = 'viewer'
): Promise<{ user: TestUser; token: string }> {
  const user = role === 'admin' 
    ? await createAdminUser(db)
    : await createViewerUser(db)

  const token = generateTestToken(user)

  return { user, token }
}

/**
 * 验证token是否有效（简单验证）
 */
export function isValidToken(token: string): boolean {
  return token && token.length > 0 && token.split('.').length === 3
}

