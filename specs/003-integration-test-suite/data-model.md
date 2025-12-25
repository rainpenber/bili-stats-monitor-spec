# Data Model: 测试数据与测试实体

**Feature**: 前后端集成测试与接口验证  
**Date**: 2025-12-23  
**Related**: [spec.md](./spec.md), [plan.md](./plan.md)

## 概述

本文档定义测试相关的数据模型，包括测试数据结构、Mock 数据模板和测试用例组织方式。这些模型用于：
- 统一测试数据格式
- 简化测试用例编写
- 提高测试可维护性

## 核心测试实体

### 1. TestSuite（测试套件）

测试套件用于组织一组相关的测试用例。

```typescript
interface TestSuite {
  /** 套件唯一标识 */
  id: string
  
  /** 套件名称，如 "Auth API 集成测试" */
  name: string
  
  /** 套件描述 */
  description: string
  
  /** 套件类型 */
  type: 'unit' | 'integration' | 'e2e' | 'contract'
  
  /** 所属模块，如 "accounts", "tasks", "metrics" */
  module: string
  
  /** 测试用例列表 */
  cases: TestCase[]
  
  /** 套件级别的 setup 数据 */
  setupData?: Record<string, any>
  
  /** 预期执行时间（毫秒） */
  estimatedDuration?: number
}
```

**示例**：
```typescript
const authApiTestSuite: TestSuite = {
  id: 'auth-api-integration',
  name: 'Auth API 集成测试',
  description: '测试认证相关的所有 API 端点',
  type: 'integration',
  module: 'auth',
  cases: [
    // ... test cases
  ],
  setupData: {
    testUser: {
      username: 'test-admin',
      password: 'Test@1234',
      role: 'admin'
    }
  },
  estimatedDuration: 5000 // 5 秒
}
```

---

### 2. TestCase（测试用例）

单个测试用例，遵循 Given-When-Then 模式。

```typescript
interface TestCase {
  /** 用例唯一标识 */
  id: string
  
  /** 用例名称（描述预期行为） */
  name: string
  
  /** 用例优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low'
  
  /** Given：初始状态/前置条件 */
  given: TestPrecondition
  
  /** When：执行的操作 */
  when: TestAction
  
  /** Then：预期结果 */
  then: TestAssertion
  
  /** 标签（用于筛选） */
  tags?: string[]
  
  /** 是否跳过此测试 */
  skip?: boolean
  
  /** 跳过原因 */
  skipReason?: string
}
```

**示例**：
```typescript
const loginSuccessCase: TestCase = {
  id: 'auth-login-success',
  name: '使用正确凭据登录应返回 token',
  priority: 'critical',
  given: {
    preconditions: ['数据库中存在测试用户'],
    data: {
      user: { username: 'admin', passwordHash: 'hashed...' }
    }
  },
  when: {
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { username: 'admin', password: 'password123' }
  },
  then: {
    statusCode: 200,
    body: {
      code: 0,
      message: 'ok',
      data: {
        token: expect.any(String),
        user: {
          id: expect.any(String),
          username: 'admin',
          role: 'admin'
        }
      }
    }
  },
  tags: ['auth', 'critical', 'happy-path']
}
```

---

### 3. TestPrecondition（测试前置条件）

```typescript
interface TestPrecondition {
  /** 前置条件描述 */
  preconditions: string[]
  
  /** 需要准备的数据 */
  data?: Record<string, any>
  
  /** 需要 Mock 的外部服务 */
  mocks?: MockDefinition[]
  
  /** 环境变量设置 */
  env?: Record<string, string>
}
```

---

### 4. TestAction（测试操作）

```typescript
interface TestAction {
  /** HTTP 方法 */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  
  /** 请求路径（支持路径参数，如 /api/v1/tasks/{id}） */
  path: string
  
  /** 路径参数 */
  params?: Record<string, string>
  
  /** 查询参数 */
  query?: Record<string, string | number | boolean>
  
  /** 请求头 */
  headers?: Record<string, string>
  
  /** 请求体 */
  body?: any
  
  /** 是否需要认证 */
  authenticated?: boolean
  
  /** 使用的认证 token */
  token?: string
}
```

---

### 5. TestAssertion（测试断言）

