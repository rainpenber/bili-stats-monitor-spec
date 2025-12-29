# Quick Start: B站账号绑定功能开发

**Feature**: 004-bilibili-account-binding  
**Date**: 2025-12-27  
**Purpose**: 快速上手开发和测试B站账号绑定功能

## 📋 开发前准备

### 1. 环境要求

- ✅ Node.js >= 22.0.0
- ✅ Bun 最新稳定版
- ✅ pnpm 9.0.0
- ✅ Git

### 2. 安装依赖

```bash
# 在项目根目录
pnpm install

# 安装后端依赖
cd backend
bun install

# 安装前端依赖
cd ../frontend/web
pnpm install
```

### 3. 环境配置

确保已配置好开发环境变量（backend/.env.development）：

```bash
# 后端端口
PORT=38080

# 数据库
DB_TYPE=sqlite
SQLITE_PATH=./data/dev/bili-stats-dev.db

# JWT密钥（必需）
JWT_SECRET=your_jwt_secret_here_at_least_32_characters

# 加密密钥（必需，用于加密存储Cookie）
ENCRYPT_KEY=your_64_hex_characters_encrypt_key_here_32_bytes

# B站User Agent
BILI_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

**生成密钥**：
```bash
cd backend
bun run generate-secret       # 生成JWT密钥
bun run generate-encrypt-key  # 生成加密密钥
```

---

## 🚀 开发流程

### Phase 1: 后端数据库准备

#### Step 1: 创建新表Schema

编辑 `backend/src/db/schema.ts`，添加：

```typescript
// 新增：扫码会话表
export const qrcodeSessions = sqliteTable('qrcode_sessions', {
  id: text('id').primaryKey(),
  qrcodeKey: text('qrcode_key').notNull().unique(),
  qrUrl: text('qr_url').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status', { 
    enum: ['pending', 'scanned', 'confirmed', 'expired'] 
  }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expireAt: integer('expire_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('idx_qrcode_sessions_user_id').on(table.userId),
  expireAtIdx: index('idx_qrcode_sessions_expire_at').on(table.expireAt),
}))
```

#### Step 2: 生成并应用迁移

```bash
cd backend
bun run db:generate  # 生成迁移文件
bun run db:push      # 应用到数据库
```

#### Step 3: 验证表创建

```bash
bun run db:studio
# 在浏览器中打开Drizzle Studio，检查qrcode_sessions表
```

---

### Phase 2: 后端服务层开发

#### Step 1: 扩展BiliClient（扫码API）

编辑 `backend/src/services/bili/client.ts`，添加：

```typescript
/**
 * 轮询二维码扫码状态
 */
