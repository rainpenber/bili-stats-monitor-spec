# Research Document: 用户登录页面

**Feature**: 005-login-page  
**Date**: 2025-12-27  
**Status**: ✅ Completed

## Overview

本文档记录了用户登录功能实施前的技术调研结果，解决了所有NEEDS CLARIFICATION问题，为详细设计和实施提供技术基础。

---

## R1: JWT Token存储最佳实践

### 研究问题
localStorage vs sessionStorage vs httpOnly Cookie，哪种方式最适合本项目？

### 调研过程

**评估标准**:
1. 安全性（XSS、CSRF防护）
2. 用户体验（是否保持登录）
3. 实施复杂度（与现有架构兼容性）
4. 功能需求（支持"记住我"）

**方案对比**:

| 方案 | 安全性 | UX | 复杂度 | 支持"记住我" | 备注 |
|------|--------|----|---------|-----------| -----|
| localStorage | ⚠️ Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | 易受XSS攻击，但实施简单 |
| sessionStorage | ⚠️ Medium | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | 浏览器关闭后丢失 |
| httpOnly Cookie | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ | 需要后端设置，CORS复杂 |

### 决策

**选择**: **localStorage（支持"记住我"）+ sessionStorage（默认）**

**理由**:
1. ✅ 本项目是SPA应用，localStorage/sessionStorage更符合架构
2. ✅ 后端已返回JWT token字符串，前端需自行存储
3. ✅ 用户可选择"记住我"功能，提供灵活性
4. ⚠️ XSS风险通过以下措施缓解：
   - 所有用户输入经过sanitization（react-hook-form + Zod验证）
   - 启用Content Security Policy（CSP）头部
   - 定期token rotation（后端24小时过期）
5. ✅ 符合规范FR-004, FR-008, FR-013

### 替代方案被拒绝原因

- **httpOnly Cookie**: 需要修改后端API设计（从返回token改为Set-Cookie响应头），改动成本高，且与现有API合约不兼容
- **仅sessionStorage**: 无法实现P3需求"记住我"功能，用户体验差

### 参考资料

- [OWASP: Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheatsheet.html)
- [Auth0: Where to Store Tokens](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)

---

## R2: 登录Modal触发机制与Pending Action设计

### 研究问题
如何优雅地处理401错误并触发登录Modal，同时支持登录后自动重试操作？

### 调研过程

**触发机制对比**:

1. **HTTP拦截器模式** (推荐)
   - 在`http.ts`中添加response interceptor
   - 检测到401状态码时，触发全局事件或调用Zustand action
   - 优点：集中处理，所有API自动支持，无代码重复
   - 缺点：需要全局状态管理

2. **组件级try-catch**
   - 每个组件自行catch 401错误并处理
   - 优点：灵活，可针对不同场景定制
   - 缺点：代码重复，容易遗漏，维护成本高

3. **HOC包装**
   - 用Higher-Order Component包装需要鉴权的组件
   - 优点：声明式，易于识别
   - 缺点：嵌套层级深，不适合处理异步API调用

**Pending Action设计**:

```typescript
interface PendingAction {
  type: 'api-call' | 'modal-open' | 'navigation'
  payload: {
    // API重试
    apiCall?: () => Promise<any>
    
    // Modal重开
    modalAction?: () => void
    
    // 页面跳转
    redirectPath?: string
  }
  metadata?: {
    timestamp: number
    attemptCount: number
  }
}
```

### 决策

**选择**: **HTTP拦截器 + Zustand状态管理 + 简化Pending Action**

**理由**:
1. ✅ 符合规范FR-006, FR-011, FR-020
2. ✅ 集中处理，减少代码重复，降低遗漏风险
3. ✅ 可以记录完整的请求上下文（URL, method, headers, body）
4. ✅ 支持多种Pending Action类型（API重试、Modal重开、页面导航）
5. ✅ Zustand作为全局状态管理，易于跨组件访问

**实现方案**:

```typescript
// 1. HTTP拦截器捕获401
function setupAuthInterceptor() {
  const originalRequest = http.request.bind(http)
  
  http.request = async (config) => {
    try {
      return await originalRequest(config)
    } catch (error) {
      if (error.status === 401 && !config._retry) {
        // 保存当前请求为Pending Action
        const pendingAction = () => {
          return http.request({ ...config, _retry: true })
        }
        
        // 打开登录Modal
        useUISelection.getState().openLoginModal(pendingAction)
      }
      throw error
    }
  }
}

// 2. 登录成功后重试
async function handleLoginSuccess(token: string) {
  saveToken(token)
  
  const { pendingAction, closeLoginModal, clearPendingAction } = useUISelection.getState()
  closeLoginModal()
  
  if (pendingAction) {
    try {
      await pendingAction()  // 自动重试之前失败的请求
    } finally {
      clearPendingAction()
    }
  }
}
```

### 替代方案被拒绝原因

- **组件级try-catch**: 需要在每个组件中手动处理，容易遗漏，维护成本高
- **HOC包装**: 只能处理组件挂载时的鉴权检查，无法处理异步API调用中的401错误

### 边缘情况处理

1. **并发401错误**: 只打开一个登录Modal，后续401错误排队
2. **Modal关闭但未登录**: 清空Pending Action，用户需重新触发操作
3. **Token在重试前再次过期**: 重试失败，再次触发401处理流程

---

## R3: React Router 6路由守卫实现模式

### 研究问题
React Router v6如何实现路由守卫（Protected Routes），并且优先弹出Modal而非跳转页面？

### 调研过程

**方案对比**:

