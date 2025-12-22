# Quick Start: CSV 数据导入工具

> 快速开始指南：如何将历史 CSV 数据导入到数据库

---

## 前置条件

1. **Bun 运行时**: 确保已安装 Bun 1.x
   ```bash
   bun --version
   ```

2. **数据库配置**: 确保已配置数据库连接
   - 测试数据库：PostgreSQL (端口 5555) 或 SQLite
   - 生产数据库：PostgreSQL (端口 5556)
   - 配置文件：`backend/.env`

3. **CSV 文件**: 准备要导入的 CSV 文件
   - 位置：`backend/data/old-migrate/`（默认）
   - 格式：`{UID}_follower.csv` 或 `{BV}_views.csv`

---

## 快速开始

### 步骤 1: 配置数据库连接

编辑 `backend/.env` 文件：

```env
# 测试数据库
DB_TYPE=postgres
DATABASE_URL=postgres://bili_monitor_test:password@192.168.0.124:5555/bili_monitor_test

# 或使用 SQLite（开发环境）
# DB_TYPE=sqlite
# SQLITE_PATH=./data/app.db
```

### 步骤 2: 验证数据库连接

```bash
cd backend
bun run db:test
```

如果连接成功，你会看到：
```
✅ PostgreSQL 连接成功!
📊 数据库版本: PostgreSQL 16.x
```

### 步骤 3: 运行数据库迁移（如果尚未运行）

```bash
bun run db:migrate
```

### 步骤 4: 导入 CSV 数据

#### 导入单个文件（测试数据库）

```bash
bun run backend/scripts/import-csv.ts --db test backend/data/old-migrate/28457_follower.csv
```

#### 批量导入目录下所有文件

```bash
bun run backend/scripts/import-csv.ts --db test backend/data/old-migrate/
```

#### 导入并激活任务（立即开始监控）

```bash
bun run backend/scripts/import-csv.ts --db test --activate backend/data/old-migrate/
```

#### 导入到生产数据库

```bash
bun run backend/scripts/import-csv.ts --db prod backend/data/old-migrate/
```

---

## 常见场景

### 场景 1: 首次导入测试环境

```bash
# 1. 导入测试数据库
bun run backend/scripts/import-csv.ts --db test backend/data/old-migrate/

# 2. 验证数据（通过前端或数据库查询）
# 3. 如果验证通过，导入生产数据库
bun run backend/scripts/import-csv.ts --db prod backend/data/old-migrate/
```

### 场景 2: 重新导入（覆盖已存在数据）

```bash
bun run backend/scripts/import-csv.ts --db test --update-existing backend/data/old-migrate/
```

### 场景 3: 导入并生成报告

```bash
bun run backend/scripts/import-csv.ts --db test --output-report report.json backend/data/old-migrate/
```

### 场景 4: 查看详细日志

```bash
bun run backend/scripts/import-csv.ts --db test --verbose backend/data/old-migrate/
```

---

## 验证导入结果

### 方法 1: 通过数据库查询

```bash
# 使用 Drizzle Studio
bun run db:studio

# 或直接查询数据库
# PostgreSQL
psql "postgres://bili_monitor_test:password@192.168.0.124:5555/bili_monitor_test"
```

```sql
-- 查看导入的任务
SELECT id, type, target_id, title, enabled FROM tasks WHERE title = target_id;

-- 查看导入的数据
SELECT COUNT(*) FROM author_metrics;
SELECT COUNT(*) FROM video_metrics;
```

### 方法 2: 通过前端界面

1. 启动前端应用
2. 访问任务列表页面
3. 查看导入的任务（`title` 字段为 UID 或 BV 号）
4. 查看任务的数据图表

---

## 故障排查

### 问题 1: 数据库连接失败

**错误信息**:
```
错误: 无法连接到数据库
```

**解决方案**:
1. 检查数据库服务是否运行
2. 检查 `backend/.env` 中的连接字符串
3. 运行 `bun run db:test` 验证连接

### 问题 2: CSV 文件格式错误

**错误信息**:
```
错误: 文件格式不符合预期: invalid_file.csv
```

**解决方案**:
1. 检查文件名格式：`{UID}_follower.csv` 或 `{BV}_views.csv`
2. 检查 CSV 列名是否正确
3. 检查文件编码是否为 UTF-8

### 问题 3: 时间格式解析失败

**错误信息**:
```
警告: 文件 "xxx.csv" 第 10 行: 时间格式无效，已跳过
```

**解决方案**:
1. 检查时间格式是否为 `YYYY-MM-DD HH:MM`
2. 如果使用其他格式，可能需要修改时间解析逻辑

### 问题 4: 内存溢出（大文件）

**错误信息**:
```
错误: 内存不足
```

**解决方案**:
1. 工具已实现流式处理，理论上不应出现此问题
2. 如果仍出现，检查系统内存或分批导入文件

---

## 下一步

导入完成后，你可以：

1. **更新任务标题**: 使用后续脚本调用 B站 API 更新任务标题和拉取图片
2. **激活任务**: 如果导入时未使用 `--activate`，可在前端批量激活任务
3. **调整监控策略**: 在前端修改任务的监控间隔和策略

---

## 相关文档

- [规范文档](./spec.md)
- [实现计划](./plan.md)
- [数据模型](./data-model.md)
- [CLI 接口](./contracts/cli.md)

