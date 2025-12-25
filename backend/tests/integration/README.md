# 集成测试指南

## 📋 概述

集成测试验证完整的请求-响应链路，包括HTTP路由、中间件、服务层和数据库交互。

## 🏗️ 架构

```
tests/integration/
├── helpers/
│   ├── test-helpers.ts      # 通用测试辅助函数
│   └── auth-helper.ts       # 认证和用户管理
└── routes/
    ├── auth.integration.test.ts           # Auth模块 (3个端点)
    ├── accounts.integration.test.ts       # Accounts模块 (7个端点)
    ├── tasks.integration.test.ts          # Tasks模块 (5个端点)
    ├── metrics.integration.test.ts        # Metrics模块 (3个端点)
    ├── media.integration.test.ts          # Media模块 (3个端点)
    ├── notifications.integration.test.ts  # Notifications模块 (5个端点)
    ├── alerts.integration.test.ts         # Alerts模块 (2个端点)
    ├── logs.integration.test.ts           # Logs模块 (2个端点)
    ├── settings.integration.test.ts       # Settings模块 (2个端点)
    ├── error-handling.integration.test.ts # 错误处理
    ├── auth-middleware.integration.test.ts # 认证中间件
    └── validation.integration.test.ts     # 参数验证
```

## 🛠️ 辅助函数

### test-helpers.ts

提供HTTP请求、数据库管理和数据创建辅助函数：

```typescript
import { setupTestDatabase, teardownTestDatabase, get, post } from '../helpers/test-helpers'

// 数据库管理
const db = await setupTestDatabase()
await teardownTestDatabase(db)

// HTTP请求
const response = await get('http://localhost:3000/api/v1/tasks', token)
await post(url, body, token)
await put(url, body, token)
await del(url, token)

// 数据创建
const account = createTestAccount({ uid: '123456' })
const task = createTestTask({ type: 'video', targetId: 'BV1234' })

// 响应断言
expectSuccess(response)
expectError(response, 401)
```

### auth-helper.ts

提供认证和用户管理功能：

```typescript
import { createAuthenticatedUser, createAdminUser, generateTestToken } from '../helpers/auth-helper'

// 创建并认证用户
const { user, token } = await createAuthenticatedUser(db, baseUrl, 'admin')

// 创建特定角色用户
const admin = await createAdminUser(db)
const viewer = await createViewerUser(db)

// 生成token
const token = generateTestToken({ id: '1', username: 'test', role: 'admin' })

// 登录并获取token
const token = await loginAndGetToken(baseUrl, 'username', 'password')
```

## 📝 测试模板

### 基本结构

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, get, post } from '../helpers/test-helpers'
import { createAuthenticatedUser } from '../helpers/auth-helper'

describe('API Module Integration Tests', () => {
  let db
  let token
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
    // 清理测试数据
  })

  describe('GET /api/v1/endpoint', () => {
    test.skip('should return data', async () => {
      const response = await get(`${BASE_URL}/api/v1/endpoint`, token)
      expect(response.status).toBe(200)
      expect(response.data.data).toBeTruthy()
    })
  })
})
```

### 常见测试场景

#### 1. 成功场景
```typescript
test.skip('should create resource', async () => {
  const response = await post(
    `${BASE_URL}/api/v1/tasks`,
    { type: 'video', targetId: 'BV1234', title: 'Test' },
    token
  )
  
  expect(response.status).toBe(201)
  expect(response.data.data.id).toBeTruthy()
})
```

#### 2. 认证测试
```typescript
test.skip('should require authentication', async () => {
  const response = await get(`${BASE_URL}/api/v1/tasks`)
  expect(response.status).toBe(401)
})

