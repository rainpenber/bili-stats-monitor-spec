import { nanoid } from 'nanoid'
import { biliClient } from './bili/client'
import { AccountService } from './account'
import { SettingsService } from './settings'
import { videoMetrics, authorMetrics, tasks } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { DrizzleInstance } from '../db'

/**
 * 视频指标数据
 */
export interface VideoMetrics {
  view: number
  online: number | null
  like: number
  coin: number
  favorite: number
  share: number
  danmaku: number
  reply: number
}

/**
 * 博主指标数据
 */
export interface AuthorMetrics {
  follower: number
}

/**
 * 采集结果
 */
export interface CollectionResult {
  success: boolean
  error?: string
  metrics?: VideoMetrics | AuthorMetrics
}

/**
 * 数据采集服务
 */
export class CollectorService {
  private settingsService: SettingsService

  constructor(
    private db: DrizzleInstance,
    private accountService: AccountService
  ) {
    // 初始化SettingsService（使用同一个db实例）
    this.settingsService = new SettingsService(db)
  }

  /**
   * 采集任务数据（根据类型分发）
   */
  async collect(task: any): Promise<CollectionResult> {
    if (task.type === 'video') {
      return await this.collectVideo(task)
    } else if (task.type === 'author') {
      return await this.collectAuthor(task)
    } else {
      return {
        success: false,
        error: `Unknown task type: ${task.type}`,
      }
    }
  }

  /**
   * 采集视频数据
   */
  async collectVideo(task: any): Promise<CollectionResult> {
    try {
      const bvid = task.targetId

      // 获取账号 Cookie（使用三级优先级逻辑）
      const cookie = await this.getAccountCookie(task)
      if (!cookie) {
        return {
          success: false,
          error: 'No valid account available',
        }
      }

      // 确保有 CID
      const cid = await this.ensureCid(task)
      if (!cid) {
        return {
          success: false,
          error: 'Failed to get CID',
        }
      }

      // 获取视频基本信息
      const videoInfo = await biliClient.getVideoView(bvid, cookie)
      if (videoInfo.code !== 0 || !videoInfo.data) {
        return {
          success: false,
          error: `Failed to fetch video info: ${videoInfo.message || 'Unknown error'}`,
        }
      }

      const stat = videoInfo.data.stat

      // 获取在线人数
      let online: number | null = null
      try {
        const onlineInfo = await biliClient.getOnlineTotal(bvid, cid, cookie)
        if (onlineInfo.code === 0 && onlineInfo.data?.total) {
          online = parseInt(onlineInfo.data.total)
        }
      } catch (err) {
        // 在线人数获取失败不影响整体采集
        console.warn(`Failed to get online viewers for ${bvid}:`, err)
      }

      const metrics: VideoMetrics = {
        view: stat.view || 0,
        online,
        like: stat.like || 0,
        coin: stat.coin || 0,
        favorite: stat.favorite || 0,
        share: stat.share || 0,
        danmaku: stat.danmaku || 0,
        reply: stat.reply || 0,
      }

      // 保存指标
      await this.saveVideoMetrics(task.id, metrics)

      return {
        success: true,
        metrics,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unknown error',
      }
    }
  }

  /**
   * 采集博主数据
   */
  async collectAuthor(task: any): Promise<CollectionResult> {
    try {
      const uid = task.targetId

      // 获取账号 Cookie（使用三级优先级逻辑）
      const cookie = await this.getAccountCookie(task)
      if (!cookie) {
        return {
          success: false,
          error: 'No valid account available',
        }
      }

      // 获取用户统计信息
      const userInfo = await biliClient.getUserStat(uid, cookie)
      if (userInfo.code !== 0 || !userInfo.data) {
        return {
          success: false,
          error: `Failed to fetch user info: ${userInfo.message || 'Unknown error'}`,
        }
      }

      const metrics: AuthorMetrics = {
        follower: userInfo.data.follower || 0,
      }

      // 保存指标
      await this.saveAuthorMetrics(task.id, metrics)

      return {
        success: true,
        metrics,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unknown error',
      }
    }
  }

