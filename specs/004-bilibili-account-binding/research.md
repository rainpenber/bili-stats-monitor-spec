# Research: B站账号绑定技术调研

**Feature**: 004-bilibili-account-binding  
**Date**: 2025-12-27  
**Purpose**: 解决Technical Context中的技术选型和最佳实践问题

## 调研任务概览

本文档解决以下技术问题：

1. B站Cookie验证机制和API调用方式
2. B站扫码登录API的使用流程
3. 前端轮询最佳实践（React Hooks）
4. 敏感数据加密存储方案
5. 数据库Schema设计（已有accounts表的调整需求）

---

## 1. B站Cookie验证机制

### Decision: 使用 `/x/web-interface/nav` 接口验证Cookie有效性

### Rationale

- **已有实现参考**: 项目中`backend/src/services/account.ts`的`validateAccount`方法已实现了该验证逻辑
- **验证可靠性**: nav接口返回`isLogin`字段可直接判断Cookie是否有效
- **额外收益**: 同时可获取用户昵称（uname）和WBI签名密钥，一举两得
- **错误处理**: 支持失败重试机制（已有lastFailures字段计数）

### Implementation Pattern

```typescript
// 已有代码：backend/src/services/bili/client.ts
async getNav(cookie?: string): Promise<any> {
  const headers: Record<string, string> = {}
  if (cookie) {
    headers['Cookie'] = cookie
  }
  
  const response = await this.request(this.baseUrl + '/x/web-interface/nav', {
    headers,
  })
  
  // 提取 WBI keys（自动刷新）
  const keys = wbiService.extractKeysFromNav(response)
  if (keys) {
    wbiService.refreshKeys(keys.imgKey, keys.subKey)
  }
  
  return response
}

// 验证逻辑
if (navResponse.code === 0 && navResponse.data?.isLogin) {
  // Cookie有效
  const nickname = navResponse.data.uname
  const uid = navResponse.data.mid
} else {
  // Cookie无效或过期
}
```

### Alternatives Considered

- **方案A**: 调用`/x/space/myinfo`接口获取个人信息
  - **拒绝原因**: 需要额外的API调用，且不提供WBI密钥，不如nav接口高效
  
- **方案B**: 直接尝试调用需要认证的业务API（如视频统计）
  - **拒绝原因**: 业务API可能因为其他原因失败（如视频不存在），无法准确判断Cookie有效性

### Dependencies

- `backend/src/services/bili/client.ts` - BiliClient类（已存在）
- `backend/src/services/bili/wbi.ts` - WbiService类（已存在）
- Cookie格式：`SESSDATA=${sessdata}; bili_jct=${biliJct}`

---

## 2. B站扫码登录API流程

### Decision: 使用B站Web端扫码登录API（两步流程）

### Rationale

- **已有实现**: `backend/src/services/bili/client.ts`中已有`generateQrcode`方法
- **标准流程**: 符合B站官方Web端扫码登录流程，稳定可靠
- **轮询友好**: 返回qrcodeKey可用于状态轮询，无需WebSocket连接

### API Flow

#### Step 1: 生成二维码

**接口**: `GET https://passport.bilibili.com/x/passport-login/web/qrcode/generate`

**Response**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://passport.bilibili.com/h5-app/passport/qrcode?...",
    "qrcode_key": "8f8a1234567890abcdef"
  }
}
```

- `url`: 二维码内容，前端转换为图片显示
- `qrcode_key`: 轮询密钥，用于后续状态查询

#### Step 2: 轮询扫码状态

**接口**: `GET https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={key}`

**Response** (状态码说明):
```json
// 未扫码（待扫描）
{ "code": 86101, "message": "未扫码" }

// 已扫码（待确认）
{ "code": 86090, "message": "已扫码" }

// 已确认（成功）
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://...",  // 带Cookie的跳转URL
    "refresh_token": "...",
    "timestamp": 1234567890
  }
}

// 二维码已过期
{ "code": 86038, "message": "二维码已过期" }
```

**Cookie提取**: 成功时需要从Response Headers中提取`Set-Cookie`字段，获取SESSDATA和bili_jct

### Implementation Pattern

```typescript
// 已有代码：backend/src/services/bili/client.ts (需扩展)
async generateQrcode(): Promise<{ qrcodeKey: string; qrUrl: string; expireAt: Date }> {
  const response = await this.request(this.passportUrl + '/x/passport-login/web/qrcode/generate')
  
  if (response.code !== 0) {
    throw new Error(`Failed to generate QR code: ${response.message}`)
  }
  
  return {
    qrcodeKey: response.data.qrcode_key,
    qrUrl: response.data.url,
    expireAt: new Date(Date.now() + 120000), // 2分钟后过期
  }
}

