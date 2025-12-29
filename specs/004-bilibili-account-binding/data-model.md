# Data Model: B站账号绑定功能

**Feature**: 004-bilibili-account-binding  
**Date**: 2025-12-27  
**Based on**: spec.md Key Entities + research.md Schema Design

## 概览

本功能涉及两个主要数据实体：

1. **BilibiliAccount** - 已绑定的B站账号（复用现有accounts表）
2. **QRCodeSession** - 扫码登录会话（新增表）

以及相关联的系统实体：

3. **User** - 系统用户（已存在，用于关联绑定账号）

---

## 实体1: BilibiliAccount（已绑定的B站账号）

### 用途
存储用户绑定的B站账号信息和加密后的认证凭证，用于后续的视频/博主监控任务。

### 数据库Schema

**表名**: `accounts`（已存在，无需修改）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 账号ID（nanoid生成） |
| `uid` | TEXT | NOT NULL | B站用户ID（mid） |
| `nickname` | TEXT | | B站用户昵称（从nav接口获取） |
| `sessdata` | TEXT | NOT NULL | 加密后的SESSDATA Cookie |
| `bili_jct` | TEXT | | 加密后的bili_jct（可选） |
| `bind_method` | TEXT | NOT NULL | 绑定方式：'cookie' 或 'qrcode' |
| `status` | TEXT | NOT NULL, DEFAULT 'valid' | 账号状态：'valid' 或 'expired' |
| `last_failures` | INTEGER | DEFAULT 0 | 连续验证失败次数（>5标记为expired） |
| `bound_at` | INTEGER | NOT NULL | 绑定时间（timestamp） |
| `created_at` | INTEGER | NOT NULL | 创建时间（timestamp） |
| `updated_at` | INTEGER | NOT NULL | 更新时间（timestamp） |

### 字段说明

- **id**: 使用nanoid生成唯一标识符，用于关联监控任务
- **uid**: B站用户ID（mid），从nav接口的`data.mid`字段获取，用于检测重复绑定
- **nickname**: 用户昵称，从nav接口的`data.uname`字段获取，用于前端展示
- **sessdata**: 核心认证凭证，使用AES-256-GCM加密存储（格式：`iv:authTag:ciphertext`）
- **bili_jct**: CSRF token，部分B站API需要，加密存储
- **bind_method**: 区分绑定方式，影响前端展示和重新绑定流程
- **status**: 账号状态，用于过滤有效账号和触发重新绑定提示
- **last_failures**: 失败计数器，达到阈值（5次）后自动标记为expired
- **bound_at**: 绑定时间，用于前端显示和重复绑定提示
- **created_at / updated_at**: 审计字段，记录数据变更历史

### 状态转换

```
[新建绑定]
     ↓
  valid (status='valid', last_failures=0)
     ↓
  [验证失败] → last_failures++
     ↓
  [last_failures > 5]
     ↓
  expired (status='expired')
     ↓
  [用户重新绑定]
     ↓
  valid (重置last_failures=0)
```

### 验证规则

1. **唯一性**: 同一`uid`只能被一个用户绑定（通过业务逻辑检查，而非数据库约束）
2. **加密**: `sessdata`和`bili_jct`必须在插入前使用`encrypt()`函数加密
3. **有效期**: 定期（每24小时）调用`validateAccount()`验证凭证有效性
4. **重试策略**: 连续失败5次后标记为expired，避免频繁调用B站API

### 业务逻辑

#### 创建账号（Cookie绑定）
```typescript
// 1. 验证Cookie有效性
const navResponse = await biliClient.getNav(cookie)
if (navResponse.code !== 0 || !navResponse.data?.isLogin) {
  throw new Error('COOKIE_INVALID')
}

// 2. 检测重复绑定
const existing = await db.select().from(accounts).where(eq(accounts.uid, navResponse.data.mid))
if (existing.length > 0) {
  throw new Error('ACCOUNT_ALREADY_BOUND')
}

// 3. 加密存储
const encryptKey = getEncryptKey()
await db.insert(accounts).values({
  id: nanoid(),
  uid: navResponse.data.mid,
  nickname: navResponse.data.uname,
  sessdata: encrypt(sessdata, encryptKey),
  biliJct: biliJct ? encrypt(biliJct, encryptKey) : null,
  bindMethod: 'cookie',
  status: 'valid',
  lastFailures: 0,
  boundAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
})
```

#### 创建账号（扫码绑定）
```typescript
// 1. 轮询扫码状态直到confirmed
const pollResult = await biliClient.pollQrcode(qrcodeKey)
if (pollResult.status !== 'confirmed') {
  throw new Error('QRCODE_NOT_CONFIRMED')
}

// 2. 提取Cookie并验证
const { sessdata, biliJct } = pollResult.cookies
const navResponse = await biliClient.getNav(`SESSDATA=${sessdata}; bili_jct=${biliJct}`)

// 3. 后续步骤与Cookie绑定相同（检测重复 + 加密存储）
```