  /**
   * 确保任务有 CID（视频专用）
   */
  async ensureCid(task: any): Promise<string | null> {
    // 如果已有 CID，直接返回
    if (task.cid) {
      return task.cid
    }

    // 尝试获取 CID
    try {
      const cookie = await this.getAccountCookie(task)
      if (!cookie) {
        throw new Error('No valid account available')
      }

      const videoInfo = await biliClient.getVideoView(task.targetId, cookie)
      if (videoInfo.code !== 0 || !videoInfo.data?.cid) {
        throw new Error('Failed to get CID from video info')
      }

      const cid = videoInfo.data.cid.toString()

      // 更新任务的 CID
      await this.db
        .update(tasks)
        .set({
          cid,
          cidRetries: 0, // 重置重试计数
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))

      return cid
    } catch (err: any) {
      // 增加重试计数
      const retries = (task.cidRetries || 0) + 1

      if (retries >= 5) {
        // 5 次失败后标记任务为 failed
        await this.db
          .update(tasks)
          .set({
            status: 'failed',
            reason: `Failed to get CID after ${retries} attempts: ${err.message}`,
            cidRetries: retries,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, task.id))

        // TODO: 发送通知
        console.error(`Task ${task.id} failed after ${retries} CID retry attempts`)
      } else {
        // 设置 1 分钟后重试
        const nextRun = new Date(Date.now() + 60 * 1000)
        await this.db
          .update(tasks)
          .set({
            cidRetries: retries,
            nextRunAt: nextRun,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, task.id))

        console.warn(`Task ${task.id} CID retry ${retries}/5, next attempt at ${nextRun.toISOString()}`)
      }

      return null
    }
  }

  /**
   * 保存视频指标
   */
  private async saveVideoMetrics(taskId: string, metrics: VideoMetrics): Promise<void> {
    const id = nanoid()
    const now = new Date()

    await this.db.insert(videoMetrics).values({
      id,
      taskId,
      collectedAt: now,
      view: metrics.view,
      online: metrics.online,
      like: metrics.like,
      coin: metrics.coin,
      favorite: metrics.favorite,
      share: metrics.share,
      danmaku: metrics.danmaku,
      reply: metrics.reply,
    })
  }

  /**
   * 保存博主指标
   */
  private async saveAuthorMetrics(taskId: string, metrics: AuthorMetrics): Promise<void> {
    const id = nanoid()
    const now = new Date()

    await this.db.insert(authorMetrics).values({
      id,
      taskId,
      collectedAt: now,
      follower: metrics.follower,
    })
  }

  /**
   * 获取账号 Cookie（三级优先级逻辑）
   * 
   * 优先级：
   * 1. task.bili_account_id 指定的账号
   * 2. task.author_uid 匹配的已绑定账号（通过accounts.uid匹配）
   * 3. 全局默认账号（从settings表读取default_account_id）
   * 
   * @param task 任务对象，包含bili_account_id、author_uid等字段
   * @returns Cookie字符串，如果所有账号都不可用则返回null
   */
  private async getAccountCookie(task: any): Promise<string | null> {
    // 优先级1: 使用task.bili_account_id指定的账号
    if (task.biliAccountId) {
      const cookie = await this.accountService.getCookie(task.biliAccountId)
      if (cookie) {
        return cookie
      }
      // 如果指定的账号无效，继续尝试下一级
    }

    // 优先级2: 检查task.author_uid是否有对应的已绑定账号
    if (task.authorUid) {
      const account = await this.accountService.getAccountByUid(task.authorUid)
      if (account) {
        const cookie = await this.accountService.getCookie(account.id)
        if (cookie) {
          return cookie
        }
        // 如果匹配的账号无效，继续尝试下一级
      }
    }

    // 优先级3: 使用全局默认账号
    const defaultAccountId = await this.settingsService.getDefaultAccountId()
    if (defaultAccountId) {
      const cookie = await this.accountService.getCookie(defaultAccountId)
      if (cookie) {
        return cookie
      }
    }

    // 如果所有优先级都失败，尝试使用AccountService的getDefaultAccount（fallback）
    const defaultAccount = await this.accountService.getDefaultAccount()
    if (defaultAccount) {
      return await this.accountService.getCookie(defaultAccount.id)
    }

    // 所有账号都不可用
    return null
  }
}