// 新增方法：轮询扫码状态
async pollQrcode(qrcodeKey: string): Promise<{
  status: 'pending' | 'scanned' | 'confirmed' | 'expired'
  cookies?: { sessdata: string; biliJct: string }
}> {
  const response = await fetch(
    `${this.passportUrl}/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`,
    { headers: { 'User-Agent': this.userAgent } }
  )
  
  const json = await response.json()
  
  // 根据code判断状态
  if (json.code === 86101) return { status: 'pending' }
  if (json.code === 86090) return { status: 'scanned' }
  if (json.code === 86038) return { status: 'expired' }
  
  if (json.code === 0) {
    // 提取Cookie
    const setCookie = response.headers.get('set-cookie') || ''
    const sessdata = setCookie.match(/SESSDATA=([^;]+)/)?.[1]
    const biliJct = setCookie.match(/bili_jct=([^;]+)/)?.[1]
    
    if (!sessdata) {
      throw new Error('Failed to extract SESSDATA from response')
    }
    
    return {
      status: 'confirmed',
      cookies: { sessdata, biliJct: biliJct || '' }
    }
  }
  
  throw new Error(`Unexpected QR code status: ${json.message}`)
}
```

### Alternatives Considered

- **方案A**: 使用OAuth2.0完整流程
  - **拒绝原因**: 过于复杂，B站未公开OAuth2.0接口，且不符合现有Web端登录体验
  
- **方案B**: 使用短信验证码登录
  - **拒绝原因**: 需要用户输入手机号，隐私风险高，且B站未提供公开API

### Constraints

- **二维码有效期**: 固定2分钟（120秒）
- **轮询间隔**: 建议2秒，避免B站API限流（429错误）
- **超时处理**: 超过2分钟未确认需要重新生成二维码

---

## 3. 前端轮询最佳实践

### Decision: 使用React Custom Hook封装轮询逻辑，结合useEffect清理机制

### Rationale

- **组件复用**: Hook可在多个组件中复用轮询逻辑
- **生命周期管理**: useEffect自动处理组件卸载时清理定时器
- **状态管理**: 使用useState管理轮询状态，避免内存泄漏
- **类型安全**: TypeScript保证状态类型正确

### Implementation Pattern

```typescript
// frontend/web/src/hooks/useQRCodePolling.ts
import { useState, useEffect, useRef } from 'react'

interface QRCodeStatus {
  status: 'pending' | 'scanned' | 'confirmed' | 'expired'
  message?: string
}

