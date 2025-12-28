import { eq } from 'drizzle-orm'
import { settings } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * SettingsService - 系统设置服务
 * 
 * 负责管理系统全局设置（存储在settings表中）
 */
export class SettingsService {
  constructor(private db: DrizzleInstance) {}

  /**
   * 获取全局默认账号ID
   * 
   * @returns 默认账号ID，如果未设置或为'null'字符串则返回null
   */
  async getDefaultAccountId(): Promise<string | null> {
    const result = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'default_account_id'))
      .limit(1)

    if (!result || result.length === 0) {
      return null
    }

    const value = result[0].value
    
    // 如果值为'null'字符串（初始化时的默认值），视为未设置
    if (value === 'null' || value === '') {
      return null
    }

    return value
  }

  /**
   * 保存全局默认账号ID
   * 
   * @param accountId - 账号ID，如果为null则清除默认账号设置
   * @returns 保存结果（true=成功）
   */
  async saveDefaultAccountId(accountId: string | null): Promise<boolean> {
    try {
      const value = accountId || 'null'
      const now = Math.floor(Date.now() / 1000)

      await this.db
        .insert(settings)
        .values({
          key: 'default_account_id',
          value,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value,
            updatedAt: now
          }
        })

      return true
    } catch (error) {
      console.error('Failed to save default account ID:', error)
      return false
    }
  }

  /**
   * 获取任意设置值
   * 
   * @param key - 设置键名
   * @returns 设置值，如果不存在则返回null
   */
  async get(key: string): Promise<string | null> {
    const result = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)

    if (!result || result.length === 0) {
      return null
    }

    return result[0].value
  }

  /**
   * 保存任意设置值
   * 
   * @param key - 设置键名
   * @param value - 设置值
   * @returns 保存结果（true=成功）
   */
  async set(key: string, value: string): Promise<boolean> {
    try {
      const now = Math.floor(Date.now() / 1000)

      await this.db
        .insert(settings)
        .values({
          key,
          value,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value,
            updatedAt: now
          }
        })

      return true
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error)
      return false
    }
  }
}

