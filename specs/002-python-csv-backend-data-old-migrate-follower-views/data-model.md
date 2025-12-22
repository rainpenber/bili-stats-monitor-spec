# Data Model: 历史 CSV 数据导入工具

> 本功能复用现有数据库 schema，本文档说明导入过程中涉及的数据实体、字段映射和验证规则。

---

## 核心实体

### 1. MonitoringTask (监控任务)

**表名**: `tasks`  
**用途**: 存储监控任务信息，每个 CSV 文件对应一个任务

**字段映射**（导入时创建/更新）：

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `id` | `text` | 生成 | 使用 `nanoid()` 生成 |
| `type` | `'video' \| 'author'` | 文件名推断 | `_follower.csv` → `'author'`, `_views.csv` → `'video'` |
| `target_id` | `text` | 文件名提取 | `{UID}_follower.csv` → UID, `{BV}_views.csv` → BV号 |
| `title` | `text` | 临时设置 | 初始值为 `target_id`（UID 或 BV 号） |
| `strategy` | `json` | 固定值 | `{ mode: 'fixed', value: 240, unit: 'minute' }` (4小时间隔) |
| `deadline` | `timestamp` | 固定值 | `null` (无限制) |
| `status` | `'active' \| 'stopped' \| ...` | 固定值 | `'active'` |
| `enabled` | `boolean` | 命令行参数 | `--activate` 指定时为 `true`，否则为 `false` |
| `tags` | `json` (string[]) | 固定值 | `[]` (空数组) |
| `account_id` | `text` | 固定值 | `null` (导入时不绑定账号) |
| `cid` | `text` | 固定值 | `null` (视频 CID，导入时不设置) |
| `cid_retries` | `integer` | 固定值 | `0` |
| `next_run_at` | `timestamp` | 固定值 | `null` (导入时不设置) |
| `published_at` | `timestamp` | 固定值 | `null` (导入时不设置) |
| `created_at` | `timestamp` | 自动 | 当前时间 |
| `updated_at` | `timestamp` | 自动 | 当前时间 |

**验证规则**:
- `target_id` 必须非空
- `type` 必须为 `'video'` 或 `'author'`
- 如果任务已存在（相同 `type` + `target_id`），使用现有任务，不创建新任务

---

### 2. AuthorMetrics (作者指标)

**表名**: `author_metrics`  
**用途**: 存储粉丝数历史数据

**字段映射**（从 `_follower.csv` 导入）：

| CSV 列名 | 数据库字段 | 类型 | 转换规则 |
|---------|-----------|------|---------|
| `时间` | `collected_at` | `timestamp` | 解析时间字符串为时间戳 |
| `粉丝数` | `follower` | `integer` | 解析为整数，无效值使用 0 |

**其他字段**:
- `id`: 使用 `nanoid()` 生成
- `task_id`: 关联到对应的 `tasks.id`

**验证规则**:
- `collected_at` 必须为有效时间戳
- `follower` 必须为非负整数
- `task_id` + `collected_at` 组合必须唯一（避免重复导入）

---

### 3. VideoMetrics (视频指标)

**表名**: `video_metrics`  
**用途**: 存储视频播放数据历史

**字段映射**（从 `_views.csv` 导入）：

| CSV 列名 | 数据库字段 | 类型 | 转换规则 |
|---------|-----------|------|---------|
| `时间` | `collected_at` | `timestamp` | 解析时间字符串为时间戳 |
| `播放量` | `view` | `integer` | 解析为整数，无效值使用 0 |
| `在线观看人数` | `online` | `integer` | 解析为整数，无效值使用 0 或 null |
| `点赞` | `like` | `integer` | 解析为整数，无效值使用 0 |
| `投币` | `coin` | `integer` | 解析为整数，无效值使用 0 |
| `收藏` | `favorite` | `integer` | 解析为整数，无效值使用 0 |
| `分享` | `share` | `integer` | 解析为整数，无效值使用 0 |
| `弹幕` | `danmaku` | `integer` | 解析为整数，无效值使用 0 |

