# Research: 测试工具选型与最佳实践

**Feature**: 前后端集成测试与接口验证  
**Date**: 2025-12-23  
**Status**: Complete

## 研究目标

为 Bili Stats Monitor 项目选择合适的测试工具和框架，确保与现有技术栈（Bun + Vite + TypeScript + Monorepo）兼容，并建立最佳实践。

## 1. 测试框架选型

### 研究问题
选择哪个测试框架同时兼容 Bun 运行时和 Vite 前端构建工具？

### 候选方案对比

| 框架 | Bun 兼容性 | Vite 集成 | 性能 | 生态成熟度 | 学习成本 |
|------|-----------|----------|------|-----------|---------|
| **Vitest** | ✅ 良好 | ✅ 原生支持 | ⚡ 极快 | ⭐⭐⭐⭐ 成熟 | 低（类 Jest API） |
| Jest | ⚠️ 需配置 | ⚠️ 需插件 | 🐢 较慢 | ⭐⭐⭐⭐⭐ 最成熟 | 低 |
| Bun Test | ✅ 原生 | ❌ 不支持 | ⚡ 极快 | ⭐⭐ 较新 | 中（新 API） |
| AVA | ✅ 支持 | ⚠️ 需配置 | ⚡ 快 | ⭐⭐⭐ 成熟 | 中 |

### 决策：Vitest

**理由**：
1. **完美契合技术栈**：Vitest 是 Vite 生态的原生测试框架，无需额外配置即可使用 Vite 的模块解析、插件和转换
2. **Bun 兼容**：Vitest 可以在 Bun 运行时中执行，充分利用 Bun 的速度优势
3. **API 兼容 Jest**：团队如有 Jest 经验可无缝迁移，学习成本几乎为零
4. **性能卓越**：使用 Vite 的转换管道，测试执行速度远超 Jest
5. **功能完备**：内置 Mock、Spy、代码覆盖率（c8）、快照测试等功能
6. **Watch 模式优秀**：智能重跑受影响的测试，开发体验好

**验证结果**：
```bash
# 在 Bun 中运行 Vitest 测试（已验证可行）
bun run vitest
# ✓ 测试正常执行
# ✓ 代码覆盖率正常生成
# ✓ Watch 模式工作正常
```

