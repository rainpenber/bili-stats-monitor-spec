# 集成测试实施计划

## 🎯 当前状态

### ✅ 已完成

1. **基础设施** (T067-T068)
   - ✅ `helpers/test-helpers.ts` - 通用测试辅助函数
   - ✅ `helpers/auth-helper.ts` - 认证token生成工具
   - ✅ `README.md` - 集成测试架构文档

2. **测试模板** (T069-T082部分)
   - ✅ `routes/auth.integration.test.ts` - Auth模块测试模板 (3个端点)
   - ✅ `routes/tasks.integration.test.ts` - Tasks模块测试模板 (5个端点)

### 📋 待实现

为完成Phase 5的所有38个任务，还需要：

## 🔧 实施步骤

### 步骤1: 创建测试服务器启动器

创建 `backend/tests/integration/helpers/test-server.ts`:

```typescript
import type { Server } from 'bun'
import type { DrizzleInstance } from '../../../src/db'
// 根据实际app结构导入createApp

export async function startTestServer(db: DrizzleInstance, port = 3001): Promise<Server> {
  // TODO: 根据实际的app创建逻辑实现
  // const app = createApp(db)
  // return Bun.serve({ port, fetch: app.fetch })
  throw new Error('Test server not implemented')
}

export async function stopTestServer(server: Server): Promise<void> {
  server.stop()
}
```

### 步骤2: 创建剩余的集成测试文件

基于已有模板 (`auth.integration.test.ts` 和 `tasks.integration.test.ts`)，创建：

#### Accounts模块 (T072-T077)
- `routes/accounts.integration.test.ts`
- 7个端点: GET /accounts, GET/POST /accounts/default, POST /accounts/cookie, POST /accounts/qrcode, GET /accounts/qrcode/status, POST /accounts/{id}/action

#### Metrics模块 (T083-T085)
- `routes/metrics.integration.test.ts`
- 3个端点: GET /videos/{bv}/metrics, GET /videos/{bv}/insights/daily, GET /authors/{uid}/metrics

#### Media模块 (T086-T088)
- `routes/media.integration.test.ts`
- 3个端点: GET /media/videos/{bv}/cover, GET /media/authors/{uid}/avatar, POST /media/refresh

#### Notifications模块 (T089-T093)
- `routes/notifications.integration.test.ts`
- 5个端点: GET/POST /notifications/channels, POST /notifications/test, GET/POST /notifications/rules

#### Alerts模块 (T094-T095)
- `routes/alerts.integration.test.ts`
- 2个端点: GET/POST /alerts/authors/{uid}

#### Logs模块 (T096-T097)
- `routes/logs.integration.test.ts`
- 2个端点: GET /logs, GET /logs/download

#### Settings模块 (T098-T099)
- `routes/settings.integration.test.ts`
- 2个端点: GET/POST /settings

#### 通用测试 (T100-T102)
- `routes/error-handling.integration.test.ts` - 统一错误响应格式
- `routes/auth-middleware.integration.test.ts` - 认证中间件401测试
- `routes/validation.integration.test.ts` - 参数验证400测试

### 步骤3: 启用测试

1. 在每个测试文件中，将 `test.skip` 改为 `test`
2. 实现 `startTestServer` 和 `stopTestServer` 函数
3. 在 `beforeAll` 中启动测试服务器
4. 在 `afterAll` 中停止测试服务器

### 步骤4: 运行和验证

```bash
# 运行所有集成测试
bun test tests/integration/

# 验证覆盖率
bun test tests/integration/ --coverage

# 确认所有33个API端点都有测试覆盖
```

## 📊 测试覆盖目标

| 模块 | 端点数 | 测试文件 | 状态 |
|------|--------|----------|------|
| Auth | 3 | ✅ auth.integration.test.ts | 模板已创建 |
| Accounts | 7 | ⏳ accounts.integration.test.ts | 待创建 |
| Tasks | 5 | ✅ tasks.integration.test.ts | 模板已创建 |
| Metrics | 3 | ⏳ metrics.integration.test.ts | 待创建 |
| Media | 3 | ⏳ media.integration.test.ts | 待创建 |
| Notifications | 5 | ⏳ notifications.integration.test.ts | 待创建 |
| Alerts | 2 | ⏳ alerts.integration.test.ts | 待创建 |
| Logs | 2 | ⏳ logs.integration.test.ts | 待创建 |
| Settings | 2 | ⏳ settings.integration.test.ts | 待创建 |
| 通用测试 | - | ⏳ 3个文件 | 待创建 |

**总计**: 33个API端点 + 3个通用测试 = 36个测试文件/模块

## 🚧 当前限制

1. **测试服务器未实现**: 需要根据实际的后端app架构实现 `startTestServer`
2. **测试被跳过**: 所有测试使用 `test.skip`，需要实现服务器后启用
3. **部分端点可能变化**: OpenAPI规范可能还在演进中

## 🔄 后续工作

完成Phase 5后，进入**Phase 6: User Story 4 - 端到端测试 (E2E)**：

- 前端组件集成测试
- 完整用户流程测试
- 浏览器自动化测试（Playwright/Cypress）

## 📝 注意事项

1. **真实HTTP服务器**: 集成测试需要运行实际的HTTP服务器，而不仅仅是测试Service层
2. **数据库隔离**: 使用内存数据库或测试数据库，避免污染生产数据
3. **测试独立性**: 每个测试应该独立运行，不依赖其他测试的状态
4. **清理资源**: 在测试结束后正确清理数据库、服务器等资源
5. **CI/CD集成**: 将集成测试纳入CI/CD pipeline，确保每次提交都运行测试

## 🎓 参考已完成的模板

查看以下文件了解如何编写集成测试：

- `backend/tests/integration/routes/auth.integration.test.ts`
- `backend/tests/integration/routes/tasks.integration.test.ts`
- `backend/tests/integration/README.md`

