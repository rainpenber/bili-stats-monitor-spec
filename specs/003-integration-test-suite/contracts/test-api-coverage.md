# API 测试覆盖清单与契约验证

**Feature**: 前后端集成测试与接口验证  
**Date**: 2025-12-23  
**Related**: [spec.md](../spec.md), [plan.md](../plan.md)

## 目的

本文档列出所有需要测试的 API 端点，标记前后端实现状态，并作为接口契约验证的基准。

## 接口对齐状态

### 图例

| 符号 | 含义 |
|------|------|
| ✅ | 前后端已对齐，有测试 |
| ⚠️ | 已实现但缺少测试 |
| ❌ | 前端未实现 |
| 🚧 | 后端未实现 |
| 📝 | OpenAPI 未定义 |

---

## Auth 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/auth/login` | POST | ✅ | ✅ | ✅ | ⚠️ | P1 | 登录获取 token |
| `/api/v1/auth/logout` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** |
| `/api/v1/auth/profile` | GET | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

/**
 * 退出登录
 */
export async function logout() {
  await http.post('/api/v1/auth/logout', { action: 'logout' })
  return true
}

/**
 * 获取当前用户信息
 */
export async function fetchProfile() {
  return http.get<User>('/api/v1/auth/profile')
}
```

---

## Accounts 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/accounts` | GET | ✅ | ✅ | ✅ | ⚠️ | P1 | 查询账号列表 |
| `/api/v1/accounts/default` | GET | ✅ | ✅ | ✅ | ⚠️ | P1 | 获取默认账号 |
| `/api/v1/accounts/default` | POST | ✅ | ✅ | ✅ | ⚠️ | P1 | 设置默认账号 |
| `/api/v1/accounts/cookie` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - Cookie 绑定 |
| `/api/v1/accounts/qrcode` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 获取扫码二维码 |
| `/api/v1/accounts/qrcode/status` | GET | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 轮询扫码状态 |
| `/api/v1/accounts/{id}/action` | POST | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 验证/解绑账号 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

/**
 * 通过 Cookie 绑定账号
 */
export async function bindAccountWithCookie(cookie: string) {
  return http.post<Account>('/api/v1/accounts/cookie', { cookie })
}

/**
 * 获取扫码登录二维码
 */
export async function createQRCode() {
  return http.post<{
    session_id: string
    qr_url: string
    expire_at: string
    poll_interval_sec: number
  }>('/api/v1/accounts/qrcode', { action: 'create' })
}

/**
 * 轮询扫码登录状态
 */
export async function pollQRCodeStatus(sessionId: string) {
  return http.get<{
    status: 'pending' | 'scanned' | 'confirmed' | 'expired'
    account?: Account
  }>(`/api/v1/accounts/qrcode/status?session_id=${sessionId}`)
}

/**
 * 验证账号
 */
export async function validateAccount(id: string) {
  await http.post(`/api/v1/accounts/${id}/action`, { action: 'validate' })
  return true
}

/**
 * 解绑账号
 */
export async function unbindAccount(id: string) {
  await http.post(`/api/v1/accounts/${id}/action`, { action: 'unbind' })
  return true
}
```

---

## Tasks 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/tasks` | GET | ✅ | ✅ | ✅ | ⚠️ | P1 | 查询任务列表 |
| `/api/v1/tasks` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 创建任务 |
| `/api/v1/tasks/{id}` | GET | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 获取任务详情 |
| `/api/v1/tasks/{id}` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 更新/删除任务 |
| `/api/v1/tasks/batch` | POST | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 批量启停 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

export interface TaskCreate {
  type: 'video' | 'author'
  target_id: string
  account_id?: string
  strategy?: StrategyFixed | StrategySmart
  deadline?: string
  tags?: string[]
}

export interface TaskUpdate {
  account_id?: string
  strategy?: StrategyFixed | StrategySmart
  deadline?: string
  tags?: string[]
}

export interface Selection {
  type: 'ids' | 'all'
  ids?: string[]
  filters?: {
    keyword?: string
    type?: 'video' | 'author'
    author_uid?: string
    tags?: string
  }
}

/**
 * 创建任务
 */
export async function createTask(data: TaskCreate) {
  return http.post<Task>('/api/v1/tasks', data)
}

/**
 * 获取任务详情
 */
export async function fetchTask(id: string) {
  return http.get<Task>(`/api/v1/tasks/${id}`)
}

/**
 * 更新任务
 */
export async function updateTask(id: string, data: TaskUpdate) {
  await http.post(`/api/v1/tasks/${id}`, {
    action: 'update',
    ...data
  })
  return true
}