#### 验证账号有效性
```typescript
// 在账号服务中调用（backend/src/services/account.ts已实现）
async validateAccount(accountId: string): Promise<boolean> {
  const account = await db.select().from(accounts).where(eq(accounts.id, accountId))
  
  // 解密Cookie
  const encryptKey = getEncryptKey()
  const sessdata = decrypt(account.sessdata, encryptKey)
  const biliJct = account.biliJct ? decrypt(account.biliJct, encryptKey) : null
  const cookie = `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`
  
  // 调用nav接口验证
  const navResponse = await biliClient.getNav(cookie)
  
  if (navResponse.code === 0 && navResponse.data?.isLogin) {
    // 验证成功：重置失败计数
    await db.update(accounts).set({
      status: 'valid',
      lastFailures: 0,
      nickname: navResponse.data.uname,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId))
    return true
  } else {
    // 验证失败：增加失败计数
    const newFailures = (account.lastFailures || 0) + 1
    await db.update(accounts).set({
      lastFailures: newFailures,
      status: newFailures > 5 ? 'expired' : account.status,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId))
    return false
  }
}
```

---

## 实体2: QRCodeSession（扫码登录会话）

### 用途
管理扫码登录过程中的临时会话数据，支持前端轮询和状态追踪。

### 数据库Schema

**表名**: `qrcode_sessions`（新增）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 会话ID（nanoid生成） |
| `qrcode_key` | TEXT | NOT NULL, UNIQUE | B站返回的轮询密钥 |
| `qr_url` | TEXT | NOT NULL | 二维码URL（前端生成图片） |
| `user_id` | TEXT | NOT NULL, REFERENCES users(id) | 创建会话的系统用户ID |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | 扫码状态 |
| `created_at` | INTEGER | NOT NULL | 创建时间（timestamp） |
| `expire_at` | INTEGER | NOT NULL | 过期时间（创建时间 + 2分钟） |

### 字段说明

- **id**: 会话唯一标识符，用于前端追踪和后端清理
- **qrcode_key**: B站API返回的密钥，用于轮询接口查询状态
- **qr_url**: 二维码内容（URL字符串），前端使用库（如qrcode.react）转换为图片
- **user_id**: 关联创建会话的用户，防止会话泄漏和越权访问
- **status**: 当前扫码状态，驱动前端UI更新
- **created_at**: 会话创建时间，用于计算是否过期
- **expire_at**: 过期时间戳，轮询时检查是否已过期（2分钟固定）

### 状态枚举

| 状态值 | 说明 | B站API返回code | 前端UI提示 |
|--------|------|----------------|------------|
| `pending` | 待扫码 | 86101 | "请使用B站App扫码登录" |
| `scanned` | 已扫码（待确认） | 86090 | "等待确认..." |
| `confirmed` | 已确认（成功） | 0 | "绑定成功！"（随后关闭对话框） |
| `expired` | 二维码已过期 | 86038 | "二维码已过期，请重新获取" |

### 状态转换

```
[生成二维码]
     ↓
  pending
     ↓
  [用户扫码]
     ↓
  scanned
     ↓
  [用户确认] → confirmed → [创建BilibiliAccount] → [删除会话]
     ↓
  [2分钟超时]
     ↓
  expired
```

### 验证规则

1. **唯一性**: `qrcode_key`必须唯一（B站保证），使用UNIQUE约束
2. **过期检查**: 轮询时先检查`now() > expire_at`，是则直接返回expired状态
3. **用户隔离**: 轮询接口必须验证`user_id`与当前登录用户一致
4. **清理策略**: 定期（每小时）删除`expire_at < now() - 1小时`的记录（可选）

### 业务逻辑

#### 生成二维码
```typescript
// 1. 调用B站API生成二维码
const { qrcodeKey, qrUrl } = await biliClient.generateQrcode()

// 2. 存储会话
const sessionId = nanoid()
await db.insert(qrcodeSessions).values({
  id: sessionId,
  qrcodeKey: qrcodeKey,
  qrUrl: qrUrl,
  userId: currentUserId, // 从JWT token中提取
  status: 'pending',
  createdAt: new Date(),
  expireAt: new Date(Date.now() + 120000), // 2分钟后
})

// 3. 返回给前端
return { sessionId, qrcodeKey, qrUrl }
```