```typescript
interface TestAssertion {
  /** 预期 HTTP 状态码 */
  statusCode: number
  
  /** 预期响应头 */
  headers?: Record<string, string | RegExp>
  
  /** 预期响应体（支持部分匹配和 matcher） */
  body?: any
  
  /** 预期数据库状态变化 */
  dbState?: DatabaseAssertion[]
  
  /** 预期的副作用（如发送的通知） */
  sideEffects?: SideEffectAssertion[]
  
  /** 自定义断言函数 */
  custom?: (response: any) => void | Promise<void>
}
```

---

### 6. MockDefinition（Mock 定义）

用于定义需要 Mock 的外部服务。

```typescript
interface MockDefinition {
  /** Mock 的服务名称 */
  service: 'bilibili-api' | 'email' | 'dingtalk' | 'webhook'
  
  /** Mock 的具体端点或方法 */
  endpoint: string
  
  /** Mock 的响应数据 */
  response: any
  
  /** Mock 的响应状态码 */
  statusCode?: number
  
  /** Mock 的延迟（毫秒） */
  delay?: number
  
  /** 是否模拟失败 */
  shouldFail?: boolean
  
  /** 失败的错误信息 */
  errorMessage?: string
}
```

**示例**：
```typescript
const bilibiliApiMock: MockDefinition = {
  service: 'bilibili-api',
  endpoint: 'https://api.bilibili.com/x/web-interface/view',
  response: {
    code: 0,
    data: {
      bvid: 'BV1234567890',
      title: '测试视频标题',
      stat: {
        view: 100000,
        danmaku: 500,
        reply: 200,
        favorite: 300,
        coin: 150,
        like: 800
      }
    }
  },
  statusCode: 200,
  delay: 100 // 模拟 100ms 延迟
}
```

---

### 7. ContractDiff（接口契约差异）

接口契约验证工具生成的差异项。

```typescript
interface ContractDiff {
  /** 差异类型 */
  type: 'missing-in-openapi' | 'missing-in-frontend' | 'type-mismatch' | 'aligned'
  
  /** 严重程度 */
  severity: 'error' | 'warning' | 'info'
  
  /** API 端点 */
  endpoint: {
    method: string
    path: string
  }
  
  /** 差异描述 */
  description: string
  
  /** OpenAPI 定义（如有） */
  openapi?: any
  
  /** 前端实现（如有） */
  frontend?: any
  
  /** 建议的修复方式 */
  suggestedFix?: string
}
```

**示例**：
```typescript
const missingEndpointDiff: ContractDiff = {
  type: 'missing-in-frontend',
  severity: 'warning',
  endpoint: {
    method: 'POST',
    path: '/api/v1/accounts/cookie'
  },
  description: '前端未实现账号 Cookie 绑定 API 调用',
  openapi: {
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['cookie'],
            properties: {
              cookie: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'OK',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponseAccount' }
          }
        }
      }
    }
  },
  suggestedFix: '在 frontend/web/src/lib/api.ts 中添加 bindAccountWithCookie(cookie: string) 函数'
}
```

---

## Mock 数据模板

### 用户 Mock 数据

```typescript
interface MockUser {
  id: string
  username: string
  passwordHash: string // bcrypt hash
  role: 'admin' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

// 测试用户
export const mockUsers: MockUser[] = [
  {
    id: 'test-admin-001',
    username: 'admin',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // 'password123'
    role: 'admin',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    id: 'test-viewer-001',
    username: 'viewer',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // 'password123'
    role: 'viewer',
    createdAt: new Date('2025-01-02T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z')
  }
]
```

### 账号 Mock 数据

```typescript
interface MockAccount {
  id: string
  uid: string
  nickname: string
  sessdata: string // 加密后的
  biliJct: string // 加密后的
  bindMethod: 'cookie' | 'qrcode'
  status: 'valid' | 'expired'
  lastFailures: number
  boundAt: Date
  createdAt: Date
  updatedAt: Date
}

export const mockAccounts: MockAccount[] = [
  {
    id: 'test-account-001',
    uid: '123456789',
    nickname: '测试UP主',
    sessdata: 'encrypted_sessdata_value',
    biliJct: 'encrypted_bili_jct_value',
    bindMethod: 'cookie',
    status: 'valid',
    lastFailures: 0,
    boundAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    id: 'test-account-002',
    uid: '987654321',
    nickname: '过期账号',
    sessdata: 'encrypted_sessdata_value',
    biliJct: 'encrypted_bili_jct_value',
    bindMethod: 'qrcode',
    status: 'expired',
    lastFailures: 6,
    boundAt: new Date('2024-12-01T00:00:00Z'),
    createdAt: new Date('2024-12-01T00:00:00Z'),
    updatedAt: new Date('2025-01-10T00:00:00Z')
  }
]
```

