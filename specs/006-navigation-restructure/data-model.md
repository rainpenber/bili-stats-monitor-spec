# Data Model: 前端导航结构重组

**Feature**: 006-navigation-restructure  
**Date**: 2025-12-28  
**Source**: 从spec.md的Key Entities和clarifications中提取

---

## 变更摘要

本功能对现有数据模型进行扩展，不新增表，仅修改Tasks表和Settings表：

- **Tasks表**: 添加2个字段（author_uid, bili_account_id）
- **Settings表**: 添加1条记录（default_account_id）
- **Indexes**: 添加1个索引（idx_tasks_author_uid）

---

## 1. Tasks表扩展

**现有表**: `tasks`  
**变更类型**: ALTER TABLE ADD COLUMN

### 新增字段

#### author_uid
- **类型**: `TEXT`
- **约束**: 初始允许NULL，回填后建议NOT NULL
- **用途**: 存储任务发布者的UID
  - 对于type='video'：存储视频发布者的UID（从B站API获取）
  - 对于type='author'：存储博主自己的UID（等于target_id）
- **索引**: `CREATE INDEX idx_tasks_author_uid ON tasks(author_uid)`
- **查询场景**: 
  - "我的账号"页面按author_uid筛选该账号发布的所有任务
  - 数据抓取时匹配已绑定账号

#### bili_account_id
- **类型**: `TEXT`
- **约束**: 可为NULL
- **用途**: 指定该任务使用哪个B站账号的Cookie进行数据抓取
- **与account_id区别**: 
  - `account_id`: 任务创建者（历史字段，保留不动）
  - `bili_account_id`: 查询用账号（新增字段，数据抓取逻辑使用）
- **外键**: REFERENCES `accounts(id)` (可选，视实现决定)

### 数据迁移

参见`research.md`的R1部分，采用两阶段迁移：
1. 添加列(允许NULL)
2. 数据回填(`backend/src/scripts/backfill-author-uid.ts`)
3. (可选)添加NOT NULL约束

---

## 2. Settings表扩展

**现有表**: `settings`  
**表结构**: Key-Value存储  
**变更类型**: INSERT新记录

### 新增记录

#### default_account_id
- **key**: `'default_account_id'`
- **value**: 账号ID（字符串），初始值为空字符串`''`
- **updated_at**: 最后更新时间(Unix timestamp)
- **用途**: 存储全局默认账号的ID，用于数据抓取时的fallback
- **管理方式**:
  - GET: `SELECT value FROM settings WHERE key = 'default_account_id'`
  - SET: `UPDATE settings SET value = ?, updated_at = ? WHERE key = 'default_account_id'`
  - 如果记录不存在，INSERT: `INSERT INTO settings (key, value, updated_at) VALUES ('default_account_id', '', ?)`

---

## 3. 数据关系变更

### Tasks ← Accounts (新关系)

```
tasks.bili_account_id → accounts.id (可选外键)
```

**说明**: bili_account_id可为NULL（表示使用默认账号或按author_uid匹配）

### Tasks ← Author Metrics (查询关系变化)

**原查询**: `SELECT * FROM author_metrics WHERE task_id = ?`  
**新查询**: `SELECT * FROM author_metrics WHERE task_id IN (SELECT id FROM tasks WHERE author_uid = ?)`

**原因**: 需要聚合同一author的所有任务的粉丝数据

---

## 4. 数据抓取逻辑（三级优先级）

```
获取任务的查询账号:
  1. IF task.bili_account_id IS NOT NULL
       → USE accounts[task.bili_account_id]
  2. ELSE IF EXISTS account WHERE account.uid = task.author_uid
       → USE that account
  3. ELSE
       → GET settings['default_account_id']
       → USE accounts[default_account_id]
  4. IF all above failed
       → LOG error + NOTIFY user
```

---

## 5. 状态转换

无新状态机，但需记录数据迁移状态：

| 阶段 | Tasks.author_uid | Tasks.bili_account_id | Settings.default_account_id |
|------|-----------------|----------------------|-----------------------------|
| **迁移前** | (不存在) | (不存在) | (不存在) |
| **阶段1** | NULL允许 | NULL允许 | '' (空字符串) |
| **阶段2** | 已回填 | NULL允许 | '' or 账号ID |
| **最终** | NOT NULL | NULL允许 | 账号ID (用户设置后) |

---

## 6. 验证规则

### Tasks表

- **author_uid**: 
  - 长度: 1-20字符（B站UID范围）
  - 格式: 纯数字字符串
  - 非空: 回填后必须有值
  
- **bili_account_id**:
  - 长度: 符合nanoid格式（约21字符）
  - 外键: 必须存在于accounts表中(如果不为NULL)
  - 可空: 允许NULL

### Settings表

- **default_account_id**:
  - 长度: 符合nanoid格式 或 空字符串
  - 外键: 必须存在于accounts表中(如果不为空)
  - 更新: 通过API端点`POST /api/v1/accounts/default`

---

## 7. 索引设计

```sql
-- 新增索引
CREATE INDEX idx_tasks_author_uid ON tasks(author_uid);

-- 可选：复合索引(如果查询同时过滤type和author_uid)
CREATE INDEX idx_tasks_type_author ON tasks(type, author_uid);

-- 可选：author_metrics聚合查询优化
CREATE INDEX idx_author_metrics_task_collected 
  ON author_metrics(task_id, collected_at);
```

---

## 8. 数据量估算

| 表 | 当前行数 | 新增行数 | 存储增长 |
|---|---------|---------|---------|
| tasks | ~100 | 0 (仅扩展列) | +40 bytes/row (2字段×20字符) |
| settings | ~10 | +1 | +50 bytes |
| **总计** | | | ~4KB (100 tasks) |

**结论**: 数据量增长可忽略不计

---

## 9. 迁移脚本

### SQLite

```sql
-- 0001_add_author_fields.sql
ALTER TABLE tasks ADD COLUMN author_uid TEXT;
ALTER TABLE tasks ADD COLUMN bili_account_id TEXT;

CREATE INDEX idx_tasks_author_uid ON tasks(author_uid);

-- 初始化default_account_id (如果不存在)
INSERT OR IGNORE INTO settings (key, value, updated_at) 
VALUES ('default_account_id', '', strftime('%s', 'now'));
```

### PostgreSQL

```sql
-- 0001_add_author_fields.sql (PostgreSQL版本)
ALTER TABLE tasks ADD COLUMN author_uid TEXT;
ALTER TABLE tasks ADD COLUMN bili_account_id TEXT;

CREATE INDEX idx_tasks_author_uid ON tasks(author_uid);

INSERT INTO settings (key, value, updated_at) 
VALUES ('default_account_id', '', EXTRACT(EPOCH FROM NOW())::INTEGER)
ON CONFLICT (key) DO NOTHING;
```

---

**迁移安全提示**: 
- 执行前备份数据库
- 先在开发环境完整测试
- 回填脚本见`backend/src/scripts/backfill-author-uid.ts`
- 回滚计划见`research.md`的R1部分