/**
 * 删除任务
 */
export async function deleteTask(id: string) {
  await http.post(`/api/v1/tasks/${id}`, { action: 'delete' })
  return true
}

/**
 * 批量启用任务
 */
export async function batchEnableTasks(selection: Selection) {
  return http.post<{
    success_count: number
    failure_count: number
    failures: Array<{ id: string; reason: string }>
  }>('/api/v1/tasks/batch', {
    action: 'enable',
    selection
  })
}

/**
 * 批量禁用任务
 */
export async function batchDisableTasks(selection: Selection) {
  return http.post<{
    success_count: number
    failure_count: number
    failures: Array<{ id: string; reason: string }>
  }>('/api/v1/tasks/batch', {
    action: 'disable',
    selection
  })
}
```

---

## Metrics 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/videos/{bv}/metrics` | GET | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 视频指标时序 |
| `/api/v1/videos/{bv}/insights/daily` | GET | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 视频私密指标 |
| `/api/v1/authors/{uid}/metrics` | GET | ❌ | ✅ | ✅ | ⚠️ | P1 | **需补全前端** - 博主粉丝时序 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

export interface TimeRangeParams {
  from?: string  // ISO 8601 datetime
  to?: string    // ISO 8601 datetime
  fields?: string  // 逗号分隔，如 'play,watching,danmaku'
}

export interface MetricPoint {
  ts: string
  play?: number
  watching?: number
  danmaku?: number
  comment?: number
  coin?: number
  like?: number
  fans?: number
}

export interface InsightPoint {
  date: string
  completion_rate: number
  avg_watch_duration_sec: number
}

/**
 * 获取视频指标时序
 */
export async function fetchVideoMetrics(bv: string, params?: TimeRangeParams) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.fields) qs.set('fields', params.fields)
  return http.get<{ series: MetricPoint[] }>(`/api/v1/videos/${bv}/metrics?${qs.toString()}`)
}

/**
 * 获取视频私密指标（日粒度）
 */
export async function fetchVideoInsights(bv: string) {
  return http.get<InsightPoint[]>(`/api/v1/videos/${bv}/insights/daily`)
}

/**
 * 获取博主粉丝时序
 */
export async function fetchAuthorMetrics(uid: string, params?: TimeRangeParams) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  return http.get<{ series: MetricPoint[] }>(`/api/v1/authors/${uid}/metrics?${qs.toString()}`)
}
```

---

## Media 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/media/videos/{bv}/cover` | GET | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 获取视频封面 |
| `/api/v1/media/authors/{uid}/avatar` | GET | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 获取博主头像 |
| `/api/v1/media/refresh` | POST | ❌ | ✅ | ✅ | ⚠️ | P3 | **需补全前端** - 刷新媒体缓存 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

/**
 * 获取视频封面 URL
 */
export async function fetchVideoCover(bv: string) {
  return http.get<{ url: string }>(`/api/v1/media/videos/${bv}/cover`)
}

/**
 * 获取博主头像 URL
 */
export async function fetchAuthorAvatar(uid: string) {
  return http.get<{ url: string }>(`/api/v1/media/authors/${uid}/avatar`)
}

/**
 * 手动刷新封面/头像缓存
 */
export async function refreshMedia(targetType: 'video' | 'author', targetId: string) {
  await http.post('/api/v1/media/refresh', {
    target_type: targetType,
    target_id: targetId
  })
  return true
}
```

---

## Notifications 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/notifications/channels` | GET | ✅ | ✅ | ✅ | ⚠️ | P2 | 获取通知渠道配置 |
| `/api/v1/notifications/channels` | POST | ✅ | ✅ | ✅ | ⚠️ | P2 | 保存通知渠道配置 |
| `/api/v1/notifications/test` | POST | ✅ | ✅ | 📝 | ⚠️ | P2 | **需添加到 OpenAPI** - 测试通知 |
| `/api/v1/notifications/rules` | GET | ✅ | ✅ | 📝 | ⚠️ | P2 | **需添加到 OpenAPI** - 获取通知规则 |
| `/api/v1/notifications/rules` | POST | ✅ | ✅ | 📝 | ⚠️ | P2 | **需添加到 OpenAPI** - 保存/删除规则 |

### 需要添加到 OpenAPI 的端点

