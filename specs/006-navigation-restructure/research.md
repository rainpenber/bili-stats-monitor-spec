# Research: 前端导航结构重组

**Feature**: 006-navigation-restructure  
**Date**: 2025-12-28  
**Purpose**: 解决Phase 0中识别的技术未知点，为Phase 1设计提供决策依据

---

## R1: SQLite数据库迁移策略（安全性与回滚）

### Decision

采用**两阶段迁移策略**：
1. **阶段1**: 添加字段(允许NULL或带临时默认值)
2. **阶段2**: 数据回填 + 添加NOT NULL约束

### Rationale

- **安全性**: SQLite的ALTER TABLE ADD COLUMN不支持直接添加NOT NULL列，必须先允许NULL或设置默认值
- **可回滚**: 分阶段执行允许在数据回填失败时回滚，不影响现有系统运行
- **Drizzle Kit兼容**: Drizzle会自动生成ALTER TABLE语句，但NOT NULL约束需要手动处理

### Alternatives Considered

| 方案 | 优点 | 缺点 | 为何未采纳 |
|------|------|------|-----------|
| **A: 创建新表+数据拷贝** | 完全控制，可添加任意约束 | 需要重建所有索引和外键，风险高 | 对现有系统影响太大，停机时间长 |
| **B: 直接添加NOT NULL列(DEFAULT '')** | 简单，一步完成 | 所有现有任务的author_uid为空字符串，语义不明确 | 数据质量差，后续难以区分"未填充"和"无效数据" |
| **C: 两阶段迁移(选中)** | 安全，可回滚，数据质量有保证 | 需要额外的数据回填脚本 | ✅ 平衡了安全性和可操作性 |

### Implementation Notes

#### 阶段1: Schema变更

**Drizzle Schema (`backend/src/db/schema.ts`)**:
```typescript
export const tasks = sqliteTable('tasks', {
  // ... 现有字段 ...
  authorUid: text('author_uid'),  // 初始允许NULL
  biliAccountId: text('bili_account_id'),  // 查询用账号，可为NULL
})
```

**生成迁移SQL**:
```bash
cd backend
bun run drizzle-kit generate:sqlite
```

**预期生成的SQL (`backend/src/db/migrations/0001_add_author_fields.sql`)**:
```sql
-- Step 1: Add columns (nullable)
ALTER TABLE `tasks` ADD COLUMN `author_uid` text;
ALTER TABLE `tasks` ADD COLUMN `bili_account_id` text;

-- Step 2: Create index for performance
CREATE INDEX `idx_tasks_author_uid` ON `tasks` (`author_uid`);
```

---

#### 阶段2: 数据回填

**回填脚本 (`backend/src/scripts/backfill-author-uid.ts`)**:

```typescript
import { loadEnv } from '../config/env'
import { createDatabase } from '../db'
import { tasks } from '../db/schema'
import { eq, isNull } from 'drizzle-orm'
import { biliClient } from '../services/bili/client'

const env = loadEnv()
const db = createDatabase(env.DATABASE_PATH)

async function backfillAuthorUid() {
  console.log('Starting author_uid backfill...')
  
  // 查询所有author_uid为NULL的任务
  const tasksToBackfill = await db
    .select()
    .from(tasks)
    .where(isNull(tasks.authorUid))
  
  console.log(`Found ${tasksToBackfill.length} tasks to backfill`)
  
  let success = 0
  let failed = 0
  
  for (const task of tasksToBackfill) {
    try {
      let authorUid: string
      
      if (task.type === 'video') {
        // 从B站API获取视频信息
        const videoInfo = await biliClient.getVideoInfo(task.targetId)
        authorUid = videoInfo.owner.mid.toString()
      } else if (task.type === 'author') {
        // 博主任务：author_uid = target_id
        authorUid = task.targetId
      } else {
        console.warn(`Unknown task type: ${task.type}, task_id: ${task.id}`)
        failed++
        continue
      }
      
      // 更新author_uid
      await db
        .update(tasks)
        .set({ authorUid })
        .where(eq(tasks.id, task.id))
      
      success++
      console.log(`✓ Task ${task.id} (${task.type}): author_uid = ${authorUid}`)
      
      // 避免频繁调用B站API
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`✗ Task ${task.id} failed:`, error)
      failed++
    }
  }
  
  console.log(`\nBackfill completed: ${success} success, ${failed} failed`)
  
  // 验证：检查是否还有NULL值
  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(isNull(tasks.authorUid))
  
  if (remaining[0].count === 0) {
    console.log('✓ All tasks have author_uid filled')
  } else {
    console.warn(`⚠ ${remaining[0].count} tasks still have NULL author_uid`)
  }
}

backfillAuthorUid().catch(console.error)
```