#### 轮询扫码状态
```typescript
// 1. 查询会话
const session = await db.select().from(qrcodeSessions)
  .where(and(
    eq(qrcodeSessions.qrcodeKey, qrcodeKey),
    eq(qrcodeSessions.userId, currentUserId) // 防止越权
  ))

if (!session) {
  throw new Error('SESSION_NOT_FOUND')
}

// 2. 检查是否过期
if (new Date() > session.expireAt) {
  await db.update(qrcodeSessions).set({ status: 'expired' })
    .where(eq(qrcodeSessions.id, session.id))
  return { status: 'expired' }
}

// 3. 调用B站API查询状态
const pollResult = await biliClient.pollQrcode(qrcodeKey)

// 4. 更新会话状态
await db.update(qrcodeSessions).set({ status: pollResult.status })
  .where(eq(qrcodeSessions.id, session.id))

// 5. 如果已确认，创建账号并删除会话
if (pollResult.status === 'confirmed') {
  const { sessdata, biliJct } = pollResult.cookies
  await createBilibiliAccount({ sessdata, biliJct, bindMethod: 'qrcode' })
  await db.delete(qrcodeSessions).where(eq(qrcodeSessions.id, session.id))
}

return { status: pollResult.status }
```

---

## 实体关系图

```
┌─────────────┐
│    User     │
│ (已存在)     │
└─────┬───────┘
      │ 1
      │
      │ *
┌─────┴───────────┐         ┌──────────────────┐
│ BilibiliAccount │         │ QRCodeSession    │
│  (accounts表)   │         │ (qrcode_sessions)│
└─────────────────┘         └──────────────────┘
      │                            │
      │ 1                          │ *
      │                            │
      │ *                          └─ user_id → User
┌─────┴───────────┐
│ MonitoringTask  │
│   (tasks表)     │
│  (已存在)       │
└─────────────────┘

说明：
- 一个User可以绑定多个BilibiliAccount
- 一个BilibiliAccount可以关联多个MonitoringTask
- 一个User可以创建多个QRCodeSession（但通常同时只有一个有效）
- QRCodeSession是临时数据，confirmed后会被删除
```

---

## 数据迁移

### Step 1: 生成迁移文件

```bash
cd backend
bun run db:generate
```

生成的迁移文件（drizzle/XXX_add_qrcode_sessions.sql）：

```sql
CREATE TABLE IF NOT EXISTS qrcode_sessions (
  id TEXT PRIMARY KEY,
  qrcode_key TEXT NOT NULL UNIQUE,
  qr_url TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  expire_at INTEGER NOT NULL
);

CREATE INDEX idx_qrcode_sessions_user_id ON qrcode_sessions(user_id);
CREATE INDEX idx_qrcode_sessions_expire_at ON qrcode_sessions(expire_at);
```

### Step 2: 应用迁移

```bash
bun run db:push
```

### Step 3: 验证

```bash
bun run db:studio
# 在Drizzle Studio中检查qrcode_sessions表是否创建成功
```

---

## 索引优化

### 必需索引

1. **accounts.uid** - 用于检测重复绑定（高频查询）
2. **qrcode_sessions.qrcode_key** - 用于轮询查询（UNIQUE约束自动创建索引）

### 可选索引

3. **qrcode_sessions.user_id** - 用于查询用户的所有扫码会话（未来功能）
4. **qrcode_sessions.expire_at** - 用于定期清理过期会话（批量删除优化）

### 创建索引SQL

```sql
-- 在backend/src/db/schema.ts中添加
import { index } from 'drizzle-orm/sqlite-core'

export const qrcodeSessions = sqliteTable('qrcode_sessions', {
  // ...字段定义
}, (table) => ({
  userIdIdx: index('idx_qrcode_sessions_user_id').on(table.userId),
  expireAtIdx: index('idx_qrcode_sessions_expire_at').on(table.expireAt),
}))
```

---

## 数据保留策略

### BilibiliAccount
- **保留**: 永久保留，除非用户主动解绑
- **清理**: 用户解绑时删除记录，关联的MonitoringTask需要先解除关联或删除

### QRCodeSession
- **保留**: 仅保留confirmed或expired状态的会话1小时（用于调试）
- **清理**: 定期任务（每小时执行一次）：
  ```sql
  DELETE FROM qrcode_sessions 
  WHERE expire_at < unixepoch('now', '-1 hour');
  ```
- **实现位置**: backend/src/services/scheduler.ts（已有定时任务基础设施）

---

## 总结

数据模型设计遵循以下原则：

1. **复用优先**: 使用现有accounts表，避免重复Schema
2. **职责分离**: 临时会话数据独立存储，便于清理和管理
3. **安全优先**: 敏感字段（sessdata, biliJct）加密存储
4. **状态驱动**: 明确的状态转换流程，便于前端UI同步
5. **可扩展性**: 预留索引和清理策略，支持未来功能扩展

