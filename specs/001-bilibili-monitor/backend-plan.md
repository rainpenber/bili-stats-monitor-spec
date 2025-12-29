# Implementation Plan: 后端服务 (Hono + Bun)

**Branch**: `001-bilibili-monitor` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification + backend-architecture.md

---

## Summary

实现 B站数据监控工具的后端服务：
- **Runtime**: Bun 1.x
- **Framework**: Hono.js（轻量、Bun 原生支持）
- **ORM**: Drizzle ORM（SQLite/PostgreSQL 双驱动）
- **调度**: 持久化轮询调度器（5秒轮询 + nextRunAt 持久化）
- **通知**: 9 个渠道，与 notify.py 实现一致

---

## Technical Context

| 项目 | 选型 |
|------|------|
| **Runtime** | Bun 1.x |
| **Framework** | Hono.js 4.x |
| **ORM** | Drizzle ORM (bun-sqlite + postgres-js) |
| **数据库** | SQLite（默认）/ PostgreSQL（可选） |
| **验证** | Zod（与前端共享 schema） |
| **认证** | jose (JWT) |
| **加密** | Bun 内置 crypto |
| **测试** | bun test |
| **Target Platform** | Linux/macOS/Windows Server |

---

## Constitution Check ✅

| 条款 | 状态 | 说明 |
|------|------|------|
| **Front-End First** | ✅ | 前端页面已完成 Phase 1-6 |
| **API Contract Before Backend** | ✅ | OpenAPI 契约已在 `contracts/openapi.yaml` |
| **Bun Runtime Alignment** | ✅ | 所有依赖均兼容 Bun |
| **Monorepo + pnpm + Vite** | ✅ | 保持 `frontend/` + `backend/` 结构 |
| **Incremental Delivery** | ✅ | 分 5 个 Phase 逐步交付 |

---

## Project Structure

```text
backend/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── src/
│   ├── index.ts                  # 入口
│   ├── app.ts                    # Hono 应用配置
│   ├── config/
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── env.ts
│   ├── db/
│   │   ├── index.ts              # 数据库连接工厂
│   │   ├── schema.ts             # Drizzle Schema
│   │   └── migrations/
│   ├── routes/
│   │   ├── index.ts              # 路由聚合
│   │   ├── auth.ts
│   │   ├── accounts.ts
│   │   ├── tasks.ts
│   │   ├── metrics.ts
│   │   ├── notifications.ts
│   │   ├── logs.ts
│   │   └── settings.ts
│   ├── services/
│   │   ├── container.ts          # 轻量 DI
│   │   ├── auth.ts
│   │   ├── account.ts
│   │   ├── task.ts
│   │   ├── collector.ts
│   │   ├── scheduler.ts
│   │   ├── metrics.ts
│   │   ├── log.ts
│   │   ├── bili/
│   │   │   ├── client.ts
│   │   │   └── wbi.ts
│   │   └── notify/
│   │       ├── service.ts
│   │       ├── channel.ts
│   │       └── channels/
│   │           ├── onebot.ts     # go-cqhttp v11
│   │           ├── telegram.ts
│   │           ├── bark.ts
│   │           ├── pushdeer.ts
│   │           ├── wecom.ts
│   │           ├── feishu.ts
│   │           ├── dingtalk.ts
│   │           ├── email.ts
│   │           └── webhook.ts
│   ├── middlewares/
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   └── logger.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── id.ts
│   │   └── response.ts
│   └── types/
│       └── index.ts
├── data/                         # SQLite 文件（gitignore）
└── media/                        # 媒体缓存
```

---

## Implementation Phases

### Phase 1: 基础框架搭建 (预计 4h)

| Task ID | 描述 | 文件 | 验收指标 |
|---------|------|------|----------|
| B001 | 初始化 Bun + Hono 项目 | `backend/package.json`, `tsconfig.json` | `bun run dev` 启动无报错 |
| B002 | 配置环境变量加载 | `src/config/env.ts` | 能读取 `.env` 文件 |
| B003 | 配置 Drizzle ORM（双数据库） | `src/db/index.ts`, `drizzle.config.ts` | SQLite/PG 均可连接 |
| B004 | 定义 Drizzle Schema | `src/db/schema.ts` | 与 data-model.md 一致 |
| B005 | 实现统一响应格式 | `src/utils/response.ts` | `{ code, message, data }` |
| B006 | 实现错误处理中间件 | `src/middlewares/error.ts` | 捕获异常返回标准格式 |
| B007 | 实现请求日志中间件 | `src/middlewares/logger.ts` | 记录请求信息到 system_logs |
| B008 | 实现 JWT 认证中间件 | `src/middlewares/auth.ts` | 验证 token，注入 user |
| B009 | 实现日志服务 | `src/services/log.ts` | 写入/查询 system_logs |
| B010 | 创建轻量 DI 容器 | `src/services/container.ts` | 单例管理所有服务 |

