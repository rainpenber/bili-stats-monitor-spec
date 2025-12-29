# 系统设置页面账号列表自动刷新修复

## 问题描述

在账号管理页面绑定新账号后，系统设置页面的"全局默认账号"部分没有自动更新，仍然显示"暂无已绑定账号"。

## 根因分析

`SettingsPage` 组件只在初始挂载时（`useEffect` 依赖为空数组）加载账号列表。当用户：
1. 在系统设置页面
2. 导航到账号管理页面
3. 绑定新账号
4. 返回系统设置页面

此时 `useEffect` 不会再次执行，因为组件没有卸载和重新挂载，导致账号列表没有刷新。

## 修复方案

### 1. 自定义事件机制

在 `AccountBindModal` 中，当账号绑定成功时触发自定义事件：

```typescript
const handleBindSuccess = () => {
  // 触发自定义事件，通知其他组件账号已绑定
  window.dispatchEvent(new CustomEvent('account:bound'))
  onClose()
}
```

### 2. 事件监听与自动刷新

在 `SettingsPage` 中监听该事件，自动刷新账号列表：

```typescript
// 监听自定义事件：当账号绑定成功时刷新
useEffect(() => {
  const handleAccountBound = () => {
    // 延迟刷新，确保后端数据已更新
    setTimeout(() => {
      loadAccounts()
      setLastRefreshTime(Date.now())
    }, 500)
  }

  window.addEventListener('account:bound', handleAccountBound)

  return () => {
    window.removeEventListener('account:bound', handleAccountBound)
  }
}, [])
```

### 3. 路由变化监听（备用机制）

同时监听路由变化，当导航到设置页面时也刷新（带防抖）：

```typescript
// 监听路由变化：当导航到设置页面时刷新账号列表
useEffect(() => {
  if (location.pathname === '/settings') {
    const now = Date.now()
    // 如果距离上次刷新超过2秒，或者这是首次加载，则刷新
    if (now - lastRefreshTime > 2000 || lastRefreshTime === 0) {
      const timer = setTimeout(() => {
        loadAccounts()
        setLastRefreshTime(Date.now())
      }, 300)
      return () => clearTimeout(timer)
    }
  }
}, [location.pathname, lastRefreshTime])
```

## 修复效果

### 修复前：
- ❌ 绑定账号后，系统设置页面仍显示"暂无已绑定账号"
- ❌ 需要手动刷新页面或点击"刷新"按钮

### 修复后：
- ✅ 绑定账号成功后，系统设置页面自动刷新
- ✅ 显示新绑定的账号列表
- ✅ 无需手动操作

## 技术要点

1. **自定义事件**: 使用浏览器原生 `CustomEvent` API 实现组件间通信
2. **事件清理**: 在 `useEffect` 的清理函数中移除事件监听器，避免内存泄漏
3. **防抖机制**: 路由变化监听添加2秒防抖，避免过于频繁的刷新
4. **延迟刷新**: 绑定成功后延迟500ms刷新，确保后端数据已更新

## 修改文件

- **`frontend/web/src/pages/SettingsPage.tsx`**:
  - 添加 `useLocation` hook
  - 添加自定义事件监听器
  - 添加路由变化监听（带防抖）

- **`frontend/web/src/components/modals/AccountBindModal.tsx`**:
  - 在 `handleBindSuccess` 中触发 `account:bound` 事件

## 测试场景

1. ✅ 在账号管理页面绑定新账号 → 系统设置页面自动刷新
2. ✅ 从其他页面导航到系统设置页面 → 自动刷新（防抖保护）
3. ✅ 手动点击"刷新"按钮 → 正常工作
4. ✅ 页面首次加载 → 正常加载账号列表

## 修复日期

2025-12-28