**执行回填**:
```bash
cd backend
bun run src/scripts/backfill-author-uid.ts
```

---

#### 阶段3: 添加NOT NULL约束（可选）

**注意**: SQLite不支持直接修改列约束，需要重建表。**生产环境不推荐**，建议：
- 在应用层强制验证author_uid非空
- 在数据写入时添加CHECK约束（新任务创建时）

如果必须添加NOT NULL约束：
```sql
-- 警告：此操作需要重建表，生产环境慎用
BEGIN TRANSACTION;

-- 1. 创建新表（带NOT NULL约束）
CREATE TABLE `tasks_new` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `target_id` text NOT NULL,
  -- ... 其他字段 ...
  `author_uid` text NOT NULL,  -- ✅ NOT NULL
  `bili_account_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

-- 2. 拷贝数据
INSERT INTO `tasks_new` SELECT * FROM `tasks`;

-- 3. 删除旧表
DROP TABLE `tasks`;

-- 4. 重命名新表
ALTER TABLE `tasks_new` RENAME TO `tasks`;

-- 5. 重建索引
CREATE INDEX `idx_tasks_author_uid` ON `tasks` (`author_uid`);

COMMIT;
```

---

### Rollback Plan

如果迁移失败，按以下步骤回滚：

**回滚阶段1 (移除列)**:
```sql
-- SQLite不支持DROP COLUMN，需要重建表
BEGIN TRANSACTION;

CREATE TABLE `tasks_backup` AS SELECT 
  id, type, target_id, title, cid, cid_retries, account_id,
  strategy, deadline, status, reason, tags, next_run_at,
  published_at, created_at, updated_at
FROM `tasks`;

DROP TABLE `tasks`;
ALTER TABLE `tasks_backup` RENAME TO `tasks`;

COMMIT;
```

**回滚阶段2 (恢复备份)**:
```bash
# 假设迁移前已备份数据库
cp backend/data/dev/bili-stats-dev.db.backup backend/data/dev/bili-stats-dev.db
```

**预防措施**:
- 迁移前必须备份数据库: `cp bili-stats-dev.db bili-stats-dev.db.backup`
- 在开发环境完整测试迁移流程
- 生产环境迁移时停止任务调度器，避免并发写入

---

### PostgreSQL Compatibility

由于项目支持dual database (SQLite + PostgreSQL)，迁移脚本需要分别生成：

**PostgreSQL迁移**:
```sql
-- PostgreSQL支持直接添加NOT NULL列(有默认值时)
ALTER TABLE tasks ADD COLUMN author_uid TEXT;
ALTER TABLE tasks ADD COLUMN bili_account_id TEXT;

-- 数据回填后添加NOT NULL约束
-- 先回填数据(使用相同的backfill脚本)
-- 然后:
ALTER TABLE tasks ALTER COLUMN author_uid SET NOT NULL;

CREATE INDEX idx_tasks_author_uid ON tasks(author_uid);
```

---

### Testing Checklist

- [ ] 在本地SQLite数据库上执行迁移，验证无错误
- [ ] 运行backfill脚本，确认所有任务的author_uid已填充
- [ ] 测试回滚流程，确认可恢复到迁移前状态
- [ ] 验证新任务创建时author_uid自动填充
- [ ] 检查索引性能：`EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE author_uid = '12345'`

---

## R2: Author Metrics数据聚合查询模式

### Decision

采用**SQL GROUP BY + MAX聚合**策略，按时间窗口去重粉丝数据，取每个时间点的最新记录。

### Rationale

- **数据一致性**: author_metrics表按task_id存储，同一author可能有多个task_id记录同一时间点的粉丝数
- **去重需求**: 需要合并重复数据，避免图表显示错误
- **性能可接受**: 单个作者的数据量 < 10,000条，GROUP BY性能足够

### Alternatives Considered

| 方案 | 优点 | 缺点 | 为何未采纳 |
|------|------|------|-----------|
| **A: 重构表结构(按author_uid存储)** | 数据模型更合理，查询简单 | 需要大规模数据迁移，风险高 | 短期成本太高，作为长期优化方向 |
| **B: DISTINCT ON collected_at** | 简单直接 | 不保证选到的是最新record | SQLite不支持DISTINCT ON |
| **C: GROUP BY + MAX (选中)** | 兼容SQLite，去重逻辑清晰 | 查询稍复杂，但性能可接受 | ✅ 平衡了实现复杂度和性能 |

### Implementation Notes

#### SQL查询模板 (SQLite)

```sql
-- 查询某个作者的粉丝历史数据（按小时聚合，取最新值）
SELECT 
  collected_at,
  MAX(follower) as follower
