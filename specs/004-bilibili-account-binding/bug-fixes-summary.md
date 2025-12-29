# Bilibili Account Binding - Bug Fixes Summary

## 问题列表与修复

### Bug 1: QR Code 轮询在绑定成功后继续运行

**问题描述**:
- 用户扫码确认登录后，后端返回 `status: 'confirmed'`
- 前端显示绑定成功并关闭 modal
- 但 QR code 轮询定时器继续运行，直到二维码过期

**根因分析**:
1. `useQRCodePolling` Hook 中的 `poll` 函数使用了 `onSuccess` 和 `onExpired` 作为依赖
2. 每次父组件重新渲染时，这些回调函数被重新创建
3. `poll` 函数随之重建，触发 `useEffect` 重新执行
4. 即使 `status` 已经是 `'confirmed'`，新的定时器仍被创建

**修复方案**:
1. 使用 `useRef` 存储 `onSuccess` 和 `onExpired` 回调，避免 `poll` 函数频繁重建
2. 在 `poll` 函数的 `switch` 语句中，`confirmed` 和 `expired` 分支立即调用 `clearInterval` 和 `setIsPolling(false)`
3. 移除 `onSuccess` 和 `onExpired` 从 `poll` 的依赖数组

**修改文件**:
- `frontend/web/src/hooks/useQRCodePolling.ts`

**关键代码片段**:
```typescript
// 使用 ref 存储最新的回调，避免 poll 函数频繁重建
const onSuccessRef = useRef(onSuccess)
const onExpiredRef = useRef(onExpired)

// 更新回调 ref
useEffect(() => {
  onSuccessRef.current = onSuccess
  onExpiredRef.current = onExpired
}, [onSuccess, onExpired])

// 在 confirmed 分支立即清理定时器
case 'confirmed':
  if (timerRef.current) {
    clearInterval(timerRef.current)
    timerRef.current = null
  }
  setIsPolling(false)
  
  if (result.account) {
    setAccount(result.account)
    onSuccessRef.current?.(result.account) // 使用 ref 中的回调
  }
  break
```

---

### Bug 2: 绑定成功后账号列表不自动刷新

**问题描述**:
- 用户扫码绑定账号成功，modal 关闭
- 账号列表页面不自动刷新，仍显示旧数据
- 用户需要手动刷新页面才能看到新绑定的账号

**根因分析**:
1. `AccountBindModal` 的 `handleBindSuccess` 只调用了 `onClose()`
2. `AccountsPage` 没有监听 modal 关闭事件
3. `AccountList` 的 `loadAccounts` 方法未暴露给父组件

**修复方案**:
1. 将 `AccountList` 改为 `forwardRef` 组件，使用 `useImperativeHandle` 暴露 `reload()` 方法
2. 在 `AccountsPage` 中使用 `useRef` 引用 `AccountList` 组件
3. 添加 `useEffect` 监听 `accountBindOpen` 状态变化
4. 当 modal 关闭时 (`!accountBindOpen`)，自动调用 `accountListRef.current?.reload()`

**修改文件**:
- `frontend/web/src/components/bilibili/AccountList.tsx`
- `frontend/web/src/pages/AccountsPage.tsx`

**关键代码片段**:

**AccountList.tsx**:
```typescript
export interface AccountListRef {
  reload: () => void
}

export const AccountList = forwardRef<AccountListRef, AccountListProps>(({ onBindNew, onRebind }, ref) => {
  // ... existing code ...

  // 暴露 reload 方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      loadAccounts()
    }
  }), [])

  // ... rest of component ...
})
```

**AccountsPage.tsx**:
```typescript
export default function AccountsPage() {
  const { setAccountBindOpen, accountBindOpen } = useUISelection()
  const accountListRef = useRef<{ reload: () => void } | null>(null)

  // 监听 modal 关闭，刷新账号列表
  useEffect(() => {
    if (!accountBindOpen) {
      // Modal 关闭时刷新列表
      accountListRef.current?.reload()
    }
  }, [accountBindOpen])

  return (
    // ...
    <AccountList ref={accountListRef} onBindNew={handleBindNew} onRebind={handleRebind} />
    // ...
  )
}
```

---

### Bug 3: AlertDialog 与原生 alert 冲突

**问题描述**:
- "解绑" 按钮使用了 UI 库的 `AlertDialog` 组件
- 但仍会触发原生浏览器 `alert` 对话框

**根因分析**:
- `AccountList.tsx` 中的 `handleUnbind` 函数仍保留了 `window.confirm()` 调用
- `AlertDialog` 的确认按钮触发后，又触发了 `window.confirm()`

**修复方案**:
- 从 `AccountList.tsx` 中移除 `window.confirm()` 调用
- 所有确认逻辑由 `AlertDialog` 在 `AccountListItem.tsx` 中处理

**修改文件**:
- `frontend/web/src/components/bilibili/AccountList.tsx`

**关键代码片段**:
```typescript
// 解绑账号
const handleUnbind = async (accountId: string) => {
  // ❌ 移除: if (!window.confirm('确定要解绑此账号吗？...')) return
  
  setUnbindingAccountId(accountId)
  try {
    await unbindBilibiliAccount(accountId)
    toast.success('账号解绑成功')
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountId))
  } catch (err: any) {
    // ... error handling ...
  } finally {
    setUnbindingAccountId(null)
  }
}
```

---

## 测试验证

所有修复均已通过运行时验证：

1. **QR Code 轮询停止**: 日志确认 `CONFIRMED branch entered` 和 `Timer cleared in confirmed`
2. **账号列表自动刷新**: 日志确认 `Modal closed, triggering reload` 和 `reload method called`
3. **AlertDialog 正常工作**: 移除 `window.confirm()` 后，仅显示 AlertDialog

## 相关文件

- `frontend/web/src/hooks/useQRCodePolling.ts` - QR code 轮询逻辑
- `frontend/web/src/components/bilibili/AccountList.tsx` - 账号列表组件
- `frontend/web/src/components/bilibili/AccountListItem.tsx` - 账号项组件（AlertDialog）
- `frontend/web/src/pages/AccountsPage.tsx` - 账号管理页面
- `frontend/web/src/components/modals/AccountBindModal.tsx` - 绑定 modal

## 修复日期

2025-12-28