### 任务 Mock 数据

```typescript
interface MockTask {
  id: string
  type: 'video' | 'author'
  targetId: string
  accountId: string | null
  status: 'running' | 'stopped' | 'completed' | 'failed' | 'paused'
  reason: string | null
  strategy: {
    mode: 'fixed' | 'smart'
    value?: number
    unit?: 'minute' | 'hour' | 'day'
  }
  deadline: Date
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export const mockTasks: MockTask[] = [
  {
    id: 'test-task-video-001',
    type: 'video',
    targetId: 'BV1234567890',
    accountId: 'test-account-001',
    status: 'running',
    reason: null,
    strategy: { mode: 'fixed', value: 30, unit: 'minute' },
    deadline: new Date('2025-04-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    tags: ['测试', '视频监控']
  },
  {
    id: 'test-task-author-001',
    type: 'author',
    targetId: '123456789',
    accountId: 'test-account-001',
    status: 'running',
    reason: null,
    strategy: { mode: 'smart' },
    deadline: new Date('2025-04-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    tags: ['测试', '博主监控']
  },
  {
    id: 'test-task-paused-001',
    type: 'video',
    targetId: 'BV0987654321',
    accountId: 'test-account-002',
    status: 'paused',
    reason: '账号鉴权失败，已连续失败 6 次',
    strategy: { mode: 'fixed', value: 1, unit: 'hour' },
    deadline: new Date('2025-04-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-10T00:00:00Z'),
    tags: ['测试', '暂停']
  }
]
```

### Bilibili API Mock 响应

```typescript
// 视频信息 API
export const mockBilibiliVideoResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    bvid: 'BV1234567890',
    aid: 123456789,
    videos: 1,
    tid: 21,
    tname: '日常',
    title: '测试视频标题',
    pubdate: 1704067200,
    ctime: 1704067200,
    desc: '测试视频描述',
    owner: {
      mid: 123456789,
      name: '测试UP主',
      face: 'https://example.com/avatar.jpg'
    },
    stat: {
      aid: 123456789,
      view: 100000,
      danmaku: 500,
      reply: 200,
      favorite: 300,
      coin: 150,
      share: 80,
      now_rank: 0,
      his_rank: 0,
      like: 800,
      dislike: 0
    },
    pic: 'https://example.com/cover.jpg'
  }
}

// 博主信息 API
export const mockBilibiliAuthorResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    mid: 123456789,
    name: '测试UP主',
    sex: '保密',
    face: 'https://example.com/avatar.jpg',
    sign: '这是个人签名',
    level: 6,
    birthday: '01-01',
    follower: 50000,
    following: 200
  }
}

// 粉丝数 API
export const mockBilibiliFansResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    follower: 50123
  }
}
```

---

## 测试数据生成工具

### 测试数据工厂

```typescript
// backend/tests/helpers/test-data-factory.ts
import { nanoid } from 'nanoid'

export class TestDataFactory {
  /**
   * 创建测试用户
   */
  static createUser(overrides?: Partial<MockUser>): MockUser {
    return {
      id: nanoid(),
      username: `testuser_${nanoid(6)}`,
      passwordHash: '$2b$10$defaulthash',
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }
  
  /**
   * 创建测试账号
   */
  static createAccount(overrides?: Partial<MockAccount>): MockAccount {
    return {
      id: nanoid(),
      uid: String(Math.floor(Math.random() * 1000000000)),
      nickname: `测试账号_${nanoid(6)}`,
      sessdata: `encrypted_${nanoid()}`,
      biliJct: `encrypted_${nanoid()}`,
      bindMethod: 'cookie',
      status: 'valid',
      lastFailures: 0,
      boundAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }
  
  /**
   * 创建测试任务
   */
  static createTask(overrides?: Partial<MockTask>): MockTask {
    return {
      id: nanoid(),
      type: 'video',
      targetId: `BV${nanoid(10)}`,
      accountId: null,
      status: 'running',
      reason: null,
      strategy: { mode: 'smart' },
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 天后
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      ...overrides
    }
  }
}
```

