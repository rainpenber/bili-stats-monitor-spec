# 数据库配置说明

## 数据库选择

本项目支持 SQLite 和 PostgreSQL 两种数据库：

### SQLite（开发环境推荐）
- **开发数据库**: `backend/data/dev/bili-stats-dev.db`
- **配置文件**: `backend/.env.development`
- **优点**: 零配置，适合本地开发和测试
- **缺点**: 不适合高并发生产环境

### PostgreSQL（生产环境推荐）
- **配置**: 通过 `DATABASE_URL` 环境变量
- **配置文件**: `backend/.env.production`
- **优点**: 高性能，支持并发，适合生产环境
- **缺点**: 需要独立的数据库服务器

## 当前配置（开发环境）

**数据库文件**: `backend/data/dev/bili-stats-dev.db`

配置位置：`backend/.env.development`
```env
SQLITE_PATH=./data/dev/bili-stats-dev.db
```

## 数据库初始化

### 1. 创建/更新数据库表

```bash
cd backend
bun run db:push        # SQLite
bun run db:push:pg     # PostgreSQL
```

### 2. 查看数据库

```bash
cd backend
bun run db:studio      # 打开 Drizzle Studio GUI
```

### 3. 生成迁移文件

```bash
cd backend
bun run db:generate    # SQLite
bun run db:generate:pg # PostgreSQL
```

## 数据库 Schema

所有表定义在：
- **SQLite**: `backend/src/db/schema.ts`
- **PostgreSQL**: `backend/src/db/schema-pg.ts`

### 核心表

1. **users** - 用户表
   - 管理员账号
   - JWT 认证

2. **accounts** - B站账号表
   - 绑定的 B站账号
   - Cookie/扫码绑定

3. **qrcode_sessions** - 二维码会话表
   - 扫码登录会话
   - 状态追踪

4. **tasks** - 监控任务表
   - 视频/UP主监控任务
   - 采集策略

5. **samples** - 数据样本表
   - 历史数据点
   - 时间序列数据

6. **settings** - 系统设置表
   - 全局配置
   - 默认参数

7. **notification_channels** - 通知渠道表
   - 通知配置
   - 多渠道支持

## 数据文件结构

```
backend/data/
├── dev/                           # 开发环境数据
│   ├── bili-stats-dev.db          # SQLite 数据库（开发）✅ 当前使用
│   ├── logs/                      # 日志文件
│   ├── media/                     # 媒体资源缓存
│   └── notifications.json         # 通知配置
└── prod/                          # 生产环境数据（可选）
    ├── bili-stats-prod.db         # SQLite 数据库（生产）
    ├── logs/
    ├── media/
    └── notifications.json
```

## 迁移记录

### 2025-12-27: 数据库配置统一

**问题**:
- 旧数据库 `backend/data/app.db` 与新数据库 `backend/data/dev/bili-stats-dev.db` 混淆
- `db:push` 脚本硬编码路径，与环境变量不一致
- 缺少 `qrcode_sessions` 表

**解决方案**:
1. ✅ 删除旧数据库文件 `backend/data/app.db`
2. ✅ 统一使用 `backend/data/dev/bili-stats-dev.db`
3. ✅ 更新 `db:push` 和 `db:studio` 脚本指向正确路径
4. ✅ 运行 `bun run db:push` 创建所有表

**影响**:
- 开发环境数据库统一到 `./data/dev/bili-stats-dev.db`
- 所有表（包括 `qrcode_sessions`）已创建
- 旧数据已清除，需要重新创建测试数据

## 故障排查

### 问题：`no such table: xxx`

**原因**: 数据库表未创建

**解决**:
```bash
cd backend
bun run db:push
```

### 问题：`SQLITE_CANTOPEN: unable to open database file`

**原因**: 数据库目录不存在

**解决**:
```bash
mkdir -p backend/data/dev
cd backend
bun run db:push
```

### 问题：数据库文件锁定

**原因**: 另一个进程正在使用数据库

**解决**:
1. 停止所有后端进程
2. 重新启动

## PostgreSQL 配置（可选）

如需使用 PostgreSQL：

### 1. 安装 PostgreSQL

### 2. 创建数据库

```sql
CREATE DATABASE bili_stats_monitor;
```

### 3. 配置环境变量

`backend/.env.production`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/bili_stats_monitor
```

### 4. 运行迁移

```bash
cd backend
bun run db:push:pg
```

## 最佳实践

1. **开发环境**: 使用 SQLite，简单快速
2. **生产环境**: 使用 PostgreSQL，性能稳定
3. **定期备份**: 数据库文件定期备份
4. **迁移管理**: Schema 变更通过 Drizzle Kit 管理
5. **环境隔离**: 开发/生产数据库严格分离

## 相关命令

```bash
# 数据库操作
bun run db:push          # 推送 schema 到数据库（SQLite）
bun run db:push:pg       # 推送 schema 到数据库（PostgreSQL）
bun run db:generate      # 生成迁移文件（SQLite）
bun run db:generate:pg   # 生成迁移文件（PostgreSQL）
bun run db:studio        # 打开 Drizzle Studio
bun run db:test          # 测试数据库连接
bun run db:verify        # 验证配置

# 开发启动
bun run start:dev        # 启动开发服务器（使用 SQLite）
bun run start:prod       # 启动生产服务器（使用配置的数据库）
```

## 注意事项

⚠️ **数据库文件安全**:
- 数据库文件包含敏感数据（加密后的Cookie、配置等）
- 已在 `.gitignore` 中排除，**不要提交到 Git**
- 生产环境使用强密码和加密传输（PostgreSQL）

⚠️ **加密密钥**:
- `ENCRYPT_KEY` 用于加密敏感数据
- 开发环境可使用默认值
- **生产环境必须生成随机密钥**：
  ```bash
  bun run generate-encrypt-key
  ```

⚠️ **数据迁移**:
- Schema 变更后务必运行 `db:push`
- 重要数据变更前先备份
- 测试迁移无误后再应用到生产环境