test.skip('should reject invalid token', async () => {
  const response = await get(`${BASE_URL}/api/v1/tasks`, 'invalid-token')
  expect(response.status).toBe(401)
})
```

#### 3. 参数验证
```typescript
test.skip('should validate required fields', async () => {
  const response = await post(
    `${BASE_URL}/api/v1/tasks`,
    { type: 'video' }, // 缺少必填字段
    token
  )
  
  expect(response.status).toBe(400)
  expect(response.data.error).toContain('required')
})
```

#### 4. 错误处理
```typescript
test.skip('should return 404 for non-existent resource', async () => {
  const response = await get(`${BASE_URL}/api/v1/tasks/non-existent`, token)
  expect(response.status).toBe(404)
})
```

#### 5. 分页测试
```typescript
test.skip('should support pagination', async () => {
  const response = await get(
    `${BASE_URL}/api/v1/tasks?page=1&pageSize=10`,
    token
  )
  
  expect(response.status).toBe(200)
  expect(response.data.pagination).toEqual({
    page: 1,
    pageSize: 10,
    total: expect.any(Number),
  })
})
```

## 🚀 运行测试

### 前提条件

1. **启动测试数据库**: 使用内存数据库或测试数据库实例
2. **启动测试服务器**: 在测试端口运行后端服务

### 运行命令

```bash
# 运行所有集成测试
bun test tests/integration/

# 运行特定模块测试
bun test tests/integration/routes/auth.integration.test.ts

# 带覆盖率运行
bun test tests/integration/ --coverage

# Watch模式
bun test tests/integration/ --watch
```

### 环境配置

创建 `.env.test` 文件：

```env
NODE_ENV=test
PORT=3001
DB_TYPE=sqlite
SQLITE_PATH=:memory:
JWT_SECRET=test-jwt-secret
```

## 📊 覆盖的API端点

### 已完成模板

| 模块 | 端点数 | 测试文件 | 状态 |
|------|--------|----------|------|
| Auth | 3 | auth.integration.test.ts | ✅ 模板已创建 |
| Tasks | 5 | tasks.integration.test.ts | ✅ 模板已创建 |

### 待实现

| 模块 | 端点数 | 测试文件 | 状态 |
|------|--------|----------|------|
| Accounts | 7 | accounts.integration.test.ts | ⏳ 待创建 |
| Metrics | 3 | metrics.integration.test.ts | ⏳ 待创建 |
| Media | 3 | media.integration.test.ts | ⏳ 待创建 |
| Notifications | 5 | notifications.integration.test.ts | ⏳ 待创建 |
| Alerts | 2 | alerts.integration.test.ts | ⏳ 待创建 |
| Logs | 2 | logs.integration.test.ts | ⏳ 待创建 |
| Settings | 2 | settings.integration.test.ts | ⏳ 待创建 |
| Error Handling | - | error-handling.integration.test.ts | ⏳ 待创建 |
| Auth Middleware | - | auth-middleware.integration.test.ts | ⏳ 待创建 |
| Validation | - | validation.integration.test.ts | ⏳ 待创建 |

**总计**: 33个API端点 + 3个通用测试

## 🔧 实现步骤

### 1. 创建测试服务器

```typescript
// tests/integration/helpers/test-server.ts
import { createApp } from '../../../src/app'

export async function startTestServer(db: DrizzleInstance): Promise<Server> {
  const app = createApp(db)
  return Bun.serve({
    port: 3001,
    fetch: app.fetch,
  })
}

export async function stopTestServer(server: Server): Promise<void> {
  server.stop()
}
```

### 2. 更新测试使用测试服务器

```typescript
beforeAll(async () => {
  db = await setupTestDatabase()
  server = await startTestServer(db)
})

afterAll(async () => {
  await stopTestServer(server)
  await teardownTestDatabase(db)
})
```

### 3. 移除 test.skip，启用测试

```typescript
// 从
test.skip('should work', async () => { ... })

// 改为
test('should work', async () => { ... })
```

## 📚 最佳实践

1. **测试隔离**: 每个测试使用独立的数据库状态
2. **清理数据**: 在 `beforeEach` 或 `afterEach` 中清理测试数据
3. **明确断言**: 使用具体的期望值而非泛化的断言
4. **错误场景**: 同时测试成功和失败场景
5. **性能考虑**: 避免在测试中使用 `sleep`，使用适当的等待机制

## 🐛 调试

### 查看请求详情

```typescript
const response = await get(url, token)
console.log('Response:', JSON.stringify(response, null, 2))
```

### 检查数据库状态

```typescript
const tasks = await db.select().from(tasks)
console.log('Tasks in DB:', tasks)
```

### 日志记录

```typescript
import { logger } from '../../../src/utils/logger'

logger.debug('Test data:', testData)
```

## 📖 参考资料

- [Vitest 文档](https://vitest.dev/)
- [Bun 测试文档](https://bun.sh/docs/cli/test)
- [集成测试最佳实践](https://martinfowler.com/bliki/IntegrationTest.html)