**使用示例**：
```typescript
// 在测试中使用
const testUser = TestDataFactory.createUser({ role: 'admin' })
const testAccount = TestDataFactory.createAccount({ status: 'expired' })
const testTask = TestDataFactory.createTask({
  type: 'author',
  targetId: '123456789',
  accountId: testAccount.id
})
```

---

## 数据库初始化与清理

### 测试数据库工具

```typescript
// backend/tests/helpers/test-db.ts
import { createDb } from '../../src/db'
import { users, accounts, tasks } from '../../src/db/schema'
import { TestDataFactory } from './test-data-factory'

export class TestDatabase {
  constructor(private db: Database) {}
  
  /**
   * 插入标准测试数据
   */
  async seed() {
    // 插入测试用户
    await this.db.insert(users).values([
      TestDataFactory.createUser({
        id: 'test-admin',
        username: 'admin',
        role: 'admin'
      }),
      TestDataFactory.createUser({
        id: 'test-viewer',
        username: 'viewer',
        role: 'viewer'
      })
    ])
    
    // 插入测试账号
    await this.db.insert(accounts).values([
      TestDataFactory.createAccount({
        id: 'test-account-valid',
        status: 'valid'
      }),
      TestDataFactory.createAccount({
        id: 'test-account-expired',
        status: 'expired',
        lastFailures: 6
      })
    ])
    
    // 插入测试任务
    await this.db.insert(tasks).values([
      TestDataFactory.createTask({
        id: 'test-task-001',
        accountId: 'test-account-valid',
        status: 'running'
      }),
      TestDataFactory.createTask({
        id: 'test-task-002',
        accountId: 'test-account-expired',
        status: 'paused',
        reason: '账号鉴权失败'
      })
    ])
  }
  
  /**
   * 清空所有表
   */
  async clean() {
    await this.db.delete(tasks)
    await this.db.delete(accounts)
    await this.db.delete(users)
  }
  
  /**
   * 重置数据库（清空 + 插入标准数据）
   */
  async reset() {
    await this.clean()
    await this.seed()
  }
}
```

---

## 测试用例组织

### 按模块组织

```
backend/tests/
├── contract/
│   └── api-alignment.test.ts
├── unit/
│   ├── services/
│   │   ├── scheduler.test.ts          # 调度器单元测试
│   │   ├── task.test.ts               # 任务服务单元测试
│   │   └── collector.test.ts          # 采集器单元测试
│   └── utils/
│       ├── time-parser.test.ts        # 时间解析单元测试
│       └── crypto.test.ts             # 加密工具单元测试
├── integration/
│   └── routes/
│       ├── auth.integration.test.ts   # Auth API 集成测试
│       ├── accounts.integration.test.ts
│       ├── tasks.integration.test.ts
│       └── metrics.integration.test.ts
└── e2e/
    ├── task-lifecycle.e2e.test.ts
    └── account-recovery.e2e.test.ts
```

### 测试命名约定

- **单元测试**：`[module-name].test.ts` 或 `[module-name].unit.test.ts`
- **集成测试**：`[module-name].integration.test.ts`
- **E2E 测试**：`[feature-name].e2e.test.ts` 或 `[feature-name].spec.ts`
- **契约测试**：`[contract-type].contract.test.ts`

---

## 总结

本数据模型文档定义了测试相关的所有核心实体和 Mock 数据模板，为测试编写提供了统一的数据结构和最佳实践。关键要点：

1. **标准化测试结构**：TestSuite 和 TestCase 提供统一的测试组织方式
2. **Given-When-Then 模式**：明确的前置条件、操作和断言
3. **Mock 数据工厂**：简化测试数据创建，提高测试可维护性
4. **数据库工具类**：统一管理测试数据库的初始化和清理
5. **清晰的目录结构**：按测试类型和模块组织测试文件

