# Quick Start: 前端导航结构重组

**Feature**: 006-navigation-restructure  
**For**: 开发者快速上手本功能开发

---

## 前置条件

- Node.js 18+ & Bun 1.x已安装
- pnpm已安装
- 已克隆项目并安装依赖: `pnpm install`

---

## 1. 数据库迁移

### 1.1 备份现有数据库

```bash
cd backend/data/dev
cp bili-stats-dev.db bili-stats-dev.db.backup
```

### 1.2 运行迁移脚本

```bash
cd backend

# 生成迁移SQL
bun run drizzle-kit generate:sqlite

# 应用迁移
bun run db:push

# 执行数据回填
bun run src/scripts/backfill-author-uid.ts
```

### 1.3 验证迁移

```bash
# 进入SQLite shell
sqlite3 data/dev/bili-stats-dev.db

# 检查新字段
.schema tasks

# 检查数据
SELECT id, type, target_id, author_uid, bili_account_id 
FROM tasks LIMIT 5;

# 退出
.quit
```

---

## 2. 启动开发服务器

### 2.1 后端服务

```bash
cd backend
bun run dev
# 后端运行在 http://localhost:38080
```

### 2.2 前端服务

```bash
# 新终端
cd frontend/web
pnpm dev
# 前端运行在 http://localhost:5173
```

---

## 3. 测试新功能

### 3.1 测试"我的账号"页面

1. 访问 `http://localhost:5173/`
2. 如果未登录，会弹出LoginModal，输入 `admin / admin123`
3. 登录后应看到：
   - 顶部：账号信息 + "切换账号"按钮
   - 数据仪表板：监视视频数、粉丝数（大数字卡片）
   - 粉丝图表：折线图显示历史数据
   - 视频任务列表：该账号发布的所有任务

### 3.2 测试账号切换

1. 点击"切换账号"按钮
2. 在弹出的Modal中选择另一个已绑定账号
3. 验证页面数据是否更新为新账号的数据

### 3.3 测试系统设置菜单

1. 点击侧边栏的"系统设置"
2. 验证二级菜单自动展开
3. 点击"账号管理"子菜单
4. 验证整合了原账号管理页面 + 默认账号设置

### 3.4 测试博主选择功能

1. 在"我的账号"页面，点击"选择博主"按钮
2. 在弹出的Modal中：
   - 验证显示博主列表（从tasks表提取的author_uid）
   - 测试搜索功能（按昵称或UID搜索）
   - 选择一个博主，验证页面数据更新为该博主的数据
   - 点击某个博主的"设为默认"按钮，验证设置成功
3. 刷新浏览器(F5)，验证是否自动加载默认展示的博主

### 3.5 测试刷新页面

1. 在"我的账号"页面，切换到某个账号或选择某个博主
2. 刷新浏览器(F5)
3. 验证是否自动恢复到默认展示的博主（如果设置了）或之前选择的账号（localStorage）

---

## 4. API测试

### 4.1 测试author_uid筛选

```bash
# 获取作者UID为12345678的所有任务
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/tasks?author_uid=12345678"
```

### 4.2 测试粉丝数据聚合

```bash
# 获取作者12345678的粉丝历史数据
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/authors/12345678/metrics"
```

### 4.3 测试默认账号设置

```bash
# 设置默认账号
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"acc_xyz789"}' \
  "http://localhost:38080/api/v1/accounts/default"

# 获取默认账号
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/accounts/default"
```

### 4.4 测试博主列表API

```bash
# 获取博主列表（所有有监控任务的博主）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/authors"

# 搜索博主（按昵称或UID）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/authors?search=沐可"
```

### 4.5 测试默认展示博主设置

```bash
# 设置默认展示博主
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"1871297"}' \
  "http://localhost:38080/api/v1/settings/default-display-author"

# 获取默认展示博主
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:38080/api/v1/settings/default-display-author"

# 清除默认展示博主
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uid":null}' \
  "http://localhost:38080/api/v1/settings/default-display-author"
```

