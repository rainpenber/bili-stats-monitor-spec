# 数据库配置指南

本文档说明如何配置和使用 SQLite 或 PostgreSQL 数据库。

## 数据库类型选择

### SQLite（推荐用于开发）

**优点：**
- 无需额外服务，开箱即用
- 适合本地开发和测试
- 数据文件易于备份和迁移

**缺点：**
- 不适合高并发场景
- 不支持多进程同时写入

### PostgreSQL（推荐用于生产）

**优点：**
- 支持高并发
- 功能强大（JSON、全文搜索等）
- 适合生产环境

**缺点：**
- 需要单独的数据库服务
- 配置相对复杂

## PostgreSQL 配置

### 1. Docker 部署（推荐）

**方式一：使用项目提供的配置文件**

项目已提供 `docker-compose.postgres.yml` 配置文件，可直接使用：

```bash
# 在服务器上
cd /opt/bili-monitor/postgres  # 或你选择的目录

# 复制配置文件
cp /path/to/project/backend/docker-compose.postgres.yml .

# 创建 .env 文件并设置密码
cat > .env << EOF
POSTGRES_TEST_PASSWORD=your_strong_test_password
POSTGRES_PROD_PASSWORD=your_strong_prod_password
EOF

# 启动服务
docker-compose -f docker-compose.postgres.yml up -d
```

**方式二：手动创建配置**

在服务器上创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    container_name: bili-monitor-postgres-test
    environment:
      POSTGRES_USER: bili_monitor_test
      POSTGRES_PASSWORD: ${POSTGRES_TEST_PASSWORD}
      POSTGRES_DB: bili_monitor_test
    ports:
      - "5555:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bili_monitor_test"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-prod:
    image: postgres:16-alpine
    container_name: bili-monitor-postgres-prod
    environment:
      POSTGRES_USER: bili_monitor_prod
      POSTGRES_PASSWORD: ${POSTGRES_PROD_PASSWORD}
      POSTGRES_DB: bili_monitor_prod
    ports:
      - "5556:5432"
    volumes:
      - postgres-prod-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bili_monitor_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-test-data:
  postgres-prod-data:
```

创建 `.env` 文件：

```env
POSTGRES_TEST_PASSWORD=your_strong_test_password
POSTGRES_PROD_PASSWORD=your_strong_prod_password
```

启动服务：

```bash
# 如果使用项目提供的配置文件
docker-compose -f docker-compose.postgres.yml up -d

# 如果使用手动创建的配置文件
docker-compose up -d
```

**验证服务运行：**

```bash
# 查看容器状态
docker ps | grep postgres

# 查看日志
docker-compose -f docker-compose.postgres.yml logs -f

# 测试连接（测试数据库）
docker exec -it bili-monitor-postgres-test psql -U bili_monitor_test -d bili_monitor_test

# 测试连接（生产数据库）
docker exec -it bili-monitor-postgres-prod psql -U bili_monitor_prod -d bili_monitor_prod
```

### 2. 连接字符串格式

PostgreSQL 连接字符串格式：

```
postgres://username:password@host:port/database
```

**示例（服务器 IP: 192.168.0.124）：**
- 测试环境：`postgres://bili_monitor_test:password@192.168.0.124:5555/bili_monitor_test`
- 生产环境：`postgres://bili_monitor_prod:password@192.168.0.124:5556/bili_monitor_prod`

### 3. 本地配置

在 `backend/.env` 中设置：

```env
DB_TYPE=postgres
DATABASE_URL=postgres://bili_monitor_test:password@192.168.0.124:5555/bili_monitor_test
```

### 4. 初始化数据库

```bash
# 确保设置了 DATABASE_URL
export DATABASE_URL=postgres://bili_monitor_test:password@192.168.0.124:5555/bili_monitor_test

# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate
```

## 数据库迁移

### 生成迁移

迁移文件会根据当前 `DB_TYPE` 自动生成：

```bash
# SQLite
DB_TYPE=sqlite bun run db:generate

# PostgreSQL
DB_TYPE=postgres DATABASE_URL=... bun run db:generate
```

### 运行迁移

```bash
# SQLite（自动创建数据库文件）
bun run db:migrate

# PostgreSQL（需要先创建数据库）
bun run db:migrate
```

### 查看迁移状态

使用 Drizzle Studio：

```bash
bun run db:studio
```

## 切换数据库类型

### 从 SQLite 切换到 PostgreSQL

1. 备份 SQLite 数据（可选）
2. 在 `.env` 中设置 `DB_TYPE=postgres` 和 `DATABASE_URL`
3. 运行迁移：`bun run db:migrate`
4. 迁移数据（需要手动脚本）

### 从 PostgreSQL 切换到 SQLite

1. 备份 PostgreSQL 数据
2. 在 `.env` 中设置 `DB_TYPE=sqlite`
3. 运行迁移：`bun run db:migrate`
4. 迁移数据（需要手动脚本）

## 备份与恢复

### SQLite 备份

```bash
# 备份
cp data/app.db data/app.db.backup

# 恢复
cp data/app.db.backup data/app.db
```

### PostgreSQL 备份

```bash
# 备份
docker exec bili-monitor-postgres-test pg_dump -U bili_monitor_test bili_monitor_test > backup.sql

# 恢复
docker exec -i bili-monitor-postgres-test psql -U bili_monitor_test bili_monitor_test < backup.sql
```

## 安全建议

1. **使用强密码**：至少 32 字符的随机字符串
2. **限制网络访问**：只允许应用服务器访问数据库
3. **使用 SSL 连接**（生产环境）：
   ```
   DATABASE_URL=postgres://user:pass@host:port/db?sslmode=require
   ```
4. **定期备份**：设置自动备份脚本
5. **监控日志**：定期检查数据库日志

## 故障排查

### 连接失败

1. 检查 PostgreSQL 服务是否运行：`docker ps`
2. 检查端口是否正确：`netstat -tuln | grep 5555` 或 `netstat -tuln | grep 5556`
3. 检查防火墙设置
4. 验证连接字符串格式

### 迁移失败

1. 检查数据库是否存在
2. 检查用户权限
3. 查看迁移日志：`src/db/migrations/`

### 性能问题

1. 检查索引是否创建
2. 使用 `EXPLAIN ANALYZE` 分析查询
3. 考虑连接池配置

