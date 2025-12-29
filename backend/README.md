# B站数据监控工具 - 后端服务

基于 Hono.js + Bun 的后端服务。

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. 数据库配置

#### 选项 A: SQLite（本地开发，默认）

```env
DB_TYPE=sqlite
SQLITE_PATH=./data/app.db
```

#### 选项 B: PostgreSQL（生产环境或远程服务器）

```env
DB_TYPE=postgres
DATABASE_URL=postgres://username:password@host:port/database
```

**示例（连接到远程服务器 192.168.0.124）：**
```env
# 测试环境
DB_TYPE=postgres
DATABASE_URL=postgres://bili_monitor_test:your_password@192.168.0.124:5555/bili_monitor_test

# 生产环境
# DATABASE_URL=postgres://bili_monitor_prod:your_password@192.168.0.124:5556/bili_monitor_prod
```

### 4. 初始化数据库

#### SQLite

```bash
# 生成迁移文件
bun run db:generate

# 运行迁移（SQLite 会自动创建数据库文件）
bun run db:migrate
```

#### PostgreSQL

确保 PostgreSQL 服务已启动并创建了数据库，然后：

```bash
# 设置数据库连接
export DATABASE_URL=postgres://username:password@host:port/database

# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate
```

### 5. 启动服务

```bash
bun run dev
```

服务将在 `http://localhost:8080` 启动。

## 数据库迁移

### 生成迁移

```bash
bun run db:generate
```

### 运行迁移

```bash
bun run db:migrate
```

### 查看数据库（Drizzle Studio）

```bash
bun run db:studio
```

## 环境变量说明

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `PORT` | 服务端口 | `8080` | 否 |
| `NODE_ENV` | 环境模式 | `development` | 否 |
| `DB_TYPE` | 数据库类型 | `sqlite` | 否 |
| `SQLITE_PATH` | SQLite 文件路径 | `./data/app.db` | SQLite 时 |
| `DATABASE_URL` | PostgreSQL 连接字符串 | - | PostgreSQL 时 |
| `JWT_SECRET` | JWT 密钥（至少32字符） | - | **是** |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` | 否 |
| `ENCRYPT_KEY` | 加密密钥（至少32字符） | - | **是** |
| `BILI_USER_AGENT` | B站请求 User-Agent | 默认值 | 否 |

## 项目结构

```
backend/
├── src/
│   ├── index.ts              # 入口文件
│   ├── config/               # 配置管理
│   ├── db/                   # 数据库（Schema + 迁移）
│   ├── routes/               # API 路由
│   ├── services/             # 业务逻辑
│   ├── middlewares/          # 中间件
│   └── utils/                # 工具函数
├── data/                     # SQLite 数据文件（gitignore）
└── package.json
```

## 开发

### 热重载

```bash
bun run dev
```

### 测试

```bash
bun test
```

## 生产部署

### Docker 部署

参考项目根目录的 `docker-compose.yml`。

### 环境变量

确保生产环境设置了所有必需的环境变量，特别是：
- `JWT_SECRET`（强随机字符串）
- `ENCRYPT_KEY`（强随机字符串）
- `DATABASE_URL`（如果使用 PostgreSQL）

## 数据库切换

项目支持在 SQLite 和 PostgreSQL 之间切换，只需修改 `.env` 中的 `DB_TYPE` 和相应的连接配置即可。

**注意**：SQLite 和 PostgreSQL 使用不同的 schema 文件：
- SQLite: `src/db/schema.ts`
- PostgreSQL: `src/db/schema-pg.ts`

迁移文件也会根据数据库类型自动生成到 `src/db/migrations/` 目录。