```yaml
# specs/001-bilibili-monitor/api/openapi.yaml

/api/v1/notifications/test:
  post:
    tags: [Notifications]
    summary: 测试通知渠道
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [channel, payload]
            properties:
              channel:
                type: string
                enum: [email, dingtalk, wecom, webhook, bark, pushdeer, onebot, telegram]
              payload:
                type: object
    responses:
      '200':
        $ref: '#/components/responses/Ok'

/api/v1/notifications/rules:
  get:
    tags: [Notifications]
    summary: 获取通知规则
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema:
              type: object
              properties:
                code: { type: integer }
                message: { type: string }
                data:
                  type: object
                  properties:
                    items:
                      type: array
                      items:
                        $ref: '#/components/schemas/NotifyRule'
                    triggers: { type: array, items: { type: string } }
                    channels: { type: array, items: { type: string } }
  post:
    tags: [Notifications]
    summary: 保存或删除通知规则
    requestBody:
      required: true
      content:
        application/json:
          schema:
            oneOf:
              - type: object
                required: [action, rule]
                properties:
                  action: { type: string, enum: [save] }
                  rule: { $ref: '#/components/schemas/NotifyRule' }
              - type: object
                required: [action, id]
                properties:
                  action: { type: string, enum: [delete] }
                  id: { type: string }
    responses:
      '200':
        $ref: '#/components/responses/Ok'
```

---

## Alerts 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/alerts/authors/{uid}` | GET | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 获取粉丝告警规则 |
| `/api/v1/alerts/authors/{uid}` | POST | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 保存/禁用告警规则 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

export interface AlertRule {
  enabled: boolean
  mode: 'absolute' | 'percent'
  threshold: number
  window_hours: number
}

/**
 * 获取博主粉丝告警规则
 */
export async function fetchAlertRule(uid: string) {
  return http.get<AlertRule>(`/api/v1/alerts/authors/${uid}`)
}

/**
 * 保存粉丝告警规则
 */
export async function saveAlertRule(uid: string, rule: AlertRule) {
  await http.post(`/api/v1/alerts/authors/${uid}`, {
    action: 'save',
    rule
  })
  return true
}

/**
 * 禁用粉丝告警规则
 */
export async function disableAlertRule(uid: string) {
  await http.post(`/api/v1/alerts/authors/${uid}`, {
    action: 'disable'
  })
  return true
}
```

---

## Logs 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/logs` | GET | ✅ | ✅ | ✅ | ⚠️ | P2 | 查询日志 |
| `/api/v1/logs/download` | GET | ✅ | ✅ | ✅ | ⚠️ | P3 | 下载日志 |

**状态**: ✅ 前后端已对齐

---

## Settings 模块

| 端点 | 方法 | 前端 | 后端 | OpenAPI | 集成测试 | 优先级 | 说明 |
|------|------|------|------|---------|----------|--------|------|
| `/api/v1/settings` | GET | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 获取系统设置 |
| `/api/v1/settings` | POST | ❌ | ✅ | ✅ | ⚠️ | P2 | **需补全前端** - 保存系统设置 |

### 需要补全的前端函数

```typescript
// frontend/web/src/lib/api.ts

export interface Settings {
  min_interval_min: number
  max_fixed_interval_day: number
  max_retries: number
  page_size_default: number
  timezone: string
  users: User[]
}

/**
 * 获取系统设置
 */
export async function fetchSettings() {
  return http.get<Settings>('/api/v1/settings')
}

/**
 * 保存系统设置
 */
export async function saveSettings(settings: Settings) {
  await http.post('/api/v1/settings', {
    action: 'save',
    settings
  })
  return true
}
```

---

## 统计汇总

### 按状态分类

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 已对齐且有测试 | 0 | 0% |
| ⚠️ 已对齐但缺测试 | 8 | 24% |
| ❌ 前端未实现 | 22 | 67% |
| 📝 OpenAPI 未定义 | 3 | 9% |
| **总计** | **33** | **100%** |

### 按优先级分类

| 优先级 | 需补全数量 | 说明 |
|--------|-----------|------|
| P1 | 15 | 核心功能，必须优先完成 |
| P2 | 9 | 重要功能，次要优先级 |
| P3 | 1 | 可选功能，最低优先级 |
| **总计** | **25** | |

### 按模块分类

| 模块 | 总端点数 | 需补全 | 需测试 |
|------|---------|--------|--------|
| Auth | 3 | 2 | 3 |
| Accounts | 7 | 5 | 7 |
| Tasks | 5 | 5 | 5 |
| Metrics | 3 | 3 | 3 |
| Media | 3 | 3 | 3 |
| Notifications | 5 | 0 (需添加到 OpenAPI) | 5 |
| Alerts | 2 | 2 | 2 |
| Logs | 2 | 0 | 2 |
| Settings | 2 | 2 | 2 |
| **总计** | **33** | **22** | **33** |

---

## 契约验证脚本