**其他字段**:
- `id`: 使用 `nanoid()` 生成
- `task_id`: 关联到对应的 `tasks.id`
- `reply`: `null` (CSV 中不包含回复数)
- `completion_rate`: `null` (导入时不设置)
- `avg_watch_duration`: `null` (导入时不设置)

**验证规则**:
- `collected_at` 必须为有效时间戳
- 所有数值字段必须为非负整数
- `task_id` + `collected_at` 组合必须唯一（避免重复导入）

---

## 数据关系

```
CSV File
  │
  ├─→ Extract target_id (UID or BV)
  │
  └─→ MonitoringTask (查找或创建)
        │
        └─→ AuthorMetrics / VideoMetrics (批量插入)
              │
              └─→ task_id (外键关联)
```

**关系说明**:
1. 一个 CSV 文件 → 一个 MonitoringTask（通过 `type` + `target_id` 唯一标识）
2. 一个 MonitoringTask → 多条 Metrics 记录（时间序列数据）
3. Metrics 记录通过 `task_id` 外键关联到任务

---

## 数据验证规则

### CSV 文件验证

1. **文件名格式**:
   - `_follower.csv`: 必须匹配 `^(\d+)_follower\.csv$` (UID 为数字)
   - `_views.csv`: 必须匹配 `^(BV\w+)_views\.csv$` (BV 号格式)

2. **文件编码**: UTF-8（可能带 BOM）

3. **列名验证**:
   - `_follower.csv`: 必须包含 `时间` 和 `粉丝数` 列
   - `_views.csv`: 必须包含 `时间、播放量、在线观看人数、点赞、投币、收藏、分享、弹幕` 列

### 数据行验证

1. **时间字段**:
   - 必须能解析为有效时间戳
   - 支持格式：`YYYY-MM-DD HH:MM`, `YYYY-MM-DDTHH:MM:SS`, `YYYY/MM/DD HH:MM`
   - 无效时间：记录错误，跳过该行

2. **数值字段**:
   - 必须为有效整数（或空值）
   - 空值处理：使用默认值 0（`follower`, `view`, `like` 等）或 `null`（`online`, `reply`）
   - 负数：记录警告，使用 0

3. **唯一性检查**:
   - 基于 `task_id` + `collected_at` 组合
   - 默认跳过已存在记录
   - `--update-existing` 参数：覆盖已存在记录

---

## 导入流程数据流

```
1. 扫描 CSV 文件
   ↓
2. 解析文件名 → 提取 type 和 target_id
   ↓
3. 查找或创建 MonitoringTask
   ├─→ 任务不存在：创建新任务（title = target_id）
   └─→ 任务存在：使用现有任务
   ↓
4. 流式读取 CSV 文件
   ↓
5. 逐行解析和验证
   ├─→ 验证通过：添加到批量缓冲区
   └─→ 验证失败：记录错误，继续下一行
   ↓
6. 批量插入数据库（每批 100-500 条）
   ├─→ 插入成功：更新成功计数
   └─→ 插入失败：记录错误，继续下一批
   ↓
7. 生成导入报告
```

---

## 错误处理数据模型

### ImportError (导入错误)

**结构**:
```typescript
interface ImportError {
  file: string           // CSV 文件名
  line?: number          // 错误行号（如果适用）
  type: 'parse' | 'validate' | 'database'  // 错误类型
  message: string        // 错误消息
  data?: any            // 原始数据（用于调试）
}
```

**错误类型**:
- `parse`: CSV 解析错误（编码、格式等）
- `validate`: 数据验证错误（时间格式、数值无效等）
- `database`: 数据库操作错误（插入失败、连接中断等）

### ImportReport (导入报告)

**结构**:
```typescript
interface ImportReport {
  totalFiles: number           // 总文件数
  successFiles: number         // 成功文件数
  failedFiles: number          // 失败文件数
  totalRecords: number         // 总记录数
  insertedRecords: number      // 成功插入记录数
  skippedRecords: number       // 跳过记录数（重复数据）
  errors: ImportError[]        // 错误列表
  duration: number             // 导入耗时（毫秒）
}
```