**Phase 1 验收**: `bun run dev` 启动，`GET /health` 返回 `{ code: 0, message: "ok" }`

---

### Phase 2: B站 API 集成 (预计 6h)

| Task ID | 描述 | 文件 | 验收指标 |
|---------|------|------|----------|
| B011 | 实现 WBI 签名服务 | `src/services/bili/wbi.ts` | 签名结果与 Python 实现一致 |
| B012 | 实现二维码登录（生成） | `src/services/bili/client.ts` | 返回 qrUrl + sessionId |
| B013 | 实现二维码登录（轮询） | `src/services/bili/client.ts` | 返回登录状态和凭据 |
| B014 | 实现 Cookie 绑定 | `src/services/account.ts` | 从 Cookie 提取 SESSDATA |
| B015 | 实现账号验证 | `src/services/account.ts` | 调用 nav 接口验证有效性 |
| B016 | 实现视频信息获取 | `src/services/bili/client.ts` | 返回 BV/标题/CID |
| B017 | 实现在线人数获取 | `src/services/bili/client.ts` | 返回 total |
| B018 | 实现粉丝数获取 | `src/services/bili/client.ts` | 返回 follower |
| B019 | 实现账号管理路由 | `src/routes/accounts.ts` | CRUD + QR 登录 |
| B020 | 实现加密存储 | `src/utils/crypto.ts` | AES 加密 SESSDATA |

**Phase 2 验收**: 
- 扫码登录流程完整
- 能获取视频/用户数据
- Cookie 加密存储

---

### Phase 3: 核心业务 (预计 8h)

| Task ID | 描述 | 文件 | 验收指标 |
|---------|------|------|----------|
| B021 | 实现任务 CRUD | `src/services/task.ts` | 创建/读取/更新/删除 |
| B022 | 实现任务路由 | `src/routes/tasks.ts` | 对应 OpenAPI 契约 |
| B023 | 实现批量操作 | `src/services/task.ts` | 批量启停/删除 |
| B024 | 实现数据采集服务 | `src/services/collector.ts` | 根据任务类型采集数据 |
| B025 | 实现 CID 获取与重试 | `src/services/collector.ts` | 5次重试逻辑 |
| B026 | 实现持久化调度器 | `src/services/scheduler.ts` | 5秒轮询 + nextRunAt |
| B027 | 实现智能频率计算 | `src/services/scheduler.ts` | 段A/B/C 算法 |
| B028 | 实现指标存储 | `src/services/metrics.ts` | 写入 video_metrics/author_metrics |
| B029 | 实现指标查询 | `src/routes/metrics.ts` | 时间范围查询 |
| B030 | 实现账号失效处理 | `src/services/account.ts` | >5次失败暂停任务 |
| B031 | 实现任务恢复流程 | `src/services/account.ts` | 账号重登后恢复 |

**Phase 3 验收**:
- 任务创建后自动加入调度
- 数据正确采集并存储
- 账号失效时任务暂停

---

### Phase 4: 通知系统 (预计 5h)

按优先级顺序实现：

| Task ID | 描述 | 文件 | 验收指标 |
|---------|------|------|----------|
| B032 | 实现通知渠道接口 | `src/services/notify/channel.ts` | 统一 send/test 接口 |
| B033 | 实现 OneBot v11（go-cqhttp） | `src/services/notify/channels/onebot.ts` | 与 notify.py 一致 |
| B034 | 实现 Telegram | `src/services/notify/channels/telegram.ts` | 支持代理 |
| B035 | 实现 Bark | `src/services/notify/channels/bark.ts` | 支持所有参数 |
| B036 | 实现 PushDeer | `src/services/notify/channels/pushdeer.ts` | 支持自定义 URL |
| B037 | 实现企业微信 | `src/services/notify/channels/wecom.ts` | 应用消息 + 机器人 |
| B038 | 实现飞书 | `src/services/notify/channels/feishu.ts` | 机器人 Webhook |
| B039 | 实现钉钉 | `src/services/notify/channels/dingtalk.ts` | HMAC 签名 |
| B040 | 实现邮件（SMTP） | `src/services/notify/channels/email.ts` | SSL 支持 |
| B041 | 实现 Webhook | `src/services/notify/channels/webhook.ts` | 自定义请求 |
| B042 | 实现通知服务 | `src/services/notify/service.ts` | 规则匹配 + 多渠道 |
| B043 | 实现通知路由 | `src/routes/notifications.ts` | CRUD + test |