自动化脚本将验证前端调用与 OpenAPI 定义的一致性。

```typescript
// scripts/validate-api-contract.ts
import { readFileSync } from 'fs'
import YAML from 'yaml'
import { globSync } from 'glob'

interface ContractViolation {
  type: 'missing-in-frontend' | 'missing-in-openapi' | 'type-mismatch'
  endpoint: { method: string; path: string }
  severity: 'error' | 'warning'
  description: string
}

function extractFrontendEndpoints(): Set<string> {
  const apiFiles = globSync('frontend/web/src/lib/api*.ts')
  const endpoints = new Set<string>()
  
  for (const file of apiFiles) {
    const content = readFileSync(file, 'utf8')
    // 提取 http.get/post 调用
    const matches = content.matchAll(/http\.(get|post|put|patch|delete)<.*?>\([`'"]([^`'"]+)[`'"]/g)
    for (const match of matches) {
      const method = match[1].toUpperCase()
      const path = match[2]
      endpoints.add(`${method} ${path}`)
    }
  }
  
  return endpoints
}

function extractOpenAPIEndpoints(): Set<string> {
  const openapi = YAML.parse(
    readFileSync('specs/001-bilibili-monitor/api/openapi.yaml', 'utf8')
  )
  const endpoints = new Set<string>()
  
  for (const [path, methods] of Object.entries(openapi.paths)) {
    for (const method of Object.keys(methods as any)) {
      endpoints.add(`${method.toUpperCase()} ${path}`)
    }
  }
  
  return endpoints
}

function validateContract(): ContractViolation[] {
  const frontend = extractFrontendEndpoints()
  const openapi = extractOpenAPIEndpoints()
  const violations: ContractViolation[] = []
  
  // 检查前端调用但 OpenAPI 未定义
  for (const endpoint of frontend) {
    if (!openapi.has(endpoint)) {
      const [method, path] = endpoint.split(' ')
      violations.push({
        type: 'missing-in-openapi',
        endpoint: { method, path },
        severity: 'error',
        description: `前端调用了 ${endpoint}，但 OpenAPI 中未定义此端点`
      })
    }
  }
  
  // 检查 OpenAPI 定义但前端未使用
  for (const endpoint of openapi) {
    if (!frontend.has(endpoint)) {
      const [method, path] = endpoint.split(' ')
      violations.push({
        type: 'missing-in-frontend',
        endpoint: { method, path },
        severity: 'warning',
        description: `OpenAPI 定义了 ${endpoint}，但前端未实现调用函数`
      })
    }
  }
  
  return violations
}

// 运行验证
const violations = validateContract()

console.log('\n📊 接口契约验证报告\n')
console.log(`总端点数: ${violations.length}`)
console.log(`错误: ${violations.filter(v => v.severity === 'error').length}`)
console.log(`警告: ${violations.filter(v => v.severity === 'warning').length}`)

if (violations.length > 0) {
  console.log('\n详细列表:\n')
  for (const v of violations) {
    const icon = v.severity === 'error' ? '❌' : '⚠️'
    console.log(`${icon} [${v.type}] ${v.endpoint.method} ${v.endpoint.path}`)
    console.log(`   ${v.description}\n`)
  }
  
  process.exit(violations.some(v => v.severity === 'error') ? 1 : 0)
} else {
  console.log('\n✅ 所有接口已对齐！\n')
}
```

### 运行契约验证

```bash
# 在 package.json 中添加脚本
"scripts": {
  "validate:contract": "bun run scripts/validate-api-contract.ts"
}

# 运行验证
bun run validate:contract
```

---

## 测试优先级

### Phase 1: 关键接口对齐（P1，约 5 天）

1. **Auth 模块**：补全 logout 和 fetchProfile
2. **Accounts 模块**：补全 Cookie 绑定和扫码登录流程
3. **Tasks 模块**：补全创建、更新、删除、批量操作
4. **Metrics 模块**：补全视频和博主指标查询

### Phase 2: 次要接口和测试（P2，约 3 天）

5. **Media 模块**：补全封面和头像获取
6. **Alerts 模块**：补全告警规则管理
7. **Settings 模块**：补全系统设置
8. 为所有端点编写集成测试

### Phase 3: OpenAPI 更新和完善（P3，约 1 天）

9. 将 Notifications 相关端点添加到 OpenAPI
10. 完善其他模块的测试覆盖

---

## 总结

本文档提供了完整的 API 测试覆盖清单，明确标记了需要补全的前端函数（22 个）和需要添加的 OpenAPI 定义（3 个）。通过自动化契约验证脚本，可以持续监测前后端接口的一致性，确保项目的接口质量。