async pollQrcode(qrcodeKey: string): Promise<{
  status: 'pending' | 'scanned' | 'confirmed' | 'expired'
  cookies?: { sessdata: string; biliJct: string }
}> {
  const response = await fetch(
    `${this.passportUrl}/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`,
    { 
      headers: { 
        'User-Agent': this.userAgent 
      } 
    }
  )
  
  const json = await response.json()
  
  // 根据B站API返回的code判断状态
  if (json.code === 86101) return { status: 'pending' }
  if (json.code === 86090) return { status: 'scanned' }
  if (json.code === 86038) return { status: 'expired' }
  
  if (json.code === 0) {
    // 提取Cookie（从Set-Cookie header）
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

#### Step 2: 创建绑定服务

创建文件 `backend/src/services/bilibili/binding.ts`：

```typescript
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { accounts, qrcodeSessions } from '../../db/schema'
import { biliClient } from '../bili/client'
import { encrypt, decrypt, getEncryptKey } from '../../utils/crypto'
import type { DrizzleInstance } from '../../db'

export class BilibiliBindingService {
  constructor(private db: DrizzleInstance) {}
  
  /**
   * Cookie方式绑定
   */
  async bindByCookie(userId: string, cookieStr: string) {
    // 1. 解析Cookie字符串
    const sessdataMatch = cookieStr.match(/SESSDATA=([^;]+)/)
    const biliJctMatch = cookieStr.match(/bili_jct=([^;]+)/)
    
    if (!sessdataMatch) {
      throw new Error('INVALID_COOKIE_FORMAT')
    }
    
    const sessdata = sessdataMatch[1]
    const biliJct = biliJctMatch?.[1] || null
    
    // 2. 验证Cookie有效性
    const cookie = `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`
    const navResponse = await biliClient.getNav(cookie)
    
    if (navResponse.code !== 0 || !navResponse.data?.isLogin) {
      throw new Error('COOKIE_INVALID')
    }
    
    const uid = String(navResponse.data.mid)
    const nickname = navResponse.data.uname
    
    // 3. 检测重复绑定
    const existing = await this.db.select().from(accounts).where(eq(accounts.uid, uid))
    if (existing.length > 0) {
      throw new Error('ACCOUNT_ALREADY_BOUND')
    }
    
    // 4. 加密存储
    const encryptKey = getEncryptKey()
    const accountId = nanoid()
    
    await this.db.insert(accounts).values({
      id: accountId,
      uid,
      nickname,
      sessdata: encrypt(sessdata, encryptKey),
      biliJct: biliJct ? encrypt(biliJct, encryptKey) : null,
      bindMethod: 'cookie',
      status: 'valid',
      lastFailures: 0,
      boundAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    return {
      accountId,
      uid,
      nickname,
      bindMethod: 'cookie',
      boundAt: new Date(),
    }
  }
  
  /**
   * 生成二维码
   */
  async generateQRCode(userId: string) {
    const { qrcodeKey, qrUrl } = await biliClient.generateQrcode()
    
    const sessionId = nanoid()
    await this.db.insert(qrcodeSessions).values({
      id: sessionId,
      qrcodeKey: qrcodeKey,
      qrUrl: qrUrl,
      userId: userId,
      status: 'pending',
      createdAt: new Date(),
      expireAt: new Date(Date.now() + 120000), // 2分钟后
    })
    
    return { qrcodeKey, qrUrl, expireAt: new Date(Date.now() + 120000) }
  }
  
  /**
   * 轮询二维码状态
   */
  async pollQRCode(userId: string, qrcodeKey: string) {
    // 1. 查询会话
    const sessions = await this.db.select().from(qrcodeSessions)
      .where(and(
        eq(qrcodeSessions.qrcodeKey, qrcodeKey),
        eq(qrcodeSessions.userId, userId)
      ))
    
    if (sessions.length === 0) {
      throw new Error('SESSION_NOT_FOUND')
    }
    
    const session = sessions[0]
    
    // 2. 检查是否过期
    if (new Date() > session.expireAt) {
      await this.db.update(qrcodeSessions)
        .set({ status: 'expired' })
        .where(eq(qrcodeSessions.id, session.id))
      return { status: 'expired', message: '二维码已过期' }
    }
    
    // 3. 调用B站API查询状态
    const pollResult = await biliClient.pollQrcode(qrcodeKey)
    
    // 4. 更新会话状态
    await this.db.update(qrcodeSessions)
      .set({ status: pollResult.status })
      .where(eq(qrcodeSessions.id, session.id))
    
    // 5. 如果已确认，创建账号并删除会话
    if (pollResult.status === 'confirmed' && pollResult.cookies) {
      const { sessdata, biliJct } = pollResult.cookies
      const cookie = `SESSDATA=${sessdata}; bili_jct=${biliJct}`
      const navResponse = await biliClient.getNav(cookie)
      
      if (navResponse.code === 0 && navResponse.data?.isLogin) {
        const uid = String(navResponse.data.mid)
        const nickname = navResponse.data.uname
        
        // 检测重复绑定
        const existing = await this.db.select().from(accounts).where(eq(accounts.uid, uid))
        if (existing.length === 0) {
          const encryptKey = getEncryptKey()
          const accountId = nanoid()
          
          await this.db.insert(accounts).values({
            id: accountId,
            uid,
            nickname,
            sessdata: encrypt(sessdata, encryptKey),
            biliJct: biliJct ? encrypt(biliJct, encryptKey) : null,
            bindMethod: 'qrcode',
            status: 'valid',
            lastFailures: 0,
            boundAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          
          // 删除会话
          await this.db.delete(qrcodeSessions).where(eq(qrcodeSessions.id, session.id))
          
          return {
            status: 'confirmed',
            message: '绑定成功',
            account: {
              accountId,
              uid,
              nickname,
              bindMethod: 'qrcode',
              boundAt: new Date(),
            }
          }
        }
      }
    }
    
    return {
      status: pollResult.status,
      message: pollResult.status === 'pending' ? '待扫码' : 
               pollResult.status === 'scanned' ? '已扫码，等待确认' : '未知状态'
    }
  }
}
```

#### Step 3: 创建路由层

创建文件 `backend/src/routes/bilibili/binding.ts`：

```typescript
import { Hono } from 'hono'
import { BilibiliBindingService } from '../../services/bilibili/binding'
import type { ServiceContainer } from '../../services/container'

export function createBilibiliBindingRoutes(container: ServiceContainer) {
  const app = new Hono()
  const bindingService = new BilibiliBindingService(container.db)
  
  // POST /bind/cookie - Cookie绑定
  app.post('/bind/cookie', async (c) => {
    try {
      const userId = c.get('userId') // 从JWT middleware获取
      const body = await c.req.json()
      const { cookie } = body
      
      if (!cookie || typeof cookie !== 'string') {
        return c.json({
          code: 40001,
          message: 'INVALID_COOKIE_FORMAT',
          data: { detail: 'Cookie字段必须提供且为字符串' }
        }, 400)
      }
      
      const result = await bindingService.bindByCookie(userId, cookie)
      
      return c.json({
        code: 0,
        message: 'success',
        data: result
      })
    } catch (error: any) {
      const errorMap: Record<string, { code: number, status: number, detail: string }> = {
        'INVALID_COOKIE_FORMAT': { code: 40001, status: 400, detail: 'Cookie格式错误，请检查是否包含SESSDATA字段' },
        'COOKIE_INVALID': { code: 40002, status: 400, detail: 'Cookie验证失败，请确保从已登录的浏览器复制' },
        'ACCOUNT_ALREADY_BOUND': { code: 40004, status: 400, detail: '该B站账号已绑定' },
      }
      
      const errorInfo = errorMap[error.message] || { 
        code: 50000, 
        status: 500, 
        detail: '服务器错误' 
      }
      
      return c.json({
        code: errorInfo.code,
        message: error.message,
        data: { detail: errorInfo.detail }
      }, errorInfo.status)
    }
  })
  
  // POST /bind/qrcode/generate - 生成二维码
  app.post('/bind/qrcode/generate', async (c) => {
    try {
      const userId = c.get('userId')
      const result = await bindingService.generateQRCode(userId)
      
      return c.json({
        code: 0,
        message: 'success',
        data: result
      })
    } catch (error: any) {
      return c.json({
        code: 50001,
        message: 'BILI_API_ERROR',
        data: { detail: '无法生成二维码，请稍后重试' }
      }, 500)
    }
  })
  
  // GET /bind/qrcode/poll - 轮询扫码状态
  app.get('/bind/qrcode/poll', async (c) => {
    try {
      const userId = c.get('userId')
      const qrcodeKey = c.req.query('qrcode_key')
      
      if (!qrcodeKey) {
        return c.json({
          code: 40000,
          message: 'MISSING_PARAMETER',
          data: { detail: 'qrcode_key参数必须提供' }
        }, 400)
      }
      
      const result = await bindingService.pollQRCode(userId, qrcodeKey)
      
      return c.json({
        code: 0,
        message: 'success',
        data: result
      })
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') {
        return c.json({
          code: 40005,
          message: 'SESSION_NOT_FOUND',
          data: { detail: '二维码会话不存在或已被删除' }
        }, 400)
      }
      
      return c.json({
        code: 50000,
        message: 'SERVER_ERROR',
        data: { detail: '服务器错误' }
      }, 500)
    }
  })
  
  return app
}
```

#### Step 4: 注册路由

编辑 `backend/src/index.ts`，添加：

```typescript
import { createBilibiliBindingRoutes } from './routes/bilibili/binding'

// 在现有路由后添加
app.route('/api/v1/bilibili', createBilibiliBindingRoutes(container))
```

---

### Phase 3: 前端组件开发

#### Step 1: 创建类型定义

创建文件 `frontend/web/src/types/bilibili.ts`：

```typescript
export interface BilibiliAccount {
  accountId: string
  uid: string
  nickname: string
  bindMethod: 'cookie' | 'qrcode'
  boundAt: string
}

export interface QRCodeSession {
  qrcodeKey: string
  qrUrl: string
  expireAt: string
}

export type QRCodeStatus = 'pending' | 'scanned' | 'confirmed' | 'expired'
```

#### Step 2: 创建API服务

创建文件 `frontend/web/src/services/bilibili-api.ts`：

```typescript
import { apiClient } from './api-client' // 假设已有API客户端封装

export const bilibiliApi = {
  // Cookie绑定
  bindByCookie: async (cookie: string) => {
    return apiClient.post<{ account: BilibiliAccount }>('/bilibili/bind/cookie', { cookie })
  },
  
  // 生成二维码
  generateQRCode: async () => {
    return apiClient.post<QRCodeSession>('/bilibili/bind/qrcode/generate')
  },
  
  // 轮询扫码状态
  pollQRCode: async (qrcodeKey: string) => {
    return apiClient.get<{ status: QRCodeStatus, message: string, account?: BilibiliAccount }>(
      `/bilibili/bind/qrcode/poll?qrcode_key=${qrcodeKey}`
    )
  },
}
```

#### Step 3: 创建轮询Hook

创建文件 `frontend/web/src/hooks/useQRCodePolling.ts`：

```typescript
import { useState, useEffect, useRef } from 'react'
import { bilibiliApi } from '../services/bilibili-api'
import type { QRCodeStatus, BilibiliAccount } from '../types/bilibili'

export function useQRCodePolling(
  qrcodeKey: string | null,
  onConfirmed: (account: BilibiliAccount) => void,
  options = { interval: 2000, enabled: true }
) {
  const [status, setStatus] = useState<QRCodeStatus>('pending')
  const [message, setMessage] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!qrcodeKey || !options.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
      return
    }
    
    setIsPolling(true)
    
    const poll = async () => {
      try {
        const result = await bilibiliApi.pollQRCode(qrcodeKey)
        setStatus(result.status)
        setMessage(result.message)
        
        if (result.status === 'confirmed' && result.account) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setIsPolling(false)
          onConfirmed(result.account)
        }
        
        if (result.status === 'expired') {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setIsPolling(false)
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }
    
    poll() // 立即执行一次
    intervalRef.current = setInterval(poll, options.interval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [qrcodeKey, options.enabled, options.interval, onConfirmed])
  
  return { status, message, isPolling }
}
```

#### Step 4: 创建绑定组件

创建文件 `frontend/web/src/components/bilibili/AccountBindingModal.tsx`（参考现有Modal实现）

创建文件 `frontend/web/src/components/bilibili/CookieBindingTab.tsx`（使用React Hook Form + Zod验证）

创建文件 `frontend/web/src/components/bilibili/QRCodeBindingTab.tsx`（使用useQRCodePolling Hook）

---

## 🧪 测试流程

### 1. 单元测试（后端）

创建文件 `backend/tests/unit/services/bilibili/binding.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { BilibiliBindingService } from '../../../../src/services/bilibili/binding'
import { createTestDb } from '../../../helpers/test-db'

describe('BilibiliBindingService', () => {
  let service: BilibiliBindingService
  let db: any
  
  beforeEach(async () => {
    db = await createTestDb()
    service = new BilibiliBindingService(db)
  })
  
  it('should bind account by cookie', async () => {
    const result = await service.bindByCookie('user123', 'SESSDATA=valid_cookie')
    expect(result.uid).toBeDefined()
    expect(result.bindMethod).toBe('cookie')
  })
  
  it('should throw error for invalid cookie', async () => {
    await expect(
      service.bindByCookie('user123', 'invalid_cookie')
    ).rejects.toThrow('INVALID_COOKIE_FORMAT')
  })
})
```

运行测试：
```bash
cd backend
bun test tests/unit/services/bilibili/binding.test.ts
```

### 2. 集成测试（后端）

创建文件 `backend/tests/integration/bilibili/binding.test.ts`（测试完整API流程）

### 3. 组件测试（前端）

创建文件 `frontend/web/tests/components/bilibili/CookieBindingTab.test.tsx`：

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieBindingTab } from '../../../src/components/bilibili/CookieBindingTab'

describe('CookieBindingTab', () => {
  it('should render cookie input', () => {
    render(<CookieBindingTab />)
    expect(screen.getByLabelText(/cookie/i)).toBeInTheDocument()
  })
  
  it('should show error for invalid cookie format', async () => {
    render(<CookieBindingTab />)
    const input = screen.getByLabelText(/cookie/i)
    fireEvent.change(input, { target: { value: 'invalid' } })
    fireEvent.submit(screen.getByRole('form'))
    
    expect(await screen.findByText(/格式错误/i)).toBeInTheDocument()
  })
})
```

---

## 🐛 调试技巧

### 1. 查看B站API响应

在BiliClient中添加日志：
```typescript
console.log('B站API响应:', JSON.stringify(response, null, 2))
```

### 2. 检查加密/解密

```typescript
import { encrypt, decrypt, getEncryptKey } from './utils/crypto'

const key = getEncryptKey()
const plaintext = 'test_cookie'
const encrypted = encrypt(plaintext, key)
console.log('加密:', encrypted)
console.log('解密:', decrypt(encrypted, key))
```

### 3. 查看数据库内容

```bash
cd backend
bun run db:studio
# 浏览器打开，查看accounts和qrcode_sessions表
```

---

## 📚 相关文档

- [功能规范](./spec.md)
- [技术研究](./research.md)
- [数据模型](./data-model.md)
- [API合约](./contracts/bilibili-binding-api.yaml)
- [实现计划](./plan.md)

---

## 🎯 检查清单

开发完成后，确认以下项目：

- [ ] 数据库表`qrcode_sessions`已创建
- [ ] 后端路由`/api/v1/bilibili/bind/*`已注册
- [ ] Cookie验证功能正常（调用B站nav接口）
- [ ] 二维码生成和轮询功能正常
- [ ] 敏感数据（sessdata, biliJct）已加密存储
- [ ] 重复绑定检测生效
- [ ] 前端Modal组件正常显示和切换标签页
- [ ] 前端轮询Hook正确清理定时器
- [ ] 单元测试和集成测试通过
- [ ] API符合OpenAPI规范
- [ ] 错误提示友好且中文化

---

**下一步**: 完成开发后，运行 `/speckit.tasks` 生成详细的任务拆分清单。

