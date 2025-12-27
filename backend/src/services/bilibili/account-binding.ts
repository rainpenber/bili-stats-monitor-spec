import { db } from '../../db'
import { accounts, qrcodeSessions } from '../../db/schema'
import { biliClient } from '../bili/client'
import { encrypt, decrypt, getEncryptKey } from '../../utils/crypto'
import { eq, and, lt } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

/**
 * B站账号绑定服务
 */
export class AccountBindingService {
  private readonly encryptKey: string

  constructor() {
    this.encryptKey = getEncryptKey()
  }

  /**
   * 通过Cookie绑定账号
   */
  async bindByCookie(cookie: string, userId: string): Promise<{
    success: boolean
    account?: {
      id: string
      uid: string
      nickname: string
      bindMethod: 'cookie' | 'qrcode'
      boundAt: Date
      status: 'valid' | 'expired'
    }
    error?: string
  }> {
    try {
      // 1. 验证Cookie有效性
      const validation = await biliClient.validateCookie(cookie)
      if (!validation.valid || !validation.uid || !validation.nickname) {
        return { success: false, error: '无效的Cookie或Cookie已过期' }
      }

      // 2. 检查重复绑定
      const existing = await db
        .select()
        .from(accounts)
        .where(eq(accounts.uid, validation.uid))
        .get()

      if (existing) {
        return { success: false, error: '该账号已被绑定' }
      }

      // 3. 提取SESSDATA和bili_jct
      const sessdataMatch = cookie.match(/SESSDATA=([^;]+)/)
      const biliJctMatch = cookie.match(/bili_jct=([^;]+)/)

      if (!sessdataMatch) {
        return { success: false, error: 'Cookie格式错误：缺少SESSDATA' }
      }

      const sessdata = sessdataMatch[1]
      const biliJct = biliJctMatch?.[1]

      // 4. 加密敏感数据
      const encryptedSessdata = encrypt(sessdata, this.encryptKey)
      const encryptedBiliJct = biliJct ? encrypt(biliJct, this.encryptKey) : null

      // 5. 保存到数据库
      const accountId = uuidv4()
      const now = new Date()

      await db.insert(accounts).values({
        id: accountId,
        uid: validation.uid,
        nickname: validation.nickname,
        sessdata: encryptedSessdata,
        biliJct: encryptedBiliJct,
        bindMethod: 'cookie',
        status: 'valid',
        lastFailures: 0,
        boundAt: now,
        createdAt: now,
        updatedAt: now,
      })

      return {
        success: true,
        account: {
          id: accountId,
          uid: validation.uid,
          nickname: validation.nickname,
          bindMethod: 'cookie',
          boundAt: now,
          status: 'valid',
        },
      }
    } catch (error) {
      console.error('Failed to bind account by cookie:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '绑定失败',
      }
    }
  }

  /**
   * 生成二维码
   */
  async generateQRCode(userId: string): Promise<{
    success: boolean
    session?: {
      qrcodeKey: string
      qrUrl: string
      expireAt: Date
    }
    error?: string
  }> {
    try {
      // 1. 调用B站API生成二维码
      const qrData = await biliClient.generateQrCode()

      // 2. 保存到数据库
      const sessionId = uuidv4()
      const expireAt = new Date(qrData.expireAt)

      await db.insert(qrcodeSessions).values({
        id: sessionId,
        qrcodeKey: qrData.qrcodeKey,
        qrUrl: qrData.qrUrl,
        userId,
        status: 'pending',
        createdAt: new Date(),
        expireAt,
      })

      return {
        success: true,
        session: {
          qrcodeKey: qrData.qrcodeKey,
          qrUrl: qrData.qrUrl,
          expireAt,
        },
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成二维码失败',
      }
    }
  }

