# CLI Interface Contract: CSV 数据导入工具

> 本功能为命令行工具，不提供 HTTP API。本文档定义 CLI 接口规范。

---

## 命令格式

```bash
bun run backend/scripts/import-csv.ts [OPTIONS] [FILES...]
```

---

## 参数说明

### 位置参数

- `FILES...` (可选): 要导入的 CSV 文件路径或目录路径
  - 如果未指定，默认扫描 `backend/data/old-migrate/` 目录
  - 支持单个文件、多个文件或目录路径
  - 目录路径会递归扫描所有 `_follower.csv` 和 `_views.csv` 文件

### 选项参数

| 参数 | 简写 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| `--db` | `-d` | `test \| prod` | 否 | `test` | 目标数据库类型（测试或生产） |
| `--activate` | `-a` | flag | 否 | `false` | 导入后激活任务（`enabled=true`） |
| `--update-existing` | `-u` | flag | 否 | `false` | 覆盖已存在的记录（默认跳过） |
| `--output-report` | `-o` | `string` | 否 | - | 将导入报告保存到文件（JSON 格式） |
| `--help` | `-h` | flag | 否 | - | 显示帮助信息 |
| `--verbose` | `-v` | flag | 否 | `false` | 显示详细日志输出 |

---

## 使用示例

### 示例 1: 导入单个文件到测试数据库

```bash
bun run backend/scripts/import-csv.ts --db test backend/data/old-migrate/28457_follower.csv
```

### 示例 2: 批量导入目录下所有文件，激活任务

```bash
bun run backend/scripts/import-csv.ts --db test --activate backend/data/old-migrate/
```

### 示例 3: 导入到生产数据库，覆盖已存在记录

```bash
bun run backend/scripts/import-csv.ts --db prod --update-existing backend/data/old-migrate/
```

### 示例 4: 导入并生成报告文件

```bash
bun run backend/scripts/import-csv.ts --db test --output-report import-report.json backend/data/old-migrate/
```

### 示例 5: 显示帮助信息

```bash
bun run backend/scripts/import-csv.ts --help
```

---

## 输出格式

### 标准输出（控制台）

#### 进度显示

```
正在导入: 28457_follower.csv
进度: [████████████████████] 100% (122/122 行)
任务: 已创建 (ID: abc123)
数据: 已插入 122 条记录
```

#### 导入报告

```
========================================
导入完成报告
========================================
总文件数: 10
成功文件数: 9
失败文件数: 1
总记录数: 1,234
成功插入: 1,200
跳过记录: 34 (重复数据)
耗时: 2.5 分钟

错误列表:
- 文件: invalid_file.csv
  行号: 5
  错误: 时间格式无效 "2025-13-01 12:00"
========================================
```

### JSON 报告文件（`--output-report`）

```json
{
  "totalFiles": 10,
  "successFiles": 9,
  "failedFiles": 1,
  "totalRecords": 1234,
  "insertedRecords": 1200,
  "skippedRecords": 34,
  "duration": 150000,
  "errors": [
    {
      "file": "invalid_file.csv",
      "line": 5,
      "type": "validate",
      "message": "时间格式无效: 2025-13-01 12:00",
      "data": {
        "时间": "2025-13-01 12:00",
        "粉丝数": "12345"
      }
    }
  ],
  "files": [
    {
      "file": "28457_follower.csv",
      "status": "success",
      "records": 122,
      "taskId": "abc123"
    }
  ]
}
```

---

## 退出码

| 退出码 | 说明 |
|--------|------|
| `0` | 导入成功（所有文件处理完成，可能有部分错误但已记录） |
| `1` | 参数错误（无效的命令行参数） |
| `2` | 数据库连接失败 |
| `3` | 文件读取错误（文件不存在或无法读取） |
| `4` | 严重错误（数据库操作失败、内存溢出等） |

---

## 环境变量

工具会读取以下环境变量（如果未通过命令行参数指定）：

- `DB_TYPE`: 数据库类型（`sqlite` 或 `postgres`）
- `DATABASE_URL`: 数据库连接字符串（PostgreSQL）
- `SQLITE_PATH`: SQLite 数据库文件路径

**注意**: 根据 spec 要求，`--db` 参数是必需的，不允许仅通过环境变量配置。

---

## 错误处理

### 参数验证错误

如果参数无效，工具会输出错误信息并退出：

```
错误: 无效的数据库类型 "invalid"，必须是 "test" 或 "prod"
用法: bun run backend/scripts/import-csv.ts [OPTIONS] [FILES...]
```

### 文件错误

如果文件不存在或无法读取：

```
错误: 文件不存在: /path/to/nonexistent.csv
```

### 数据库错误

如果数据库连接失败：

```
错误: 无法连接到数据库
请检查:
  1. 数据库服务是否运行
  2. 连接字符串是否正确
  3. 网络连接是否正常
```

### 数据验证错误

数据验证错误不会导致程序退出，而是记录到错误报告中：

```
警告: 文件 "28457_follower.csv" 第 10 行: 时间格式无效，已跳过
```

---

## 优雅中断

工具支持 `Ctrl+C` 优雅中断：

1. 捕获中断信号
2. 完成当前批次的数据库插入
3. 生成部分导入报告
4. 退出并返回适当的退出码

---

## 日志级别

- **默认**: 显示进度和关键信息
- **`--verbose`**: 显示详细日志（每行处理状态、数据库操作详情等）