FROM author_metrics
WHERE task_id IN (
  SELECT id FROM tasks WHERE author_uid = :authorUid
)
GROUP BY collected_at
ORDER BY collected_at ASC;
```

**优化版本（如果需要按天聚合）**:
```sql
SELECT 
  DATE(collected_at, 'unixepoch') as date,
  MAX(follower) as follower
FROM author_metrics
WHERE task_id IN (
  SELECT id FROM tasks WHERE author_uid = :authorUid
)
GROUP BY date
ORDER BY date ASC;
```

---

#### Drizzle ORM实现

**Service层 (`backend/src/services/author.ts`)**:

```typescript
import { sql } from 'drizzle-orm'
import { tasks, authorMetrics } from '../db/schema'
import type { DrizzleInstance } from '../db'

export class AuthorService {
  constructor(private db: DrizzleInstance) {}
  
  /**
   * 获取作者粉丝历史数据（聚合去重）
   * @param authorUid 作者UID
   * @param from 开始时间(Unix timestamp)
   * @param to 结束时间(Unix timestamp)
   */
  async getAuthorMetrics(
    authorUid: string,
    from?: number,
    to?: number
  ): Promise<Array<{ timestamp: number; follower: number }>> {
    // 子查询：获取该作者的所有task_id
    const authorTasksSubquery = this.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.authorUid, authorUid))
    
    // 主查询：按时间聚合粉丝数
    let query = this.db
      .select({
        timestamp: authorMetrics.collectedAt,
        follower: sql<number>`MAX(${authorMetrics.follower})`
      })
      .from(authorMetrics)
      .where(
        inArray(
          authorMetrics.taskId, 
          sql`(${authorTasksSubquery})`
        )
      )
      .groupBy(authorMetrics.collectedAt)
      .orderBy(asc(authorMetrics.collectedAt))
    
    // 添加时间范围过滤
    if (from !== undefined) {
      query = query.where(gte(authorMetrics.collectedAt, from))
    }
    if (to !== undefined) {
      query = query.where(lte(authorMetrics.collectedAt, to))
    }
    
    const results = await query
    
    return results.map(row => ({
      timestamp: row.timestamp,
      follower: row.follower
    }))
  }
}
```

---

#### 性能优化

**添加索引**:
```sql
-- 已有索引：task_id (外键自动创建)
-- 需要添加：
CREATE INDEX idx_author_metrics_collected_at ON author_metrics(collected_at);
CREATE INDEX idx_author_metrics_task_collected ON author_metrics(task_id, collected_at);
```

**性能评估**:
- 假设单个作者有3个任务，每个任务每小时采集1次，持续30天
- 数据量: 3 tasks × 24 hours × 30 days = 2,160 rows
- GROUP BY查询时间: < 10ms (SQLite in-memory)
- 网络传输: 2,160 rows × 16 bytes ≈ 34KB

**结论**: 性能满足需求(< 2秒渲染目标)

---

#### 数据一致性处理

**场景1: 同一时间点多条记录**  
→ 取MAX值（假设更新的记录更准确）

**场景2: 时间戳略有偏差(±1分钟)**  
→ 不处理，图表会显示小抖动（可接受，未来优化可按时间窗口合并）

**场景3: 粉丝数突降(数据异常)**  
→ 前端显示原始数据，不过滤（让用户可见数据问题）

---

### Alternative: 长期方案（数据模型重构）

如果未来author_metrics数据量增长显著，考虑重构：

**新表结构**:
```sql
CREATE TABLE author_metrics_v2 (
  id TEXT PRIMARY KEY,
  author_uid TEXT NOT NULL,  -- ✅ 直接存author_uid，不依赖task_id
  collected_at INTEGER NOT NULL,
  follower INTEGER NOT NULL,
  UNIQUE(author_uid, collected_at)  -- 防止重复
);

CREATE INDEX idx_author_metrics_v2_author_time 
  ON author_metrics_v2(author_uid, collected_at);
