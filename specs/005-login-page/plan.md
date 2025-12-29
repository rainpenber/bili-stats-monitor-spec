# Implementation Plan: 用户登录页面

**Branch**: `005-login-page` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-login-page/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能实现完整的用户登录与认证系统，包括：
1. **独立登录页面** (`/login`) - 用户主动登录或首次访问
2. **登录Modal** - 在用户操作过程中弹出，避免页面跳转
3. **侧边栏用户状态模块** - 显示登录状态、用户头像、登出按钮
4. **路由守卫** - 保护需要认证的页面
5. **HTTP拦截器** - 自动注入JWT token，处理401错误

**技术路线**:
- 前端使用React + React Router + Zustand进行状态管理
- 后端API已就绪 (`POST /api/v1/auth/login`)，无需修改
- JWT token存储在localStorage/sessionStorage
- 401响应自动触发登录Modal并支持Pending Action重试

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), TypeScript 5.x + Bun 1.2+ (Backend - 已就绪)  
**Primary Dependencies**: 
- Frontend: React 18, React Router 6, Zustand, Zod, Axios (http客户端)
- Backend: Hono, Jose (JWT), Drizzle ORM (已就绪，无需修改)

**Storage**: SQLite (users表已存在，包含id, username, passwordHash, role字段)  
**Testing**: Vitest (Frontend unit tests), Bun test (Backend - 已有测试基础设施)  
**Target Platform**: Web浏览器 (Chrome/Firefox/Safari最新版)  
**Project Type**: Web应用 (Monorepo结构: frontend/web + backend)  
**Performance Goals**: 
- 登录请求响应时间 < 500ms
- 登录Modal打开延迟 < 300ms
- Token验证 < 100ms
- 路由守卫检查 < 50ms

**Constraints**: 
- JWT token有效期24小时（后端配置）
- localStorage存储限制 ~5MB（token约1KB，无问题）
- 支持同账号多设备登录
- 不支持用户注册（仅管理员admin/admin123）

**Scale/Scope**: 
- 单用户系统（管理员）
- 6个用户故事 (5个P1, 1个P3)
- 24个功能需求 (FR-001至FR-024)
- 约15个新文件 + 6个修改文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Front-End First**:  
  - ✅ 前端视图已详细描述：独立登录页面、登录Modal、侧边栏用户状态模块
  - ✅ 用户交互流程明确：点击登录按钮 → 填写表单 → API调用 → token存储 → UI更新
  - ✅ 6个用户故事均从用户视角出发，而非数据模型或后端结构

- ✅ **API Contract Before Backend**:  
  - ✅ API合约已在spec.md中定义 (FR-016至FR-020)
  - ✅ 后端API已实现并验证 (`POST /api/v1/auth/login`)
  - ✅ 请求/响应结构明确：`{ username, password }` → `{ token, user: { id, username, role } }`
  - ✅ 错误码已定义：401 (未授权), 400 (验证失败), 500 (服务器错误)

- ✅ **Bun Runtime Alignment**:  
  - ✅ 后端已在Bun运行时下运行，无需修改
  - ✅ 前端使用Vite构建，与Bun无冲突
  - ✅ 所有依赖与Bun兼容（Hono, Jose, Drizzle已验证）

- ✅ **Monorepo + pnpm + Vite**:  
  - ✅ 项目结构符合：`frontend/web/` (Vite应用) + `backend/` (Bun服务)
  - ✅ 使用pnpm workspace管理依赖
  - ✅ 前端使用Vite dev server + HMR

- ✅ **Incremental Delivery & Simplicity**:  
  - ✅ 功能已拆分为6个独立用户故事，每个可独立交付
  - ✅ P1故事（登录页面、Modal、侧边栏、路由守卫）可形成MVP
  - ✅ P2-P3故事（退出登录、记住我）可后续添加
  - ✅ 无过度抽象，复用现有Modal/Zustand/HTTP客户端