export function useQRCodePolling(
  qrcodeKey: string | null,
  onConfirmed: (data: any) => void,
  options = { interval: 2000, enabled: true }
) {
  const [qrStatus, setQrStatus] = useState<QRCodeStatus>({ status: 'pending' })
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // 如果没有qrcodeKey或禁用轮询，清理定时器
    if (!qrcodeKey || !options.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
      return
    }
    
    // 开始轮询
    setIsPolling(true)
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/bilibili/bind/qrcode/poll?qrcode_key=${qrcodeKey}`)
        const data = await response.json()
        
        setQrStatus({ status: data.status, message: data.message })
        
        // 如果已确认，停止轮询并回调
        if (data.status === 'confirmed') {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setIsPolling(false)
          onConfirmed(data)
        }
        
        // 如果已过期，停止轮询
        if (data.status === 'expired') {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setIsPolling(false)
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }
    
    // 立即执行一次
    poll()
    
    // 设置定时轮询
    intervalRef.current = setInterval(poll, options.interval)
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [qrcodeKey, options.enabled, options.interval, onConfirmed])
  
  return { qrStatus, isPolling }
}
```

### Usage Example

```typescript
// frontend/web/src/components/bilibili/QRCodeBindingTab.tsx
function QRCodeBindingTab() {
  const [qrcodeKey, setQrcodeKey] = useState<string | null>(null)
  
  const { qrStatus, isPolling } = useQRCodePolling(
    qrcodeKey,
    (data) => {
      toast.success('绑定成功！')
      onClose() // 关闭对话框
    },
    { interval: 2000, enabled: !!qrcodeKey }
  )
  
  return (
    <div>
      {qrStatus.status === 'pending' && <p>请使用B站App扫码登录</p>}
      {qrStatus.status === 'scanned' && <p>等待确认...</p>}
      {qrStatus.status === 'expired' && <button>重新获取二维码</button>}
    </div>
  )
}
```

### Alternatives Considered

- **方案A**: 使用setInterval直接在组件中轮询
  - **拒绝原因**: 难以管理清理逻辑，容易造成内存泄漏
  
- **方案B**: 使用WebSocket实时推送
  - **拒绝原因**: B站不提供WebSocket接口，且增加服务器复杂度

### Best Practices

1. **清理定时器**: 必须在useEffect的返回函数中清理setInterval
2. **避免闭包陷阱**: 使用useRef存储interval ID，避免闭包捕获旧值
3. **条件轮询**: 通过enabled参数控制轮询启停（如切换标签页时停止）
4. **错误处理**: catch轮询错误，避免影响用户体验

---

## 4. 敏感数据加密存储方案

### Decision: 使用AES-256-GCM对Cookie和OAuth token进行加密存储

### Rationale

- **已有实现**: `backend/src/utils/crypto.ts`已实现AES-256-GCM加密工具
- **安全性强**: GCM模式提供认证加密（AEAD），防止篡改
- **密钥管理**: 使用环境变量`ENCRYPT_KEY`（64位hex字符串，32字节）
- **兼容Bun**: 使用Node.js crypto模块，Bun完全兼容

### Encryption Flow

1. **加密**: `encrypt(plaintext, ENCRYPT_KEY)` → `iv:authTag:ciphertext`（hex编码）
2. **存储**: 将加密后的字符串存储到数据库的`sessdata`和`biliJct`字段
3. **解密**: `decrypt(ciphertext, ENCRYPT_KEY)` → 原始Cookie值

### Implementation Pattern

```typescript
// 已有代码：backend/src/utils/crypto.ts
import { encrypt, decrypt, getEncryptKey } from '../utils/crypto'

// 绑定账号时加密存储
const encryptKey = getEncryptKey()
const encryptedSessdata = encrypt(sessdata, encryptKey)
const encryptedBiliJct = biliJct ? encrypt(biliJct, encryptKey) : null

await db.insert(accounts).values({
  id: nanoid(),
  uid: userInfo.mid,
  nickname: userInfo.uname,
  sessdata: encryptedSessdata,  // 加密存储
  biliJct: encryptedBiliJct,    // 加密存储
  bindMethod: 'cookie',
  status: 'valid',
  boundAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
})

// 使用账号时解密
const account = await db.select().from(accounts).where(eq(accounts.id, accountId))
const sessdata = decrypt(account.sessdata, encryptKey)
const biliJct = account.biliJct ? decrypt(account.biliJct, encryptKey) : null
const cookie = `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`
```

### Alternatives Considered

- **方案A**: 使用对称加密（AES-256-CBC）
  - **拒绝原因**: CBC模式不提供认证，容易受到Padding Oracle攻击
  
- **方案B**: 明文存储并依赖数据库加密
  - **拒绝原因**: SQLite默认不加密，PostgreSQL需要额外配置透明数据加密（TDE）

### Security Considerations

- **密钥轮换**: 如需更换ENCRYPT_KEY，必须先解密所有数据再重新加密
- **环境隔离**: 开发和生产环境必须使用不同的ENCRYPT_KEY
- **密钥强度**: 必须使用`generateEncryptKey()`生成随机密钥，禁止使用弱密钥

---

## 5. 数据库Schema设计

### Decision: 复用现有`accounts`表，新增`qrcode_sessions`表用于扫码会话管理

### Rationale

- **复用优先**: 现有accounts表已包含所需字段（uid, nickname, sessdata, biliJct, bindMethod, status等）
- **会话隔离**: 扫码会话是临时性数据，不应与持久化账号数据混合
- **清理友好**: qrcode_sessions表可定期清理过期记录（> 2分钟）

### Existing Schema (无需修改)

```typescript
// backend/src/db/schema.ts
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  nickname: text('nickname'),
  sessdata: text('sessdata').notNull(), // 已支持加密存储
  biliJct: text('bili_jct'),
  bindMethod: text('bind_method', { enum: ['cookie', 'qrcode'] }).notNull(),
  status: text('status', { enum: ['valid', 'expired'] }).notNull().default('valid'),
  lastFailures: integer('last_failures').default(0),
  boundAt: integer('bound_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
```

### New Schema (需要添加)

```typescript
// backend/src/db/schema.ts (新增)
export const qrcodeSessions = sqliteTable('qrcode_sessions', {
  id: text('id').primaryKey(), // nanoid
  qrcodeKey: text('qrcode_key').notNull().unique(), // B站返回的qrcode_key
  qrUrl: text('qr_url').notNull(), // 二维码URL
  userId: text('user_id').notNull().references(() => users.id), // 创建会话的用户ID
  status: text('status', { 
    enum: ['pending', 'scanned', 'confirmed', 'expired'] 
  }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expireAt: integer('expire_at', { mode: 'timestamp' }).notNull(), // 过期时间（创建时间 + 2分钟）
})
```

### Migration Strategy

1. 运行`drizzle-kit generate:sqlite`生成迁移文件
2. 运行`drizzle-kit push:sqlite`应用到数据库
3. 实现定期清理任务（可选）：删除`expireAt < now()`的记录

### Alternatives Considered

- **方案A**: 将扫码会话存储在内存（Map或Redis）
  - **拒绝原因**: 增加部署复杂度，且会话数据量小，数据库足够高效
  
- **方案B**: 在accounts表中新增qrcode_key字段
  - **拒绝原因**: accounts表是持久化账号数据，不应包含临时会话信息

### Indexing Recommendations

- `qrcodeKey`: 已通过`.unique()`创建唯一索引，支持快速轮询查询
- `userId`: 可创建索引以支持"查看我的扫码会话"功能（未来扩展）

---

## 6. 前端表单验证（Zod Schema）

### Decision: 使用React Hook Form + Zod进行Cookie输入验证

### Rationale

- **已有依赖**: 项目已使用react-hook-form 7.68和zod 4.2
- **类型安全**: Zod schema自动生成TypeScript类型
- **即时反馈**: 前端验证提供即时错误提示，减少后端请求

### Cookie Validation Schema

```typescript
// frontend/web/src/lib/validations/bilibiliSchemas.ts
import { z } from 'zod'

export const cookieBindingSchema = z.object({
  cookie: z.string()
    .min(100, 'Cookie长度不足，请确保包含完整的SESSDATA字段')
    .refine(
      (val) => val.includes('SESSDATA='),
      'Cookie格式错误，必须包含SESSDATA字段'
    )
    .refine(
      (val) => {
        // 验证SESSDATA不为空
        const match = val.match(/SESSDATA=([^;]+)/)
        return match && match[1].length > 0
      },
      'SESSDATA字段不能为空'
    )
})

export type CookieBindingInput = z.infer<typeof cookieBindingSchema>
```

### Form Integration

```typescript
// frontend/web/src/components/bilibili/CookieBindingTab.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cookieBindingSchema } from '@/lib/validations/bilibiliSchemas'

function CookieBindingTab() {
  const form = useForm({
    resolver: zodResolver(cookieBindingSchema),
    defaultValues: { cookie: '' }
  })
  
  const onSubmit = async (data: CookieBindingInput) => {
    // 调用后端API
    await bindByCookie(data.cookie)
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <textarea {...form.register('cookie')} />
      {form.formState.errors.cookie && (
        <p className="text-red-500">{form.formState.errors.cookie.message}</p>
      )}
      <button type="submit">保存</button>
    </form>
  )
}
```

---

## 7. 错误处理策略

### Decision: 使用统一的错误码和多语言错误消息

### Error Code Design

| 错误码 | 场景 | 前端提示 |
|--------|------|---------|
| `INVALID_COOKIE_FORMAT` | Cookie格式错误 | "Cookie格式错误，请检查是否包含SESSDATA字段" |
| `COOKIE_EXPIRED` | Cookie已过期 | "Cookie已过期，请重新获取" |
| `COOKIE_INVALID` | Cookie无效（B站验证失败） | "Cookie验证失败，请确保从已登录的浏览器复制" |
| `ACCOUNT_ALREADY_BOUND` | 账号已被绑定 | "该B站账号已绑定，绑定时间：{boundAt}" |
| `QRCODE_EXPIRED` | 二维码已过期 | "二维码已过期，请点击"重新获取二维码"" |
| `QRCODE_CANCELLED` | 用户取消扫码授权 | "您已取消授权，请重新扫码" |
| `BILI_API_ERROR` | B站API调用失败 | "B站服务暂时不可用，请稍后重试" |

### Backend Error Response Format

```typescript
// 统一错误响应格式
{
  "code": 40001,
  "message": "INVALID_COOKIE_FORMAT",
  "data": {
    "detail": "Cookie格式错误，请检查是否包含SESSDATA字段",
    "field": "cookie"
  }
}
```

---

## 总结

所有技术调研已完成，主要决策如下：

1. **Cookie验证**: 使用`/x/web-interface/nav`接口，已有实现可复用
2. **扫码登录**: 两步API流程（生成二维码 + 轮询状态），需扩展BiliClient
3. **前端轮询**: 使用React Custom Hook封装，useEffect管理清理
4. **数据加密**: 复用已有AES-256-GCM工具（backend/src/utils/crypto.ts）
5. **数据库**: 复用accounts表，新增qrcode_sessions表管理扫码会话
6. **表单验证**: React Hook Form + Zod，已有依赖可直接使用
7. **错误处理**: 统一错误码设计，友好的中文提示

所有方案均符合Constitution原则（前端优先、API合约先行、Bun运行时、分层架构），无技术债务引入。

