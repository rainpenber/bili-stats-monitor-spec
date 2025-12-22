import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { getEncryptKey, encrypt, decrypt } from '../utils/crypto'
import { biliClient } from './bili/client'
import { wbiService } from './bili/wbi'
import { accounts } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * 从 Cookie 字符串提取 SESSDATA 和 bili_jct
 */
export function extractFromCookie(cookie: string): {
  sessdata?: string
  biliJct?: string
} {
  const sessdataMatch = cookie.match(/SESSDATA=([^;]+)/)
  const biliJctMatch = cookie.match(/bili_jct=([^;]+)/)
  return {
    sessdata: sessdataMatch?.[1],
    biliJct: biliJctMatch?.[1],
  }
}

/**
 * 账号服务
 */
export class AccountService {
  constructor(private db: DrizzleInstance) {}

  /**
   * 通过 Cookie 绑定账号
   */
  async bindByCookie(cookie: string): Promise<string> {
    const { sessdata, biliJct } = extractFromCookie(cookie)

    if (!sessdata || !biliJct) {
      throw new Error('Invalid cookie: missing SESSDATA or bili_jct')
    }

    // 验证凭据有效性
    const navResponse = await biliClient.getNav(cookie)
    if (navResponse.code !== 0 || !navResponse.data?.isLogin) {
      throw new Error('Invalid cookie: login verification failed')
    }

    // 获取 UID
    const uid = navResponse.data.mid?.toString()
    if (!uid) {
      throw new Error('Failed to get UID from nav response')
    }

    // 加密存储
    const encryptKey = getEncryptKey()
    const encryptedSessdata = encrypt(sessdata, encryptKey)
    const encryptedBiliJct = biliJct ? encrypt(biliJct, encryptKey) : null

    // 检查是否已存在该 UID 的账号
    const existing = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.uid, uid))
      .limit(1)

    if (existing.length > 0) {
      // 更新现有账号
      const accountId = existing[0].id
      await this.db
        .update(accounts)
        .set({
          sessdata: encryptedSessdata,
          biliJct: encryptedBiliJct,
          status: 'valid',
          lastFailures: 0,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId))

      return accountId
    } else {
      // 创建新账号
      const accountId = nanoid()
      await this.db.insert(accounts).values({
        id: accountId,
        uid,
        nickname: navResponse.data.uname || null,
        sessdata: encryptedSessdata,
        biliJct: encryptedBiliJct,
        bindMethod: 'cookie',
        status: 'valid',
        lastFailures: 0,
        boundAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return accountId
    }
  }

  /**
   * 验证账号有效性
   * @param accountId 账号 ID
   * @returns true 如果账号有效，false 如果无效
   */
  async validateAccount(accountId: string): Promise<boolean> {
    const accountList = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)

    if (accountList.length === 0) {
      return false
    }

    const account = accountList[0]

    // 解密 Cookie
    const encryptKey = getEncryptKey()
    let sessdata: string
    let biliJct: string | null = null

    try {
      sessdata = decrypt(account.sessdata, encryptKey)
      if (account.biliJct) {
        biliJct = decrypt(account.biliJct, encryptKey)
      }
    } catch (error) {
      // 解密失败，账号无效
      await this.db
        .update(accounts)
        .set({
          status: 'expired',
          lastFailures: (account.lastFailures || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId))
      return false
    }

    // 构建 Cookie 字符串
    const cookie = `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`

    try {
      // 调用 nav 接口验证
      const navResponse = await biliClient.getNav(cookie)

      if (navResponse.code === 0 && navResponse.data?.isLogin) {
        // 成功：刷新 WBI keys，重置失败计数
        // wbiService 已经在 biliClient.getNav 中自动刷新了 keys

        await this.db
          .update(accounts)
          .set({
            status: 'valid',
            lastFailures: 0,
            nickname: navResponse.data.uname || account.nickname,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, accountId))

        return true
      } else {
        // 失败：增加失败计数
        const newFailures = (account.lastFailures || 0) + 1
        await this.db
          .update(accounts)
          .set({
            lastFailures: newFailures,
            status: newFailures > 5 ? 'expired' : account.status,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, accountId))

        return false
      }
    } catch (error) {
      // 请求失败：增加失败计数
      const newFailures = (account.lastFailures || 0) + 1
      await this.db
        .update(accounts)
        .set({
          lastFailures: newFailures,
          status: newFailures > 5 ? 'expired' : account.status,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId))

      return false
    }
  }

  /**
   * 获取账号的 Cookie 字符串
   */
  async getCookie(accountId: string): Promise<string | null> {
    const accountList = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)

    if (accountList.length === 0) {
      return null
    }

    const account = accountList[0]

    // 解密
    const encryptKey = getEncryptKey()
    try {
      const sessdata = decrypt(account.sessdata, encryptKey)
      const biliJct = account.biliJct ? decrypt(account.biliJct, encryptKey) : null

      return `SESSDATA=${sessdata}${biliJct ? `; bili_jct=${biliJct}` : ''}`
    } catch (error) {
      return null
    }
  }

  /**
   * 获取账号列表（不包含敏感信息）
   */
  async listAccounts() {
    const accountList = await this.db.select().from(accounts).orderBy(accounts.createdAt)

    // 不返回敏感信息（sessdata, biliJct）
    return accountList.map((acc) => ({
      id: acc.id,
      uid: acc.uid,
      nickname: acc.nickname,
      bindMethod: acc.bindMethod,
      status: acc.status,
      lastFailures: acc.lastFailures,
      boundAt: acc.boundAt,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    }))
  }

  /**
   * 删除账号
   */
  async deleteAccount(accountId: string): Promise<void> {
    await this.db.delete(accounts).where(eq(accounts.id, accountId))
  }

  /**
   * 获取默认账号（第一个有效的账号）
   */
  async getDefaultAccount() {
    const accountList = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.status, 'valid'))
      .orderBy(accounts.createdAt)
      .limit(1)

    if (accountList.length === 0) {
      return null
    }

    const account = accountList[0]
    return {
      id: account.id,
      uid: account.uid,
      nickname: account.nickname,
    }
  }

  /**
   * 根据 ID 查找账号
   */
  async findAccountById(accountId: string) {
    const accountList = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)

    return accountList.length > 0 ? accountList[0] : null
  }
}