- ✅ **Layered Architecture & Separation of Concerns**:  
  - ✅ 后端已遵循分层架构：`routes/auth.ts` (路由层) → `services/auth.ts` (服务层) → Drizzle ORM (数据层)
  - ✅ 前端也遵循分层：组件层 → hooks层 → API层 → HTTP客户端
  - ✅ 路由层仅处理HTTP请求，数据库操作在服务层完成

**总结**: 🎉 **通过所有宪章检查，无违规项**

## Project Structure

### Documentation (this feature)

```text
specs/005-login-page/
├── spec.md              # Feature specification (已完成)
├── plan.md              # This file (当前文档)
├── research.md          # Phase 0 output (技术调研结果)
├── data-model.md        # Phase 1 output (数据模型设计)
├── quickstart.md        # Phase 1 output (开发快速上手指南)
├── contracts/           # Phase 1 output (API合约)
│   └── auth-api.yaml    # OpenAPI 3.0规范
├── checklists/          # 质量检查清单
│   └── requirements.md  # 需求质量检查（已完成）
└── tasks.md             # Phase 2 output (/speckit.tasks - 待生成)
```

### Source Code (repository root)

```text
# Frontend
frontend/web/
├── src/
│   ├── pages/
│   │   └── LoginPage.tsx                    # [NEW] 独立登录页面
│   ├── components/
│   │   ├── auth/                            # [NEW] 认证相关组件目录
│   │   │   ├── LoginModal.tsx               # [NEW] 登录Modal组件
│   │   │   ├── LoginForm.tsx                # [NEW] 登录表单（复用）
│   │   │   ├── UserStatus.tsx               # [NEW] 侧边栏用户状态模块
│   │   │   └── ProtectedRoute.tsx           # [NEW] 路由守卫HOC
│   │   └── ui/
│   │       └── Modal.tsx                    # [EXISTS] 复用现有Modal
│   ├── hooks/
│   │   ├── useAuth.ts                       # [NEW] 认证状态管理Hook
│   │   └── usePendingAction.ts              # [NEW] Pending Action管理Hook
│   ├── store/
│   │   └── uiSelection.ts                   # [MODIFY] 添加loginModalOpen状态
│   ├── lib/
│   │   ├── api.ts                           # [MODIFY] 添加login/logout方法
│   │   ├── http.ts                          # [MODIFY] 添加拦截器
│   │   └── validations/
│   │       └── authSchemas.ts               # [NEW] 登录表单Zod验证
│   ├── utils/
│   │   ├── token.ts                         # [NEW] Token存储/读取/删除
│   │   └── authInterceptor.ts               # [NEW] HTTP拦截器逻辑
│   ├── types/
│   │   └── auth.ts                          # [NEW] 认证相关TypeScript类型
│   ├── layouts/
│   │   └── AppLayout.tsx                    # [MODIFY] 添加UserStatus组件
│   └── App.tsx                              # [MODIFY] 添加登录路由和路由守卫
└── tests/
    └── components/
        └── auth/                            # [NEW] 认证组件单元测试

# Backend (无需修改，仅记录已有资产)
backend/
├── src/
│   ├── routes/
│   │   └── auth.ts                          # [EXISTS] 登录API路由
│   ├── services/
│   │   └── auth.ts                          # [EXISTS] 认证服务层
│   └── db/
│       └── schema.ts                        # [EXISTS] users表定义
└── tests/
    └── routes/
        └── auth.test.ts                     # [EXISTS] 登录API测试
```

**Structure Decision**: 
采用 **Web应用结构（Option 2）**，前后端分离：
- `frontend/web/` - React + Vite应用，包含所有认证UI组件
- `backend/` - Bun + Hono服务，已有认证API（无需修改）
- 新增约15个前端文件，修改6个现有文件
- 后端无需任何修改，API已就绪

## Complexity Tracking

**无宪章违规项** - 本节留空

## Phase 0: Research & Unknowns

### Research Tasks

#### R1: JWT Token存储最佳实践

**研究问题**: localStorage vs sessionStorage vs httpOnly Cookie，哪种方式最适合本项目？