  /**
   * 轮询二维码状态
   */
  async pollQRCode(qrcodeKey: string, userId: string): Promise<{
    status: 'pending' | 'scanned' | 'confirmed' | 'expired'
    message: string
    account?: {
      id: string
      uid: string
      nickname: string
      bindMethod: 'cookie' | 'qrcode'
      boundAt: Date
      status: 'valid' | 'expired'
    }
  }> {
    try {
      // 1. 查询会话
      const session = await db
        .select()
        .from(qrcodeSessions)
        .where(
          and(
            eq(qrcodeSessions.qrcodeKey, qrcodeKey),
            eq(qrcodeSessions.userId, userId)
          )
        )
        .get()

      if (!session) {
        return { status: 'expired', message: '二维码会话不存在或已过期' }
      }

      // 2. 检查是否过期
      if (new Date() > session.expireAt) {
        await db
          .update(qrcodeSessions)
          .set({ status: 'expired' })
          .where(eq(qrcodeSessions.id, session.id))
        return { status: 'expired', message: '二维码已过期' }
      }

      // 3. 轮询B站API
      const pollResult = await biliClient.pollQrcode(qrcodeKey)

      // 4. 更新会话状态
      if (pollResult.status !== session.status) {
        await db
          .update(qrcodeSessions)
          .set({ status: pollResult.status })
          .where(eq(qrcodeSessions.id, session.id))
      }

      // 5. 如果确认登录，绑定账号
      if (pollResult.status === 'confirmed' && pollResult.cookie) {
        const bindResult = await this.bindByCookie(pollResult.cookie, userId)

        if (bindResult.success && bindResult.account) {
          return {
            status: 'confirmed',
            message: '绑定成功',
            account: bindResult.account,
          }
        } else {
          return {
            status: 'expired',
            message: bindResult.error || '绑定失败',
          }
        }
      }

      // 6. 返回当前状态
      const statusMessages: Record<typeof pollResult.status, string> = {
        pending: '等待扫码',
        scanned: '已扫码，等待确认',
        confirmed: '已确认',
        expired: '二维码已过期',
      }

      return {
        status: pollResult.status,
        message: statusMessages[pollResult.status],
      }
    } catch (error) {
      console.error('Failed to poll QR code:', error)
      return {
        status: 'expired',
        message: error instanceof Error ? error.message : '轮询失败',
      }
    }
  }

  /**
   * 验证账号凭证（用于定期检查）
   */
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .get()

      if (!account) return false

      // 解密SESSDATA
      const sessdata = decrypt(account.sessdata, this.encryptKey)
      const biliJct = account.biliJct ? decrypt(account.biliJct, this.encryptKey) : undefined
      const cookie = `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`

      // 验证Cookie
      const validation = await biliClient.validateCookie(cookie)

      if (!validation.valid) {
        // 标记为过期
        await db
          .update(accounts)
          .set({
            status: 'expired',
            lastFailures: account.lastFailures + 1,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, accountId))
        return false
      }

      // 重置失败计数
      if (account.lastFailures > 0 || account.status !== 'valid') {
        await db
          .update(accounts)
          .set({
            status: 'valid',
            lastFailures: 0,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, accountId))
      }

      return true
    } catch (error) {
      console.error('Failed to validate account:', error)
      return false
    }
  }

  /**
   * 获取账号列表
   */
  async listAccounts(): Promise<
    Array<{
      id: string
      uid: string
      nickname: string | null
      bindMethod: 'cookie' | 'qrcode'
      boundAt: Date
      status: 'valid' | 'expired'
    }>
  > {
    const accountList = await db.select().from(accounts).all()
    return accountList
  }

  /**
   * 解绑账号
   */
  async unbindAccount(accountId: string): Promise<boolean> {
    try {
      await db.delete(accounts).where(eq(accounts.id, accountId))
      return true
    } catch (error) {
      console.error('Failed to unbind account:', error)
      return false
    }
  }

  /**
   * 清理过期的二维码会话（定期任务调用）
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db
        .delete(qrcodeSessions)
        .where(lt(qrcodeSessions.expireAt, new Date()))
      return result.changes
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
      return 0
    }
  }
}

// 导出单例
export const accountBindingService = new AccountBindingService()