```

**优点**: 查询简化为`SELECT * FROM author_metrics_v2 WHERE author_uid = ?`  
**缺点**: 需要大规模数据迁移，现阶段不必要

---

## R3: LocalStorage Fallback逻辑最佳实践

### Decision

采用**同步检查 + 异步Fallback**模式：
1. 从localStorage读取账号ID
2. 同步检查ID在Zustand store的accounts列表中是否存在
3. 不存在则fallback到第一个可用账号或null
4. 显示Toast提示用户

### Rationale

- **用户体验**: 避免页面闪烁，先用localStorage ID初始化，再异步验证
- **简单高效**: 不需要额外API调用，利用已有的accounts列表
- **错误处理**: Toast提示用户账号已解绑，引导重新选择

### Alternatives Considered

| 方案 | 优点 | 缺点 | 为何未采纳 |
|------|------|------|-----------|
| **A: 每次都调用API验证** | 数据最新 | 额外API请求，影响性能 | 过度设计，accounts列表已在内存 |
| **B: 不处理，任由崩溃** | 简单 | 用户体验极差 | 不可接受 |
| **C: 同步检查 + Toast (选中)** | 快速，用户友好 | 依赖accounts列表已加载 | ✅ 实用且高效 |

### Implementation Notes

#### useSelectedAccount Hook

**文件**: `frontend/web/src/hooks/useSelectedAccount.ts`

```typescript
import { useEffect, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import { toast } from 'sonner'

const STORAGE_KEY = 'selected_account_id'

export function useSelectedAccount() {
  const { 
    selectedAccountId, 
    setSelectedAccountId, 
    accounts  // 假设uiSelection store中有accounts列表
  } = useUISelection()
  
  const [isInitialized, setIsInitialized] = useState(false)
  
  // 初始化：从localStorage恢复账号ID
  useEffect(() => {
    if (isInitialized || accounts.length === 0) return
    
    const storedId = localStorage.getItem(STORAGE_KEY)
    
    if (storedId) {
      // 检查账号是否仍然存在
      const accountExists = accounts.some(acc => acc.id === storedId)
      
      if (accountExists) {
        setSelectedAccountId(storedId)
      } else {
        // Fallback到第一个可用账号
        const firstAccount = accounts[0]
        if (firstAccount) {
          setSelectedAccountId(firstAccount.id)
          toast.warning('之前选择的账号已解绑，已自动切换到其他账号')
        } else {
          setSelectedAccountId(null)
          toast.info('暂无已绑定账号，请前往账号管理绑定')
        }
        // 清理无效的localStorage
        localStorage.removeItem(STORAGE_KEY)
      }
    } else if (accounts.length > 0) {
      // 首次使用：选择第一个账号
      setSelectedAccountId(accounts[0].id)
    }
    
    setIsInitialized(true)
  }, [accounts, isInitialized])
  
  // 持久化：账号ID变化时保存到localStorage
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem(STORAGE_KEY, selectedAccountId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedAccountId])
  
  // 切换账号
  const selectAccount = (accountId: string) => {
    setSelectedAccountId(accountId)
  }
  
  // 获取当前选中的账号对象
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || null
  
  return {
    selectedAccountId,
    selectedAccount,
    selectAccount,
    isInitialized
  }
}
```

---

#### 状态机图

```
┌─────────────┐
│  App Starts │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Load accounts list  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Read localStorage ID         │
└──────┬───────────────────────┘
       │
       ├─── ID exists? ───┐
       │                  │
    [YES]              [NO]
       │                  │
       ▼                  ▼
┌────────────────┐  ┌──────────────────┐
│ Check in list  │  │ accounts empty?  │
└──────┬─────────┘  └──────┬───────────┘
       │                   │
       ├─ Found? ─┐     [YES]  [NO]
       │          │        │      │
    [YES]      [NO]       ▼      ▼
       │          │    ┌──────┐ ┌────────────┐
       ▼          │    │ null │ │ accounts[0]│
   ┌───────┐     │    └───┬──┘ └──────┬─────┘
   │ Use ID│     │        │           │
   └───┬───┘     │        │           │
       │         ▼        │           │
       │    ┌────────────┐│           │
       │    │ accounts[0]││           │
       │    └──────┬─────┘│           │
       │           │      │           │
       │        [Toast]   │      [Toast]
       │           │      │           │
       └───────────┴──────┴───────────┘
                   │
                   ▼
            ┌─────────────┐
            │ Initialized │
            └─────────────┘