**调研结果**:

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **localStorage** | 浏览器关闭后保持登录，用户体验好 | 易受XSS攻击，无法设置过期时间 | 需要"记住我"功能的SPA应用 |
| **sessionStorage** | 浏览器关闭后自动清除，更安全 | 用户体验稍差，每次打开需登录 | 对安全性要求高的应用 |
| **httpOnly Cookie** | 最安全，JavaScript无法访问 | CORS复杂，不适合SPA架构 | 传统服务端渲染应用 |

**决策**: **localStorage（支持"记住我"）+ sessionStorage（默认）**

**理由**:
1. ✅ 本项目是SPA应用，使用localStorage/sessionStorage更符合架构
2. ✅ 后端已返回JWT token，前端需要存储并在每次请求中携带
3. ✅ 用户可选择"记住我"功能，提供灵活性
4. ⚠️ XSS风险通过输入sanitization和CSP策略缓解
5. ✅ 符合规范FR-004, FR-008, FR-013

**替代方案被拒绝原因**:
- httpOnly Cookie需要后端设置Set-Cookie，当前后端API设计为返回token，改动成本高
- 仅使用sessionStorage会影响用户体验（P3需求"记住我"无法实现）

---

#### R2: 登录Modal触发机制与Pending Action设计

**研究问题**: 如何优雅地处理401错误并触发登录Modal，同时支持登录后自动重试操作？

**调研结果**:

**触发机制**:
1. **HTTP拦截器模式** (推荐)
   - 在`http.ts`中添加response interceptor
   - 检测到401状态码时，触发全局事件或调用Zustand action
   - 优点：集中处理，所有API自动支持
   - 缺点：需要全局状态管理

2. **组件级try-catch**
   - 每个组件自行catch 401错误
   - 优点：灵活，可定制
   - 缺点：代码重复，容易遗漏

**Pending Action设计**:
```typescript
interface PendingAction {
  type: 'api-call' | 'modal-open'
  payload: {
    apiCall?: () => Promise<any>  // 重试API请求
    modalAction?: () => void        // 重新打开功能Modal
  }
}
```

**决策**: **HTTP拦截器 + Zustand状态管理**

**理由**:
1. ✅ 符合规范FR-006, FR-011, FR-020
2. ✅ 集中处理，减少代码重复
3. ✅ 可以记录完整的请求上下文（URL, method, body）
4. ✅ 支持多种Pending Action类型（API重试、Modal重开）

**实现方案**:
```typescript
// 1. HTTP拦截器捕获401
http.interceptor.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      // 保存当前请求为Pending Action
      const pendingAction = () => http.request(error.config)
      store.openLoginModal(pendingAction)
    }
    return Promise.reject(error)
  }
)

// 2. 登录成功后重试
async function handleLoginSuccess(token: string) {
  saveToken(token)
  const action = store.getPendingAction()
  store.closeLoginModal()
  if (action) {
    await action()  // 自动重试
  }
}
```

---

#### R3: React Router 6路由守卫实现模式

**研究问题**: React Router v6如何实现路由守卫（Protected Routes）？

**调研结果**:

**方案1: HOC组件包装**
```typescript
<Route path="/accounts" element={
  <ProtectedRoute>
    <AccountsPage />
  </ProtectedRoute>
} />
```

**方案2: loader函数检查**
```typescript
<Route
  path="/accounts"
  element={<AccountsPage />}
  loader={() => {
    if (!isAuthenticated()) {
      throw redirect('/login')
    }
    return null
  }}
/>
```

**方案3: 自定义Route组件**
```typescript
<ProtectedRoute path="/accounts" element={<AccountsPage />} />
```

**决策**: **方案1 - HOC组件包装**

**理由**:
1. ✅ 简单直观，易于理解和维护
2. ✅ 支持细粒度控制（可以在组件内弹出Modal而非跳转）
3. ✅ 符合规范FR-021至FR-023（优先弹出Modal）
4. ✅ 可以复用现有的`isAuthenticated()`检查逻辑

**实现示例**:
```typescript
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth()
  const { openLoginModal } = useUISelection()

  useEffect(() => {
    if (!isAuthenticated) {
      openLoginModal()  // 弹出Modal，而非跳转
    }
  }, [isAuthenticated])

  return isAuthenticated ? <>{children}</> : null
}
```