| 方案 | 实现复杂度 | 支持Modal | 可维护性 | 备注 |
|------|-----------|----------|---------|------|
| **HOC包装** | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ | 简单直观，推荐 |
| **loader函数** | ⭐⭐⭐ | ❌ | ⭐⭐⭐ | 只能redirect，无法弹Modal |
| **自定义Route** | ⭐⭐ | ✅ | ⭐⭐⭐ | 过度封装，不灵活 |

### 决策

**选择**: **HOC组件包装**

**实现示例**:

```typescript
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { openLoginModal } = useUISelection()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) {
      // 记录用户想访问的路径
      sessionStorage.setItem('redirect_after_login', location.pathname)
      
      // 弹出登录Modal（而非跳转到/login页面）
      openLoginModal()
    }
  }, [isAuthenticated, location.pathname])

  // 已登录：正常渲染子组件
  // 未登录：返回null（Modal会在AppLayout中渲染）
  return isAuthenticated ? <>{children}</> : null
}

// 使用方式
<Route
  path="/accounts"
  element={
    <ProtectedRoute>
      <AccountsPage />
    </ProtectedRoute>
  }
/>
```

**理由**:
1. ✅ 符合规范FR-021至FR-023（优先弹出Modal）
2. ✅ 简单直观，易于理解和维护
3. ✅ 支持细粒度控制（可以在组件内弹出Modal而非跳转）
4. ✅ 可以复用现有的`useAuth()` Hook
5. ✅ 支持登录后自动跳转到原始页面（通过sessionStorage记录）

### 备选方案：独立登录页面 `/login`

对于用户**主动访问**的场景，保留独立登录页面：

```typescript
<Route
  path="/login"
  element={<LoginPage />}
  loader={() => {
    // 已登录用户访问/login时，重定向到仪表板
    if (isAuthenticated()) {
      return redirect('/')
    }
    return null
  }}
/>
```

---

## R4: 侧边栏用户状态UI设计

### 研究问题
如何在导航菜单末尾优雅地展示用户状态（已登录/未登录）？

### 调研过程

**参考案例**:
- VS Code: 左下角显示账号头像和设置图标
- GitHub: 右上角显示头像下拉菜单
- Discord: 左下角显示头像+用户名+状态

**布局方案**:

```tsx
{/* 现有导航菜单 */}
<nav className="space-y-1 flex-1">
  <NavItem to="/" label="仪表板" />
  <NavItem to="/accounts" label="账号管理" />
  <NavItem to="/notifications" label="通知设置" />
  <NavItem to="/logs" label="日志" />
  <NavItem to="/settings" label="系统设置" />
</nav>

{/* 分隔线 */}
<div className="border-t border-border my-2" />

{/* 用户状态模块（固定在底部） */}
<UserStatus />
```

### 决策

**选择**: **分隔线 + UserStatus组件（固定在侧边栏底部）**

**组件设计**:

```tsx
function UserStatus() {
  const { user, isAuthenticated, logout } = useAuth()
  const { openLoginModal } = useUISelection()

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-accent">
        <div className="flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">未登录</span>
        </div>
        <Button size="sm" variant="secondary" onClick={openLoginModal}>
          登录
        </Button>
      </div>
    )
  }

  // 已登录状态
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-accent">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt={user.username}
          className="w-8 h-8 rounded-full border border-border"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user.username}</div>
          <div className="text-xs text-muted-foreground">{user.role}</div>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={logout}
        title="登出"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}
```

**理由**:
1. ✅ 符合规范FR-003至FR-005
2. ✅ 视觉清晰，已登录/未登录状态易于区分
3. ✅ 操作便捷，登录/登出按钮触手可及
4. ✅ 符合用户预期（类似VS Code、Discord等应用的设计模式）
5. ✅ 响应式设计，支持用户名较长的情况（使用truncate）

### 集成到AppLayout

```tsx
// frontend/web/src/layouts/AppLayout.tsx
export default function AppLayout({ children }: PropsWithChildren) {
  // ... existing code ...
  
  return (
    <div className="h-full grid grid-cols-[240px_1fr]">
      <aside className="border-r border-border p-4 bg-card flex flex-col">
        <div className="text-xl font-semibold mb-4">Bili Monitor</div>
        
        {/* 导航菜单（占据剩余空间） */}
        <nav className="space-y-1 flex-1">
          <NavItem to="/" label="仪表板" />
          <NavItem to="/accounts" label="账号管理" />
          <NavItem to="/notifications" label="通知设置" />
          <NavItem to="/logs" label="日志" />
          <NavItem to="/settings" label="系统设置" />
        </nav>
        
        {/* 分隔线 */}
        <div className="border-t border-border my-2" />
        
        {/* 用户状态模块 */}
        <UserStatus />
      </aside>
      
      <main className="overflow-y-auto bg-background">
        {/* ... existing code ... */}
      </main>
    </div>
  )
}
```

---

## Summary

| 研究项 | 决策 | 关键依赖 | 风险缓解 |
|--------|------|---------|---------|
| R1: Token存储 | localStorage + sessionStorage | - | XSS防护：sanitization + CSP |
| R2: 401处理 | HTTP拦截器 + Pending Action | Zustand, Axios | 并发401排队处理 |
| R3: 路由守卫 | HOC包装 + Modal优先 | React Router 6, useAuth | 备选：独立登录页面 |
| R4: 用户状态UI | 侧边栏底部 + UserStatus组件 | - | 用户名truncate防溢出 |

**所有NEEDS CLARIFICATION已解决** ✅

**准备就绪**: 可以进入Phase 1详细设计（data-model.md, contracts/, quickstart.md）