```

---

#### 边界情况处理

| 场景 | 行为 | 用户体验 |
|------|------|---------|
| localStorage ID有效 | 使用该账号 | 无感知，直接加载 |
| localStorage ID已解绑 | Fallback到accounts[0] + Toast警告 | 提示"账号已解绑"，自动切换 |
| localStorage ID已解绑 + 无其他账号 | 设置为null + Toast提示绑定 | 提示"请前往账号管理绑定" |
| localStorage为空 + 有账号 | 自动选择accounts[0] | 无Toast，静默选择 |
| localStorage为空 + 无账号 | 设置为null | 显示空状态页面 |
| accounts列表加载失败 | 不初始化，显示加载错误 | Toast错误提示 |

---

#### 测试用例

```typescript
// frontend/web/src/hooks/useSelectedAccount.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSelectedAccount } from './useSelectedAccount'
import { toast } from 'sonner'

jest.mock('sonner')

describe('useSelectedAccount', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })
  
  it('should use localStorage ID if account exists', () => {
    localStorage.setItem('selected_account_id', 'acc-123')
    const mockAccounts = [{ id: 'acc-123', name: 'Test' }]
    
    const { result } = renderHook(() => useSelectedAccount())
    
    expect(result.current.selectedAccountId).toBe('acc-123')
    expect(toast.warning).not.toHaveBeenCalled()
  })
  
  it('should fallback to first account if localStorage ID invalid', () => {
    localStorage.setItem('selected_account_id', 'invalid-id')
    const mockAccounts = [{ id: 'acc-456', name: 'Test' }]
    
    const { result } = renderHook(() => useSelectedAccount())
    
    expect(result.current.selectedAccountId).toBe('acc-456')
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('已解绑')
    )
  })
  
  it('should set null if no accounts available', () => {
    localStorage.setItem('selected_account_id', 'invalid-id')
    const mockAccounts = []
    
    const { result } = renderHook(() => useSelectedAccount())
    
    expect(result.current.selectedAccountId).toBeNull()
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining('请前往账号管理')
    )
  })
})
```

---

## R4: React Router嵌套路由与可折叠菜单状态管理

### Decision

采用**URL驱动 + useLocation监听**模式：
1. 系统设置菜单的展开/收起状态由当前URL路径决定
2. 使用`useLocation().pathname`检测是否在`/settings/*`路由下
3. 不使用localStorage记住状态（避免与URL不一致）

### Rationale

- **URL is the single source of truth**: 避免状态与路由不同步
- **刷新页面自动展开**: 满足FR-003需求
- **简单可靠**: 不需要额外的状态管理，利用React Router现有能力

### Alternatives Considered

| 方案 | 优点 | 缺点 | 为何未采纳 |
|------|------|------|-----------|
| **A: Zustand全局状态** | 可跨页面共享 | 需要手动同步URL，易出错 | 过度设计 |
| **B: localStorage记住状态** | 用户偏好持久化 | 与URL不一致时混乱 | 不符合FR-003("自动展开") |
| **C: URL驱动 (选中)** | 简单，状态单一来源 | 无法记住用户手动收起 | ✅ 符合需求，实现简单 |

### Implementation Notes

#### 路由配置

**文件**: `frontend/web/src/App.tsx`

```typescript
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import MyAccountPage from '@/pages/MyAccountPage'
import TasksMonitorPage from '@/pages/TasksMonitorPage'  // 原DashboardPage
import SettingsLayout from '@/layouts/SettingsLayout'    // 新增：系统设置布局
import AccountManagementPage from '@/pages/AccountManagementPage'
import NotificationsPage from '@/pages/NotificationsPage'
import LogsPage from '@/pages/LogsPage'
import OtherSettingsPage from '@/pages/OtherSettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MyAccountPage />} />  {/* 新首页 */}
        <Route path="/tasks" element={<TasksMonitorPage />} />
        
        {/* 系统设置：嵌套路由 */}
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/accounts" replace />} />
          <Route path="accounts" element={<AccountManagementPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="other" element={<OtherSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

---

#### Sidebar组件（可折叠菜单）

**文件**: `frontend/web/src/components/navigation/Sidebar.tsx`

```typescript
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const location = useLocation()
  const isSettingsRoute = location.pathname.startsWith('/settings')
  
  return (
    <aside className="w-60 bg-card border-r">
      <nav className="p-4 space-y-2">
        {/* 一级菜单：我的账号 */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'block px-3 py-2 rounded-md',
              isActive && 'bg-accent text-accent-foreground'
            )
          }
        >
          我的账号
        </NavLink>
        
        {/* 一级菜单：监视任务 */}
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            cn(
              'block px-3 py-2 rounded-md',
              isActive && 'bg-accent text-accent-foreground'
            )
          }
        >
          监视任务
        </NavLink>
        
        {/* 一级菜单：系统设置（可折叠） */}
        <div>
          <button
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-md',
              isSettingsRoute && 'bg-accent text-accent-foreground'
            )}
            onClick={() => {
              // 如果当前不在settings路由，导航到默认子页面
              if (!isSettingsRoute) {
                window.location.href = '/settings/accounts'
              }
            }}
          >
            <span>系统设置</span>
            {isSettingsRoute ? <ChevronDown /> : <ChevronRight />}
          </button>
          
          {/* 二级菜单（条件渲染） */}
          {isSettingsRoute && (
            <div className="ml-4 mt-2 space-y-1">
              <NavLink
                to="/settings/accounts"
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-sm rounded-md',
                    isActive && 'bg-accent/50'
                  )
                }
              >
                账号管理
              </NavLink>
              <NavLink
                to="/settings/notifications"
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-sm rounded-md',
                    isActive && 'bg-accent/50'
                  )
                }
              >
                通知设置
              </NavLink>
              <NavLink
                to="/settings/logs"
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-sm rounded-md',
                    isActive && 'bg-accent/50'
                  )
                }
              >
                日志
              </NavLink>
              <NavLink
                to="/settings/other"
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-1.5 text-sm rounded-md',
                    isActive && 'bg-accent/50'
                  )
                }
              >
                其他设置
              </NavLink>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
```

---

#### 动画实现（可选）

如果需要平滑展开/收起动画，使用Radix UI:

```typescript
import * as Collapsible from '@radix-ui/react-collapsible'

<Collapsible.Root open={isSettingsRoute}>
  <Collapsible.Trigger asChild>
    <button className="...">
      系统设置
      {isSettingsRoute ? <ChevronDown /> : <ChevronRight />}
    </button>
  </Collapsible.Trigger>
  
  <Collapsible.Content className="CollapsibleContent">
    <div className="ml-4 mt-2 space-y-1">
      {/* 二级菜单项 */}
    </div>
  </Collapsible.Content>
</Collapsible.Root>
```

**CSS动画**:
```css
.CollapsibleContent {
  overflow: hidden;
}

.CollapsibleContent[data-state='open'] {
  animation: slideDown 200ms ease-out;
}

.CollapsibleContent[data-state='closed'] {
  animation: slideUp 200ms ease-out;
}

@keyframes slideDown {
  from { height: 0; opacity: 0; }
  to { height: var(--radix-collapsible-content-height); opacity: 1; }
}

@keyframes slideUp {
  from { height: var(--radix-collapsible-content-height); opacity: 1; }
  to { height: 0; opacity: 0; }
}
```

---

#### 用户交互流程

```
场景1: 用户点击"系统设置" (当前在/tasks页面)
  → 导航到/settings/accounts
  → Sidebar检测pathname.startsWith('/settings')
  → 展开二级菜单
  → 高亮"账号管理"

场景2: 用户点击"监视任务" (当前在/settings/accounts页面)
  → 导航到/tasks
  → Sidebar检测pathname不以'/settings'开头
  → 收起二级菜单
  → 高亮"监视任务"

场景3: 用户刷新页面 (当前在/settings/logs)
  → useLocation()返回'/settings/logs'
  → Sidebar检测pathname.startsWith('/settings')
  → 自动展开二级菜单 ✅ 满足FR-003
  → 高亮"日志"
```

---

## Summary

所有Phase 0研究任务已完成，关键决策如下：

| 研究项 | 决策 | 风险 | 缓解措施 |
|-------|------|------|---------|
| **R1: 数据库迁移** | 两阶段迁移(允许NULL→回填→约束) | 回填失败 | 备份数据库+回滚计划 |
| **R2: 数据聚合** | SQL GROUP BY + MAX | 性能 | 添加索引，评估< 10ms |
| **R3: LocalStorage** | 同步检查+Toast提示 | 无 | 单元测试覆盖边界情况 |
| **R4: 路由状态** | URL驱动+useLocation | 无 | 简单可靠，符合React Router最佳实践 |

**Ready for Phase 1**: 所有技术未知点已解决，可以开始设计data-model和contracts。