---

#### R4: 侧边栏用户状态UI设计

**研究问题**: 如何在导航菜单末尾优雅地展示用户状态？

**调研结果**:

**布局方案**:
```tsx
{/* 现有导航菜单 */}
<nav className="space-y-1">
  <NavItem to="/" label="仪表板" />
  <NavItem to="/accounts" label="账号管理" />
  {/* ... 其他菜单项 ... */}
  
  {/* 分隔线 */}
  <div className="border-t border-border my-2" />
  
  {/* 用户状态模块 */}
  <UserStatus />
</nav>
```

**UserStatus组件设计**:
```tsx
function UserStatus() {
  const { user, isAuthenticated } = useAuth()
  const { openLoginModal } = useUISelection()
  const handleLogout = () => { /* ... */ }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-sm text-muted-foreground">未登录</span>
        <Button size="sm" onClick={openLoginModal}>登录</Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <img src={user.avatar || '/default-avatar.png'} className="w-8 h-8 rounded-full" />
      <span className="text-sm font-medium">{user.username}</span>
      <Button size="sm" variant="ghost" onClick={handleLogout}>
        <LogOutIcon className="w-4 h-4" />
      </Button>
    </div>
  )
}
```

**决策**: **采用上述布局和组件设计**

**理由**:
1. ✅ 符合规范FR-003至FR-005
2. ✅ 视觉清晰，已登录/未登录状态易于区分
3. ✅ 操作便捷，登录/登出按钮触手可及
4. ✅ 符合用户预期（类似VS Code、GitHub等应用）

---

### Research Summary

| 编号 | 研究主题 | 决策 | 关键依赖 |
|------|---------|------|---------|
| R1 | Token存储 | localStorage + sessionStorage | - |
| R2 | 登录Modal触发 | HTTP拦截器 + Zustand | Zustand, Axios interceptors |
| R3 | 路由守卫 | HOC组件包装 | React Router 6 |
| R4 | 侧边栏UI | 分隔线+UserStatus组件 | - |

**所有NEEDS CLARIFICATION已解决** ✅

---

## Phase 1: Design Artifacts

### Data Model

参见 [data-model.md](./data-model.md)（将在下一步生成）

### API Contracts

参见 [contracts/auth-api.yaml](./contracts/auth-api.yaml)（将在下一步生成）

### Development Guide

参见 [quickstart.md](./quickstart.md)（将在下一步生成）

---

## Implementation Phases (Preview)

**注意**: 详细任务将由 `/speckit.tasks` 命令生成到 `tasks.md`

### Phase 1: 基础设施 (Foundation)
- 创建类型定义 (`types/auth.ts`)
- 创建Token工具 (`utils/token.ts`)
- 扩展Zustand store（添加登录Modal状态）
- 实现HTTP拦截器 (`utils/authInterceptor.ts`)

### Phase 2: 认证组件 (Auth Components)
- 创建LoginForm组件
- 创建LoginModal组件
- 创建独立LoginPage
- 创建UserStatus组件

### Phase 3: 路由保护 (Route Protection)
- 创建ProtectedRoute组件
- 更新App.tsx路由配置
- 创建useAuth Hook

### Phase 4: 集成与测试 (Integration & Testing)
- 集成所有组件
- 端到端测试
- 文档更新

---

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| XSS攻击导致token泄露 | HIGH | 输入sanitization + CSP策略 |
| Token过期处理不当 | MEDIUM | 401拦截器 + 用户友好提示 |
| 路由守卫遗漏 | MEDIUM | 代码审查 + 清单检查 |
| 浏览器兼容性 | LOW | 使用标准API，Vite自动polyfill |

---

## Success Metrics

与spec.md中的Success Criteria一致：
- SC-001: 登录完成 < 10秒
- SC-004: Token过期重定向 < 2秒
- SC-008: Pending Action重试 < 2秒
- SC-009: 侧边栏状态更新 < 0.5秒
- SC-010: Modal弹出 < 0.3秒

---

**Plan Status**: ✅ Phase 0完成，准备进入Phase 1（Design Artifacts生成）