---

## 5. 常见问题排查

### Q1: author_uid字段为空

**症状**: "我的账号"页面显示"暂无任务"，但实际有任务存在

**排查**:
```sql
-- 检查是否有未填充author_uid的任务
SELECT COUNT(*) FROM tasks WHERE author_uid IS NULL;

-- 如果有，重新运行回填脚本
cd backend
bun run src/scripts/backfill-author-uid.ts
```

### Q2: 粉丝图表无数据

**症状**: 图表显示"暂无数据"

**排查**:
1. 检查author_metrics表是否有数据:
   ```sql
   SELECT COUNT(*) FROM author_metrics WHERE task_id IN (
     SELECT id FROM tasks WHERE author_uid = '12345678'
   );
   ```
2. 检查API响应: 打开浏览器DevTools → Network → 找到`/api/v1/authors/*/metrics`请求
3. 确认账号UID正确: 在"账号管理"页面查看UID

### Q3: LocalStorage账号ID失效

**症状**: 每次刷新页面都切换到第一个账号

**排查**:
1. 打开浏览器DevTools → Application → Local Storage
2. 检查`selected_account_id`的值
3. 在"账号管理"页面验证该ID的账号是否存在
4. 如果账号已解绑，清除localStorage: `localStorage.removeItem('selected_account_id')`

### Q4: 系统设置菜单不展开

**症状**: 点击"系统设置"无反应或不展开

**排查**:
1. 打开浏览器DevTools → Console，查看是否有报错
2. 检查当前路由: 在Console输入`window.location.pathname`
3. 确认Sidebar组件中的`isSettingsRoute`逻辑正确

### Q5: 博主列表为空

**症状**: "选择博主"Modal中显示"暂无博主"

**排查**:
1. 检查tasks表中是否有author_uid数据:
   ```sql
   SELECT DISTINCT author_uid FROM tasks WHERE author_uid IS NOT NULL;
   ```
2. 检查API响应: 打开浏览器DevTools → Network → 找到`/api/v1/authors`请求
3. 确认有监控任务存在: 在"监视任务"页面查看任务列表

### Q6: 默认展示博主设置无效

**症状**: 刷新页面后没有自动加载默认展示的博主

**排查**:
1. 检查settings表中的default_display_author值:
   ```sql
   SELECT * FROM settings WHERE key = 'default_display_author';
   ```
2. 检查前端是否正确读取: 打开浏览器DevTools → Application → Local Storage
3. 确认博主UID格式正确（纯数字字符串）

### Q7: 数据库迁移失败

**症状**: `bun run db:push`报错

**解决**:
```bash
# 回滚到备份
cd backend/data/dev
cp bili-stats-dev.db.backup bili-stats-dev.db

# 检查Drizzle配置
cat drizzle.config.ts

# 重新生成迁移
bun run drizzle-kit generate:sqlite --force
bun run db:push
```

---

## 6. 开发建议

- **前端组件**: 复用现有组件(Card, Modal, Button)，避免重复造轮子
- **状态管理**: 使用`useUISelection()`访问全局状态，不要创建新store
- **API调用**: 使用`frontend/web/src/lib/api.ts`的封装方法，不要直接调用axios
- **样式**: 使用TailwindCSS utility classes，保持与现有页面一致
- **类型定义**: 更新`frontend/web/src/types/*.ts`，确保类型安全

---

## 7. 相关文档

- **规格说明**: `specs/006-navigation-restructure/spec.md`
- **技术研究**: `specs/006-navigation-restructure/research.md`
- **数据模型**: `specs/006-navigation-restructure/data-model.md`
- **API合约**: `specs/006-navigation-restructure/contracts/*.yaml`
- **实现计划**: `specs/006-navigation-restructure/plan.md`

---

**祝开发顺利！** 🚀

如有问题，请参考research.md中的详细技术决策说明。
