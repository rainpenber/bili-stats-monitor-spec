# 后端架构规划：B站数据监控工具

**Branch**: `001-bilibili-monitor` | **Date**: 2025-12-20  
**Tech Stack**: Hono.js + Bun + SQLite/PostgreSQL  
**Status**: Draft

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Hono.js Application                       │
├─────────────────────────────────────────────────────────────────────┤
│  Routes Layer                                                        │
│  ├── /api/v1/auth/*        (认证)                                   │
│  ├── /api/v1/accounts/*    (B站账号管理)                            │
│  ├── /api/v1/tasks/*       (监控任务)                               │
│  ├── /api/v1/metrics/*     (数据查询)                               │
│  ├── /api/v1/notifications/* (通知配置)                             │
│  ├── /api/v1/logs/*        (系统日志)                               │
│  └── /api/v1/settings/*    (系统设置)                               │
├─────────────────────────────────────────────────────────────────────┤
│  Service Layer (业务逻辑)                                            │
│  ├── AuthService           (JWT/会话管理)                           │
│  ├── AccountService        (B站账号绑定/验证)                       │
│  ├── TaskService           (任务CRUD/批量操作)                      │
│  ├── CollectorService      (B站数据采集)                            │
│  ├── SchedulerService      (持久化任务调度)                         │
│  ├── MetricsService        (时序数据存储/查询)                      │
│  ├── NotificationService   (多渠道通知)                             │
│  └── LogService            (日志记录/查询)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                                │
│  ├── Database Adapter      (SQLite / PostgreSQL 统一接口)           │
│  ├── BiliApiClient         (B站API封装 + WBI签名)                   │
│  ├── NotifyChannels        (各通知渠道实现)                         │
│  └── MediaCache            (封面/头像本地缓存)                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术选型

### 2.1 核心框架

| 组件 | 选型 | 理由 |
|------|------|------|
| Runtime | Bun 1.x | 项目约定，性能优秀 |
| Web Framework | Hono.js | 轻量、Bun 原生支持、类型安全 |
| ORM/Query Builder | Drizzle ORM | 支持 SQLite/PostgreSQL 双驱动、类型安全、轻量 |
| Validation | Zod | 与前端共享 schema、运行时校验 |
| Auth | jose (JWT) | Bun 兼容、轻量 |

### 2.2 数据库策略

支持三种部署模式，通过环境变量 `DB_TYPE` 切换：

```typescript
// config/database.ts
type DbType = 'sqlite' | 'postgres'

interface DbConfig {
  type: DbType
  // SQLite
  sqlitePath?: string        // 默认 ./data/app.db
  // PostgreSQL
  postgresUrl?: string       // postgres://user:pass@host:5432/db
}
```

**模式对比**：

| 模式 | 环境变量 | 适用场景 |
|------|----------|----------|
| 内置 SQLite | `DB_TYPE=sqlite` | 开发/单机部署（默认） |
| 外置 PostgreSQL | `DB_TYPE=postgres` + `DATABASE_URL` | Docker/生产环境 |

**Drizzle 双驱动实现**：

```typescript
// db/index.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'

export function createDb(config: DbConfig) {
  if (config.type === 'sqlite') {
    const sqlite = new Database(config.sqlitePath ?? './data/app.db')
    return drizzleSqlite(sqlite, { schema })
  } else {
    const client = postgres(config.postgresUrl!)
    return drizzlePg(client, { schema })
  }
}
```

### 2.3 依赖注入模式

采用"手动构造函数注入 + 工厂函数"模式（轻量级 DI）：

```typescript
// services/container.ts
export interface ServiceContainer {
  config: AppConfig
  db: DrizzleInstance
  biliApi: BiliApiClient
  scheduler: SchedulerService
  notifier: NotificationService
  // ...
}

export function createContainer(config: AppConfig): ServiceContainer {
  const db = createDb(config.database)
  const biliApi = new BiliApiClient(config.bili)
  const notifier = new NotificationService(config.notify)
  const scheduler = new SchedulerService(db, biliApi, notifier)
  
  return { config, db, biliApi, scheduler, notifier }
}

// app.ts - 注入到 Hono 上下文
const container = createContainer(loadConfig())

app.use('*', async (c, next) => {
  c.set('container', container)
  await next()
})
```

---

## 3. 功能模块详细设计

### 3.1 B站 API 集成模块

#### 3.1.1 WBI 签名服务

```typescript
// services/bili/wbi.ts
class WbiService {
  private imgKey: string = ''
  private subKey: string = ''
  private lastRefresh: number = 0
  
  // 每日刷新 key（从 /x/web-interface/nav 获取）
  async refreshKeys(sessdata?: string): Promise<void>
  
  // 对请求参数添加 w_rid + wts 签名
  signParams(params: Record<string, string | number>): Record<string, string>
  
  // 混淆 key 算法（MIXIN_KEY_ENC_TAB）
  private getMixinKey(orig: string): string
}
```

**关键实现要点**：
- `img_key` / `sub_key` 从 nav 接口解析 URL 文件名
- 缓存有效期：建议 12 小时或首次请求失败时刷新
- 签名算法：按 key 排序 → URL encode → 拼接 mixin_key → MD5

#### 3.1.2 B站 API 客户端

```typescript
// services/bili/client.ts
class BiliApiClient {
  constructor(private wbi: WbiService) {}
  
  // 设置当前使用的账号凭据
  setCredentials(sessdata: string, biliJct: string): void
  
  // 二维码登录
  async generateQrCode(): Promise<{ sessionId: string; qrUrl: string; expireAt: Date }>
  async pollQrCodeStatus(sessionId: string): Promise<QrPollResult>
  
  // 视频数据
  async getVideoView(bvid: string): Promise<VideoInfo>      // 包含 CID
  async getVideoStat(bvid: string): Promise<VideoStat>      // 播放/点赞/投币...
  async getOnlineTotal(bvid: string, cid: string): Promise<number>
  
  // 用户数据
  async getUserStat(mid: string): Promise<{ follower: number }>
  async getUserVideos(mid: string, page: number): Promise<VideoListResult>
  
  // 通用 WBI 签名请求
  private async wbiRequest<T>(url: string, params: Record<string, any>): Promise<T>
}
```

**B站 API 端点映射**：

| 功能 | 端点 | 是否需要 WBI | 是否需要登录 |
|------|------|-------------|-------------|
| 生成二维码 | `/x/passport-login/web/qrcode/generate` | ❌ | ❌ |
| 轮询二维码 | `/x/passport-login/web/qrcode/poll` | ❌ | ❌ |
| Nav 信息 | `/x/web-interface/nav` | ❌ | ✅ (获取 WBI keys) |
| 视频信息 | `/x/web-interface/view` | ❌ | ❌ |
| 在线人数 | `/x/player/online/total` | ❌ | ❌ |
| 用户粉丝数 | `/x/relation/stat` | ✅ | ❌ |
| 用户投稿 | `/x/space/wbi/arc/search` | ✅ | ❌ |

### 3.2 持久化调度器

```typescript
// services/scheduler.ts
class SchedulerService {
  private running = false
  private pollInterval = 5000 // 5秒轮询一次

  constructor(
    private db: DrizzleInstance,
    private collector: CollectorService,
    private notifier: NotificationService
  ) {}

  // 启动调度器（应用启动时调用）
  async start(): Promise<void> {
    this.running = true
    this.poll()
  }

  // 主轮询循环
  private async poll(): Promise<void> {
    while (this.running) {
      const dueTasks = await this.getDueTasks()
      for (const task of dueTasks) {
        await this.executeTask(task)
      }
      await Bun.sleep(this.pollInterval)
    }
  }

  // 获取到期任务
  private async getDueTasks(): Promise<MonitoringTask[]> {
    return this.db.query.tasks.findMany({
      where: and(
        eq(tasks.status, 'running'),
        lte(tasks.nextRunAt, new Date()),
        lt(tasks.deadline, new Date()) // 未过期
      ),
      orderBy: asc(tasks.nextRunAt),
      limit: 10 // 批量处理，避免积压
    })
  }

  // 执行单个任务
  private async executeTask(task: MonitoringTask): Promise<void> {
    try {
      const data = await this.collector.collect(task)
      await this.saveMetrics(task, data)
      await this.updateNextRun(task)
      await this.checkAlerts(task, data)
    } catch (e) {
      await this.handleTaskError(task, e)
    }
  }

  // 计算下次执行时间
  private calculateNextRun(task: MonitoringTask): Date {
    if (task.strategy.mode === 'fixed') {
      const { value, unit } = task.strategy
      const ms = unit === 'minute' ? value * 60000
               : unit === 'hour' ? value * 3600000
               : value * 86400000
      return new Date(Date.now() + ms)
    } else {
      // 智能频率：根据发布时间计算
      return this.calculateSmartInterval(task)
    }
  }
}
```

**智能频率算法**：

```typescript
private calculateSmartInterval(task: MonitoringTask): Date {
  const pubDate = task.publishedAt ?? task.createdAt
  const daysSincePublish = (Date.now() - pubDate.getTime()) / 86400000

  let intervalMinutes: number
  if (daysSincePublish < 5) {
    intervalMinutes = 10      // 段A: 0-5天 → 每10分钟
  } else if (daysSincePublish < 14) {
    intervalMinutes = 120     // 段B: 5-14天 → 每2小时
  } else {
    intervalMinutes = 240     // 段C: 14天+ → 每4小时
  }
  
  return new Date(Date.now() + intervalMinutes * 60000)
}
```

### 3.3 通知服务

#### 3.3.1 通知渠道优先级

按用户要求的优先级实现：

1. **OneBot v11** (go-cqhttp 协议，与 notify.py 实现一致)
2. **Telegram**
3. **Bark** (iOS)
4. **PushDeer**
5. **企业微信** (应用消息 / 机器人)
6. **飞书**
7. **钉钉**
8. **邮件** (SMTP)
9. **Webhook** (自定义)

#### 3.3.2 通知渠道接口

```typescript
// services/notify/channel.ts
interface NotifyChannel {
  readonly name: string
  readonly configSchema: ZodSchema  // 配置校验
  
  send(title: string, content: string, config: ChannelConfig): Promise<boolean>
  test(config: ChannelConfig): Promise<boolean>
}

// 各渠道实现
class OneBotChannel implements NotifyChannel { ... }
class TelegramChannel implements NotifyChannel { ... }
class BarkChannel implements NotifyChannel { ... }
class PushDeerChannel implements NotifyChannel { ... }
class WeComChannel implements NotifyChannel { ... }
class FeishuChannel implements NotifyChannel { ... }
class DingTalkChannel implements NotifyChannel { ... }
class EmailChannel implements NotifyChannel { ... }
class WebhookChannel implements NotifyChannel { ... }
```

#### 3.3.3 通知服务主类

```typescript
// services/notify/service.ts
class NotificationService {
  private channels: Map<string, NotifyChannel> = new Map()
  
  constructor() {
    // 按优先级注册渠道
    this.register('onebot', new OneBotChannel())
    this.register('telegram', new TelegramChannel())
    this.register('bark', new BarkChannel())
    this.register('pushdeer', new PushDeerChannel())
    this.register('wecom', new WeComChannel())
    this.register('feishu', new FeishuChannel())
    this.register('dingtalk', new DingTalkChannel())
    this.register('email', new EmailChannel())
    this.register('webhook', new WebhookChannel())
  }
  
  // 发送通知（按规则匹配渠道）
  async send(event: NotifyEvent, rules: NotifyRule[]): Promise<void> {
    for (const rule of rules) {
      if (!rule.enabled) continue
      if (!rule.triggers.includes(event.type)) continue
      
      for (const channelName of rule.channels) {
        const channel = this.channels.get(channelName)
        if (channel) {
          await channel.send(event.title, event.content, rule.channelConfigs[channelName])
        }
      }
    }
  }
}
```

### 3.4 账号管理服务

```typescript
// services/account.ts
class AccountService {
  constructor(
    private db: DrizzleInstance,
    private biliApi: BiliApiClient
  ) {}

  // Cookie 绑定
  async bindByCookie(cookie: string): Promise<Account> {
    const sessdata = this.extractSessdata(cookie)
    if (!sessdata) throw new Error('Cookie 中未找到 SESSDATA')
    
    // 验证 Cookie 有效性
    const userInfo = await this.biliApi.withCredentials(sessdata).getNav()
    if (!userInfo.isLogin) throw new Error('Cookie 已失效')
    
    // 保存账号
    return this.db.insert(accounts).values({
      uid: userInfo.mid,
      nickname: userInfo.uname,
      sessdata: encrypt(sessdata),
      bindMethod: 'cookie',
      status: 'valid',
      boundAt: new Date()
    }).returning()
  }

  // 二维码绑定
  async startQrLogin(): Promise<QrSession> {
    const qr = await this.biliApi.generateQrCode()
    await this.db.insert(qrSessions).values({
      sessionId: qr.sessionId,
      qrUrl: qr.qrUrl,
      expireAt: qr.expireAt,
      status: 'pending'
    })
    return qr
  }

  async pollQrLogin(sessionId: string): Promise<QrPollResult> {
    const result = await this.biliApi.pollQrCodeStatus(sessionId)
    
    if (result.code === 0) {
      // 扫码成功，提取凭据并保存
      const cookies = parseCookiesFromUrl(result.url)
      await this.bindByCookie(cookies)
      await this.db.update(qrSessions)
        .set({ status: 'confirmed' })
        .where(eq(qrSessions.sessionId, sessionId))
    }
    
    return result
  }

  // 验证账号有效性（定期检查）
  async validateAccount(accountId: string): Promise<boolean> {
    const account = await this.db.query.accounts.findFirst({
      where: eq(accounts.id, accountId)
    })
    
    if (!account) return false
    
    try {
      const sessdata = decrypt(account.sessdata)
      const nav = await this.biliApi.withCredentials(sessdata).getNav()
      
      if (nav.isLogin) {
        await this.db.update(accounts)
          .set({ status: 'valid', lastFailures: 0 })
          .where(eq(accounts.id, accountId))
        return true
      }
    } catch {
      await this.incrementFailure(accountId)
    }
    
    return false
  }

  // 失败计数 + 超过5次暂停关联任务
  private async incrementFailure(accountId: string): Promise<void> {
    const account = await this.db.query.accounts.findFirst({
      where: eq(accounts.id, accountId)
    })
    
    const failures = (account?.lastFailures ?? 0) + 1
    
    await this.db.update(accounts)
      .set({ lastFailures: failures, status: failures > 5 ? 'expired' : 'valid' })
      .where(eq(accounts.id, accountId))
    
    if (failures > 5) {
      // 暂停关联任务
      await this.db.update(tasks)
        .set({ status: 'paused', reason: '账号鉴权失败' })
        .where(eq(tasks.accountId, accountId))
      
      // 发送告警通知
      await this.notifier.send({
        type: 'account_expired',
        title: '账号鉴权失败',
        content: `账号 ${account?.nickname} 连续鉴权失败超过5次，已暂停关联任务`
      })
    }
  }
}
```

---

## 4. 数据模型（Drizzle Schema）

```typescript
// db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core'

// 使用条件导出支持双数据库
const createSchema = (isPostgres: boolean) => {
  const table = isPostgres ? pgTable : sqliteTable
  
  return {
    users: table('users', {
      id: text('id').primaryKey(),
      username: text('username').notNull().unique(),
      passwordHash: text('password_hash').notNull(),
      role: text('role', { enum: ['admin', 'viewer'] }).notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    }),

    accounts: table('accounts', {
      id: text('id').primaryKey(),
      uid: text('uid').notNull(),
      nickname: text('nickname').notNull(),
      sessdata: text('sessdata').notNull(),        // 加密存储
      biliJct: text('bili_jct'),
      bindMethod: text('bind_method', { enum: ['cookie', 'qrcode'] }).notNull(),
      status: text('status', { enum: ['valid', 'expired'] }).notNull(),
      lastFailures: integer('last_failures').default(0),
      boundAt: integer('bound_at', { mode: 'timestamp' }).notNull(),
    }),

    tasks: table('tasks', {
      id: text('id').primaryKey(),
      type: text('type', { enum: ['video', 'author'] }).notNull(),
      targetId: text('target_id').notNull(),       // BV号 或 UID
      title: text('title'),                         // 视频标题 或 博主昵称
      cid: text('cid'),                            // 视频的 CID（动态获取）
      accountId: text('account_id').references(() => accounts.id),
      strategy: text('strategy', { mode: 'json' }).notNull(), // { mode, value?, unit? }
      deadline: integer('deadline', { mode: 'timestamp' }).notNull(),
      status: text('status', { enum: ['running', 'stopped', 'completed', 'failed', 'paused'] }).notNull(),
      reason: text('reason'),                      // 暂停/失败原因
      tags: text('tags', { mode: 'json' }),        // string[]
      nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
      publishedAt: integer('published_at', { mode: 'timestamp' }), // 视频发布时间
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    }),

    videoMetrics: table('video_metrics', {
      id: text('id').primaryKey(),
      taskId: text('task_id').notNull().references(() => tasks.id),
      collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull(),
      view: integer('view').notNull(),
      online: integer('online'),
      like: integer('like').notNull(),
      coin: integer('coin').notNull(),
      favorite: integer('favorite').notNull(),
      share: integer('share').notNull(),
      danmaku: integer('danmaku').notNull(),
      reply: integer('reply'),
    }),

    authorMetrics: table('author_metrics', {
      id: text('id').primaryKey(),
      taskId: text('task_id').notNull().references(() => tasks.id),
      collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull(),
      follower: integer('follower').notNull(),
    }),

    notifyChannels: table('notify_channels', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),                // onebot, telegram, bark...
      enabled: integer('enabled', { mode: 'boolean' }).default(false),
      config: text('config', { mode: 'json' }),    // 渠道配置（加密敏感字段）
    }),

    notifyRules: table('notify_rules', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      triggers: text('triggers', { mode: 'json' }).notNull(), // string[]
      channels: text('channels', { mode: 'json' }).notNull(), // string[]
    }),

    systemLogs: table('system_logs', {
      id: text('id').primaryKey(),
      ts: integer('ts', { mode: 'timestamp' }).notNull(),
      level: text('level', { enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] }).notNull(),
      source: text('source').notNull(),
      message: text('message').notNull(),
    }),

    settings: table('settings', {
      key: text('key').primaryKey(),
      value: text('value', { mode: 'json' }).notNull(),
    }),

    mediaAssets: table('media_assets', {
      id: text('id').primaryKey(),
      targetType: text('target_type', { enum: ['video', 'author'] }).notNull(),
      targetId: text('target_id').notNull(),
      assetType: text('asset_type', { enum: ['cover', 'avatar'] }).notNull(),
      localPath: text('local_path'),
      sourceUrl: text('source_url'),
      lastRefresh: integer('last_refresh', { mode: 'timestamp' }),
      status: text('status', { enum: ['cached', 'failed', 'pending'] }).notNull(),
    }),
  }
}
```

---

## 5. 项目目录结构

```
backend/
├── src/
│   ├── app.ts                    # Hono 应用入口
│   ├── config/
│   │   ├── index.ts              # 配置加载
│   │   ├── database.ts           # 数据库配置
│   │   └── env.ts                # 环境变量定义
│   ├── db/
│   │   ├── index.ts              # 数据库连接工厂
│   │   ├── schema.ts             # Drizzle Schema
│   │   ├── migrations/           # 迁移文件
│   │   └── seed.ts               # 初始数据
│   ├── routes/
│   │   ├── auth.ts               # /api/v1/auth/*
│   │   ├── accounts.ts           # /api/v1/accounts/*
│   │   ├── tasks.ts              # /api/v1/tasks/*
│   │   ├── metrics.ts            # /api/v1/metrics/*
│   │   ├── notifications.ts      # /api/v1/notifications/*
│   │   ├── logs.ts               # /api/v1/logs/*
│   │   └── settings.ts           # /api/v1/settings/*
│   ├── services/
│   │   ├── container.ts          # 依赖注入容器
│   │   ├── auth.ts               # 认证服务
│   │   ├── account.ts            # 账号管理
│   │   ├── task.ts               # 任务管理
│   │   ├── collector.ts          # 数据采集
│   │   ├── scheduler.ts          # 任务调度
│   │   ├── metrics.ts            # 指标服务
│   │   ├── log.ts                # 日志服务
│   │   ├── bili/
│   │   │   ├── client.ts         # B站API客户端
│   │   │   └── wbi.ts            # WBI签名
│   │   └── notify/
│   │       ├── service.ts        # 通知服务主类
│   │       ├── channel.ts        # 渠道接口
│   │       └── channels/         # 各渠道实现
│   │           ├── onebot.ts
│   │           ├── telegram.ts
│   │           ├── bark.ts
│   │           ├── pushdeer.ts
│   │           ├── wecom.ts
│   │           ├── feishu.ts
│   │           ├── dingtalk.ts
│   │           ├── email.ts
│   │           └── webhook.ts
│   ├── middlewares/
│   │   ├── auth.ts               # JWT 验证
│   │   ├── error.ts              # 统一错误处理
│   │   └── logger.ts             # 请求日志
│   ├── utils/
│   │   ├── crypto.ts             # 加密/解密
│   │   ├── id.ts                 # ID 生成
│   │   └── response.ts           # 统一响应格式
│   └── types/
│       └── index.ts              # 类型定义
├── data/                         # SQLite 数据文件（gitignore）
├── media/                        # 媒体缓存目录
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── .env.example
```

---

## 6. API 路由实现映射

基于现有 `contracts/openapi.yaml`，路由实现如下：

| OpenAPI 路径 | Hono 路由 | 处理函数 |
|-------------|-----------|----------|
| `POST /api/v1/auth/login` | `authRoutes.post('/login')` | `AuthController.login` |
| `POST /api/v1/auth/logout` | `authRoutes.post('/logout')` | `AuthController.logout` |
| `GET /api/v1/auth/profile` | `authRoutes.get('/profile')` | `AuthController.profile` |
| `GET /api/v1/accounts` | `accountRoutes.get('/')` | `AccountController.list` |
| `POST /api/v1/accounts/cookie` | `accountRoutes.post('/cookie')` | `AccountController.bindCookie` |
| `POST /api/v1/accounts/qrcode` | `accountRoutes.post('/qrcode')` | `AccountController.startQrLogin` |
| `GET /api/v1/accounts/qrcode/status` | `accountRoutes.get('/qrcode/status')` | `AccountController.pollQr` |
| `GET /api/v1/accounts/default` | `accountRoutes.get('/default')` | `AccountController.getDefault` |
| `POST /api/v1/accounts/default` | `accountRoutes.post('/default')` | `AccountController.setDefault` |
| `GET /api/v1/tasks` | `taskRoutes.get('/')` | `TaskController.list` |
| `POST /api/v1/tasks` | `taskRoutes.post('/')` | `TaskController.create` |
| `GET /api/v1/tasks/:id` | `taskRoutes.get('/:id')` | `TaskController.detail` |
| `POST /api/v1/tasks/:id` | `taskRoutes.post('/:id')` | `TaskController.updateOrDelete` |
| `POST /api/v1/tasks/batch` | `taskRoutes.post('/batch')` | `TaskController.batchAction` |
| `GET /api/v1/tasks/:id/metrics` | `metricsRoutes.get('/:id/metrics')` | `MetricsController.query` |
| `POST /api/v1/lookup` | `lookupRoutes.post('/')` | `LookupController.lookup` |
| `GET /api/v1/notifications/channels` | `notifyRoutes.get('/channels')` | `NotifyController.getChannels` |
| `POST /api/v1/notifications/channels` | `notifyRoutes.post('/channels')` | `NotifyController.saveChannels` |
| `GET /api/v1/notifications/rules` | `notifyRoutes.get('/rules')` | `NotifyController.getRules` |
| `POST /api/v1/notifications/rules` | `notifyRoutes.post('/rules')` | `NotifyController.saveRule` |
| `POST /api/v1/notifications/test` | `notifyRoutes.post('/test')` | `NotifyController.testSend` |
| `GET /api/v1/logs` | `logRoutes.get('/')` | `LogController.query` |
| `GET /api/v1/logs/download` | `logRoutes.get('/download')` | `LogController.download` |

---

## 7. 环境变量配置

```env
# .env.example

# 服务器
PORT=8080
NODE_ENV=development

# 数据库 (sqlite | postgres)
DB_TYPE=sqlite
SQLITE_PATH=./data/app.db
# DATABASE_URL=postgres://user:pass@localhost:5432/bili_monitor

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# 加密（用于存储 SESSDATA 等敏感信息）
ENCRYPT_KEY=32-char-encryption-key-here!!!!

# B站相关
BILI_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# 通知渠道配置（可选，也可在 Web UI 配置）
ONEBOT_URL=
ONEBOT_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
BARK_SERVER=
BARK_KEY=
# ... 其他渠道
```

---

## 8. 实现阶段规划

### Phase 1: 基础框架搭建
- [ ] 初始化 Bun + Hono 项目
- [ ] 配置 Drizzle ORM（双数据库支持）
- [ ] 实现统一响应格式和错误处理
- [ ] 实现 JWT 认证中间件
- [ ] 实现基础日志服务

### Phase 2: B站 API 集成
- [ ] 实现 WBI 签名服务
- [ ] 实现二维码登录流程
- [ ] 实现视频信息获取
- [ ] 实现用户粉丝数获取
- [ ] Cookie 验证与账号管理

### Phase 3: 核心业务
- [ ] 任务 CRUD
- [ ] 持久化调度器
- [ ] 数据采集服务
- [ ] 时序数据存储与查询

### Phase 4: 通知系统
- [ ] 通知渠道接口设计
- [ ] 按优先级实现各渠道
- [ ] 通知规则管理

### Phase 5: 系统完善
- [ ] 媒体缓存（封面/头像）
- [ ] 日志查询与下载
- [ ] 系统设置
- [ ] Docker 化部署

---

## 9. 注意事项

### 9.1 BV 号与 CID

- BV 号是视频标识，但获取在线人数等数据需要 CID
- CID 只有视频发布后才存在
- 对于预约监控（视频未发布），需要在指定时间后尝试获取 CID

**预约监控重试策略**：
- 到达 deadline 后开始尝试获取 CID
- 每 1 分钟重试一次
- 最多重试 5 次
- 5 次均失败后：标记任务为 `failed`，停止监控，发送通知

```typescript
// 获取 CID 的重试逻辑
async function ensureCid(task: Task): Promise<string | null> {
  if (task.cid) return task.cid
  
  const info = await biliApi.getVideoView(task.targetId)
  if (info?.cid) {
    await db.update(tasks).set({ cid: info.cid, cidRetries: 0 }).where(eq(tasks.id, task.id))
    return info.cid
  }
  
  // CID 获取失败，增加重试计数
  const retries = (task.cidRetries ?? 0) + 1
  if (retries >= 5) {
    // 达到最大重试次数，标记失败
    await db.update(tasks)
      .set({ status: 'failed', reason: '视频未发布或已删除（CID获取失败5次）' })
      .where(eq(tasks.id, task.id))
    
    await notifier.send({
      type: 'task_failed',
      title: '监控任务失败',
      content: `任务「${task.title}」因无法获取视频信息已停止监控`
    })
    
    return null
  }
  
  // 记录重试次数，1分钟后再次尝试
  await db.update(tasks)
    .set({ cidRetries: retries, nextRunAt: new Date(Date.now() + 60000) })
    .where(eq(tasks.id, task.id))
  
  return null
}
```

### 9.2 风控规避

- 所有请求使用统一的账号凭据（全局默认账号）
- 请求间隔不低于 1 分钟
- 单进程单并发执行采集
- 添加合理的 User-Agent 和 Referer

### 9.3 数据安全

- SESSDATA、bili_jct 等凭据加密存储
- 日志中不记录敏感信息原文
- JWT 使用强密钥，定期轮换

---

## 10. 参考资料

- [B站 API 文档集合](./../../docs/bili-api/)
- [Python 实现参考](./../../docs/back-dev/)
- [青龙通知实现](./../../docs/qinglong/notify.py)
- [OpenAPI 契约](./../../contracts/openapi.yaml)