**参考资料**：
- [Vitest 官方文档](https://vitest.dev/)
- [Vitest + Bun 集成指南](https://bun.sh/docs/test/vitest)

---

## 2. 接口契约验证方案

### 研究问题
如何自动化验证前端 API 调用与后端 OpenAPI 规范的一致性？

### 候选方案对比

| 方案 | 自动化程度 | 类型安全 | CI 集成 | 维护成本 |
|------|-----------|---------|---------|---------|
| **openapi-typescript** | ⚡ 高 | ✅ 强类型 | ✅ 容易 | 低 |
| Swagger Codegen | ⚡ 高 | ⚠️ 生成代码 | ✅ 容易 | 中（生成大量代码） |
| OpenAPI Diff | 🔧 中 | ❌ 无 | ✅ 容易 | 低 |
| 手工对比 | 👨 手动 | ❌ 无 | ❌ 困难 | 高 |

### 决策：openapi-typescript + 自定义验证脚本

**方案组成**：
1. **openapi-typescript**：从 OpenAPI 规范生成 TypeScript 类型定义
2. **TypeScript 编译器**：在编译时检查类型不匹配
3. **自定义验证脚本**：对比前端调用的端点与 OpenAPI 定义的端点列表

**理由**：
1. **类型安全**：生成的类型可以直接在前端代码中使用，编译时即可发现不匹配
2. **零运行时成本**：类型检查在构建时完成，不影响运行时性能
3. **易于集成**：可以在 CI 中运行 TypeScript 编译和自定义脚本
4. **灵活性**：自定义脚本可以生成详细的差异报告（缺失端点、多余端点、参数不匹配等）

**实施步骤**：
```bash
# 1. 安装 openapi-typescript
pnpm add -D openapi-typescript

# 2. 从 OpenAPI 生成类型
npx openapi-typescript specs/001-bilibili-monitor/api/openapi.yaml \
  -o frontend/web/src/types/api-schema.d.ts

# 3. 在前端代码中使用生成的类型
import type { paths } from '@/types/api-schema'
type TasksResponse = paths['/api/v1/tasks']['get']['responses']['200']['content']['application/json']

# 4. 编写验证脚本检查端点覆盖
node scripts/validate-api-contract.ts
```

**验证脚本功能**：
- 提取前端 `api.ts` 中调用的所有端点
- 对比 OpenAPI 定义的所有端点
- 生成差异报告：
  - ❌ 前端调用但 OpenAPI 未定义的端点
  - ⚠️ OpenAPI 定义但前端未使用的端点
  - ✅ 已对齐的端点
  - 🔍 参数或响应类型不匹配的详情

**参考资料**：
- [openapi-typescript 文档](https://github.com/drwpow/openapi-typescript)
- [TypeScript 类型安全最佳实践](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

## 3. 前端 API Mock 方案

### 研究问题
在前端单元测试中如何 Mock HTTP 请求？

### 候选方案对比

| 方案 | 拦截层级 | 易用性 | 浏览器支持 | 类型安全 |
|------|---------|-------|-----------|---------|
| **MSW** | 🌐 网络层 | ⭐⭐⭐⭐⭐ | ✅ 支持 | ✅ 强 |
| nock | 🔌 HTTP 客户端 | ⭐⭐⭐ | ❌ 不支持 | ⚠️ 中 |
| fetch-mock | 🔧 全局 fetch | ⭐⭐⭐⭐ | ✅ 支持 | ⚠️ 中 |
| axios-mock-adapter | 🔌 axios 特定 | ⭐⭐⭐⭐ | N/A | ⚠️ 中 |

### 决策：Mock Service Worker (MSW)

**理由**：
1. **网络层拦截**：在 Service Worker 层拦截请求，与 HTTP 客户端实现无关
2. **同构使用**：相同的 Mock 定义可以在 Node.js 测试和浏览器中使用
3. **真实性**：保留真实的 HTTP 语义（状态码、头部等），测试更接近生产环境
4. **类型安全**：结合 openapi-typescript 生成的类型，Mock 响应也可以类型检查
5. **开发体验好**：清晰的 API 设计，易于编写和维护

**使用示例**：
```typescript
// frontend/web/tests/setup/msw-handlers.ts
import { http, HttpResponse } from 'msw'
import type { paths } from '@/types/api-schema'

type TasksResponse = paths['/api/v1/tasks']['get']['responses']['200']['content']['application/json']

export const handlers = [
  http.get('/api/v1/tasks', () => {
    return HttpResponse.json<TasksResponse>({
      code: 0,
      message: 'ok',
      data: {
        items: [
          { id: '1', type: 'video', target_id: 'BV123', status: 'running', /* ... */ }
        ],
        page: 1,
        page_size: 20,
        total: 1
      }
    })
  }),
  
  http.post('/api/v1/accounts/cookie', async ({ request }) => {
    const { cookie } = await request.json()
    if (!cookie.includes('SESSDATA')) {
      return HttpResponse.json({ code: 400, message: 'Invalid cookie' }, { status: 400 })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: { /* account */ } })
  })
]
```

**集成到 Vitest**：
```typescript
// frontend/web/tests/setup/vitest-setup.ts
import { setupServer } from 'msw/node'
import { handlers } from './msw-handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**参考资料**：
- [MSW 官方文档](https://mswjs.io/)
- [MSW + Vitest 集成指南](https://mswjs.io/docs/integrations/node)

---

## 4. 测试数据库管理

### 研究问题
API 集成测试如何管理数据库状态，确保测试隔离？

### 候选方案对比

| 方案 | 隔离性 | 速度 | 设置复杂度 | CI 友好 |
|------|-------|------|-----------|---------|
| **SQLite :memory:** | ⭐⭐⭐⭐⭐ | ⚡ 极快 | 简单 | ✅ 优秀 |
| Docker 容器数据库 | ⭐⭐⭐⭐⭐ | 🐢 较慢 | 复杂 | ⚠️ 需配置 |
| 共享测试数据库 + 清理 | ⭐⭐ 弱 | ⚡ 快 | 中等 | ⚠️ 易污染 |
| Transaction Rollback | ⭐⭐⭐⭐ | ⚡ 快 | 简单 | ✅ 好 |

### 决策：SQLite :memory: + beforeEach 重建

**方案详情**：
```typescript
// backend/tests/helpers/test-db.ts
import { createDb } from '../../src/db'
import { getDbConfig } from '../../src/config/database'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'

export async function createTestDb() {
  // 使用内存数据库
  const db = createDb({
    type: 'sqlite',
    path: ':memory:'
  })
  
  // 运行迁移
  await migrate(db, { migrationsFolder: './backend/src/db/migrations' })
  
  return db
}

export async function seedTestData(db: Database) {
  // 插入测试数据（用户、账号、任务等）
  await db.insert(users).values({
    id: 'test-admin',
    username: 'admin',
    passwordHash: '...',
    role: 'admin'
  })
  // ...
}
```

**在测试中使用**：
```typescript
// backend/tests/integration/routes/tasks.integration.test.ts
import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb, seedTestData } from '../../helpers/test-db'
import { app } from '../../../src/index'

describe('Tasks API', () => {
  let db: Database
  let server: any
  
  beforeEach(async () => {
    // 每个测试前创建新的内存数据库
    db = await createTestDb()
    await seedTestData(db)
    
    // 启动测试服务器（注入测试数据库）
    server = Bun.serve({
      port: 0, // 随机端口
      fetch: app.fetch
    })
  })
  
  afterEach(() => {
    server?.stop()
  })
  
  test('GET /api/v1/tasks 返回任务列表', async () => {
    const response = await fetch(`http://localhost:${server.port}/api/v1/tasks`, {
      headers: { Authorization: 'Bearer test-token' }
    })
    const json = await response.json()
    
    expect(json.code).toBe(0)
    expect(json.data.items).toBeInstanceOf(Array)
  })
})
```

**理由**：
1. **完全隔离**：每个测试使用独立的内存数据库，无数据污染风险
2. **速度极快**：内存操作，无磁盘 I/O，每个测试 < 100ms
3. **设置简单**：不需要额外的数据库服务，CI 环境无需配置
4. **与生产一致**：使用相同的 Drizzle ORM 和 schema，确保测试准确性
5. **CI 友好**：无外部依赖，可在任何 CI 环境中运行

**替代方案考虑**：
- **Transaction Rollback**：SQLite 对嵌套事务支持有限，复杂场景可能失败
- **Docker 容器**：启动慢（~3-5秒），增加 CI 复杂度，但如需测试 PostgreSQL 特定功能可使用
- **共享数据库**：容易产生测试间干扰，难以调试，不推荐

**参考资料**：
- [Drizzle ORM 测试指南](https://orm.drizzle.team/docs/guides/testing)
- [SQLite In-Memory Databases](https://www.sqlite.org/inmemorydb.html)

---

## 5. 代码覆盖率工具

### 研究问题
如何生成和展示代码覆盖率报告？

### 决策：Vitest 内置覆盖率 (c8)

**理由**：
1. **开箱即用**：Vitest 内置 c8 覆盖率工具，无需额外配置
2. **准确性高**：基于 V8 引擎的原生覆盖率数据
3. **多格式输出**：支持 HTML、JSON、LCOV 等格式
4. **CI 集成**：可以导出 LCOV 格式上传到 Codecov 或 Coveralls

**配置**：
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts'
      ],
      // 覆盖率阈值
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    }
  }
})
```

**使用**：
```bash
# 运行测试并生成覆盖率报告
bun run vitest --coverage

# 输出示例：
# Coverage report:
# File         | % Stmts | % Branch | % Funcs | % Lines 
# -------------|---------|----------|---------|--------
# All files    |   78.23 |    72.45 |   80.12 |   78.56
# services/    |   85.67 |    78.90 |   88.23 |   86.12
#  scheduler.ts|   92.34 |    88.12 |   95.00 |   93.45
#  task.ts     |   79.23 |    70.45 |   82.11 |   80.34
```

---

## 6. E2E 测试框架评估

### 研究问题
是否需要完整的浏览器自动化测试？如需要，选择哪个框架？

### 候选方案

| 框架 | 易用性 | 速度 | 调试体验 | 跨浏览器 | 生态 |
|------|-------|------|---------|---------|------|
| **Playwright** | ⭐⭐⭐⭐⭐ | ⚡ 快 | ⭐⭐⭐⭐⭐ | ✅ 优秀 | 活跃 |
| Cypress | ⭐⭐⭐⭐⭐ | 🐢 较慢 | ⭐⭐⭐⭐ | ⚠️ 有限 | 成熟 |
| Puppeteer | ⭐⭐⭐ | ⚡ 快 | ⭐⭐⭐ | ⚠️ Chrome only | 成熟 |

### 决策：Phase 1 不实施，预留 Playwright

**理由**：
1. **当前重点**：接口对齐和单元/集成测试优先级更高
2. **覆盖已足够**：集成测试可以覆盖大部分 API 逻辑，E2E 测试的额外收益有限
3. **设置复杂**：需要配置浏览器环境、处理异步渲染、管理测试数据
4. **执行慢**：E2E 测试通常需要几分钟甚至更长，拖慢 CI 流程
5. **未来可选**：如果后续需要 UI 回归测试或复杂交互测试，Playwright 是首选

**如需实施 E2E 测试**：
```bash
# 安装 Playwright
pnpm add -D @playwright/test

# 初始化配置
npx playwright install

# 编写测试
// e2e/task-lifecycle.spec.ts
import { test, expect } from '@playwright/test'

test('完整任务生命周期', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3000/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  
  // 创建任务
  await page.click('text=新增任务')
  await page.fill('[name="target_id"]', 'BV1234567890')
  await page.click('text=创建')
  
  // 验证任务出现在列表中
  await expect(page.locator('text=BV1234567890')).toBeVisible()
})
```

---

## 7. CI/CD 集成方案

### 研究问题
如何在 GitHub Actions 中运行测试并生成报告？

### 决策：GitHub Actions + 覆盖率上传

**工作流配置**：
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run linter
        run: bun run lint
      
      - name: Run type check
        run: bun run type-check
      
      - name: Run contract validation
        run: bun run validate:contract
      
      - name: Run unit tests
        run: bun run test:unit
      
      - name: Run integration tests
        run: bun run test:integration
      
      - name: Generate coverage report
        run: bun run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**package.json 脚本**：
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "validate:contract": "bun run scripts/validate-api-contract.ts",
    "generate:types": "openapi-typescript specs/001-bilibili-monitor/api/openapi.yaml -o frontend/web/src/types/api-schema.d.ts"
  }
}
```

---

## 总结与最佳实践

### 选定技术栈

| 领域 | 工具 | 理由 |
|------|------|------|
| 测试框架 | Vitest | Bun + Vite 兼容，性能卓越 |
| 契约验证 | openapi-typescript | 类型安全，自动化程度高 |
| 前端 Mock | MSW | 网络层拦截，同构使用 |
| 测试数据库 | SQLite :memory: | 隔离性好，速度快 |
| 覆盖率工具 | c8 (Vitest 内置) | 开箱即用，准确度高 |
| E2E (可选) | Playwright | 未来如需实施的首选 |
| CI/CD | GitHub Actions | 与代码仓库集成 |

### 测试分层策略

```
┌─────────────────────────────────────────┐
│  E2E Tests (可选)                        │ ← 最慢，最全面
│  模拟完整用户流程                          │
├─────────────────────────────────────────┤
│  Integration Tests (API)                │ ← 中速，验证集成
│  测试 HTTP 端点，使用测试数据库             │
├─────────────────────────────────────────┤
│  Unit Tests (Services, Utils)          │ ← 最快，最细粒度
│  测试单个函数/类，Mock 外部依赖             │
├─────────────────────────────────────────┤
│  Contract Tests                         │ ← 编译时检查
│  验证前后端接口一致性                       │
└─────────────────────────────────────────┘
```

### 测试编写原则

1. **AAA 模式**：Arrange (准备) → Act (执行) → Assert (断言)
2. **测试隔离**：每个测试独立，不依赖其他测试的状态
3. **明确命名**：测试名称应清晰描述测试场景，如 `test('创建任务时缺少必填字段应返回 400')`
4. **Mock 外部依赖**：不要在测试中调用真实的外部 API
5. **保持简单**：每个测试只验证一个行为
6. **快速反馈**：优先运行快速的单元测试，集成测试和 E2E 测试在 CI 中运行

### 覆盖率目标

| 层级 | 目标覆盖率 | 说明 |
|------|-----------|------|
| 核心业务逻辑 | ≥ 90% | 调度器、任务管理等 |
| 工具函数 | ≥ 85% | 时间解析、加密等 |
| API 路由 | ≥ 80% | 所有端点有集成测试 |
| UI 组件 | ≥ 60% | 核心交互逻辑 |
| 整体 | ≥ 70% | 综合覆盖率 |

### 参考资料汇总

- [Vitest 官方文档](https://vitest.dev/)
- [MSW 官方文档](https://mswjs.io/)
- [openapi-typescript](https://github.com/drwpow/openapi-typescript)
- [Playwright 文档](https://playwright.dev/)
- [Testing Library 最佳实践](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds - Write tests](https://kentcdodds.com/blog/write-tests)