**Phase 4 验收**:
- 每个渠道可独立测试
- 规则匹配正确触发通知

---

### Phase 5: 系统完善 (预计 4h)

| Task ID | 描述 | 文件 | 验收指标 |
|---------|------|------|----------|
| B044 | 实现认证路由 | `src/routes/auth.ts` | login/logout/profile |
| B045 | 实现设置路由 | `src/routes/settings.ts` | 用户管理/系统设置 |
| B046 | 实现日志路由 | `src/routes/logs.ts` | 查询/下载 |
| B047 | 实现媒体缓存 | `src/services/media.ts` | 封面/头像本地缓存 |
| B048 | 实现初始化流程 | `src/init.ts` | 首次启动创建管理员 |
| B049 | 编写 Dockerfile | `backend/Dockerfile` | Bun + 多阶段构建 |
| B050 | 编写 docker-compose | `docker-compose.yml` | SQLite/PG 两种模式 |
| B051 | 编写 README | `backend/README.md` | 启动/配置说明 |

**Phase 5 验收**:
- 完整 API 实现对应 OpenAPI 契约
- Docker 部署成功
- Web UI 前端联调通过

---

## 通知渠道详细配置

基于 notify.py 实现，各渠道配置如下：

### 1. OneBot v11 (go-cqhttp)

```typescript
interface OneBotConfig {
  GOBOT_URL: string      // http://127.0.0.1:5700/send_private_msg 或 /send_group_msg
  GOBOT_QQ: string       // user_id=xxx 或 group_id=xxx
  GOBOT_TOKEN?: string   // access_token（可选）
}
```

### 2. Telegram

```typescript
interface TelegramConfig {
  TG_BOT_TOKEN: string
  TG_USER_ID: string
  TG_API_HOST?: string   // 代理 API
  TG_PROXY_HOST?: string
  TG_PROXY_PORT?: string
  TG_PROXY_AUTH?: string
}
```

### 3. Bark

```typescript
interface BarkConfig {
  BARK_PUSH: string      // 设备码或完整 URL
  BARK_ARCHIVE?: string
  BARK_GROUP?: string
  BARK_SOUND?: string
  BARK_ICON?: string
  BARK_LEVEL?: string
  BARK_URL?: string
}
```

### 4. PushDeer

```typescript
interface PushDeerConfig {
  DEER_KEY: string
  DEER_URL?: string      // 默认 https://api2.pushdeer.com/message/push
}
```

### 5. 企业微信

```typescript
// 应用消息模式
interface WeComAppConfig {
  QYWX_AM: string        // corpid,corpsecret,touser,agentid[,media_id]
  QYWX_ORIGIN?: string   // 代理地址
}

// 机器人模式
interface WeComBotConfig {
  QYWX_KEY: string       // Webhook key
  QYWX_ORIGIN?: string
}
```

### 6. 飞书

```typescript
interface FeishuConfig {
  FSKEY: string          // 机器人 Webhook hook/{FSKEY}
}
```

### 7. 钉钉

```typescript
interface DingTalkConfig {
  DD_BOT_TOKEN: string
  DD_BOT_SECRET: string  // HMAC 签名密钥
}
```

### 8. 邮件 (SMTP)

```typescript
interface EmailConfig {
  SMTP_SERVER: string    // smtp.example.com:465
  SMTP_SSL: 'true' | 'false'
  SMTP_EMAIL: string
  SMTP_PASSWORD: string
  SMTP_NAME: string
}
```

### 9. Webhook

```typescript
interface WebhookConfig {
  WEBHOOK_URL: string
  WEBHOOK_METHOD: 'GET' | 'POST'
  WEBHOOK_BODY?: string         // 包含 $title, $content 占位符
  WEBHOOK_HEADERS?: string
  WEBHOOK_CONTENT_TYPE?: string
}
```

---

## 成功指标

| 指标 | 目标 |
|------|------|
| API 响应时间 (p95) | < 200ms |
| 调度延迟 | < 10s |
| 并发任务数 | ≥ 100 |
| 通知发送成功率 | ≥ 95% |
| 内存占用 | < 256MB |
| Docker 镜像大小 | < 100MB |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| B站 API 变更 | 模块化 client，易于更新 |
| B站风控 | 单并发 + 1分钟最小间隔 |
| 数据库迁移 | Drizzle migration 管理 |
| Bun 兼容性 | 优先使用 Bun 原生 API |

