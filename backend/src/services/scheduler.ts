import { eq, and, lte, inArray } from 'drizzle-orm'
import { tasks } from '../db/schema'
import { CollectorService } from './collector'
import { AccountService } from './account'
import type { DrizzleInstance } from '../db'

/**
 * 任务策略类型
 */
export interface TaskStrategy {
  mode: 'fixed' | 'smart' | 'manual'
  value?: number // 固定模式下的采集间隔（分钟）
  unit?: string
}

/**
 * 持久化调度器
 */
export class SchedulerService {
  private isRunning: boolean = false
  private pollTimer: Timer | null = null
  private collector: CollectorService

  constructor(
    private db: DrizzleInstance,
    private accountService: AccountService
  ) {
    this.collector = new CollectorService(db, accountService)
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  调度器已在运行中')
      return
    }

    this.isRunning = true
    console.log('✅ 调度器已启动')

    // 立即执行一次轮询
    this.poll()

    // 每 5 秒轮询一次
    this.pollTimer = setInterval(() => {
      this.poll()
    }, 5000)
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  调度器未在运行')
      return
    }

    this.isRunning = false

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    console.log('✅ 调度器已停止')
  }

  /**
   * 主轮询循环
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // 获取到期任务
      const dueTasks = await this.getDueTasks()

      if (dueTasks.length === 0) {
        return
      }

      console.log(`📋 发现 ${dueTasks.length} 个到期任务`)

      // 执行所有到期任务
      for (const task of dueTasks) {
        await this.executeTask(task)
      }
    } catch (err: any) {
      console.error('❌ 调度器轮询失败:', err.message)
    }
  }

  /**
   * 获取到期任务
   */
  private async getDueTasks(): Promise<any[]> {
    const now = new Date()

    const dueTasks = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.status, 'running'), lte(tasks.nextRunAt, now)))
      .limit(100) // 一次最多处理 100 个任务

    return dueTasks
  }

  /**
   * 执行任务采集
   */
  private async executeTask(task: any): Promise<void> {
    try {
      console.log(`🚀 开始执行任务: ${task.id} (${task.type}: ${task.targetId})`)

      // 检查是否过期
      if (task.deadline && new Date() > task.deadline) {
        console.log(`⏰ 任务已过期: ${task.id}`)
        await this.db
          .update(tasks)
          .set({
            status: 'completed',
            reason: '已到达截止时间',
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, task.id))

        // TODO: 发送任务完成通知
        return
      }

      // 执行采集
      const result = await this.collector.collect(task)

      if (result.success) {
        console.log(`✅ 任务执行成功: ${task.id}`)

        // 更新下次执行时间
        await this.updateNextRun(task)
      } else {
        console.error(`❌ 任务执行失败: ${task.id} - ${result.error}`)

        // 如果是账号相关错误，可能需要处理账号失效
        if (result.error?.includes('Invalid cookie') || result.error?.includes('Unauthorized')) {
          if (task.accountId) {
            await this.accountService.handleExpired(task.accountId)
          }
        }

        // 对于失败的任务，设置 5 分钟后重试
        const nextRun = new Date(Date.now() + 5 * 60 * 1000)
        await this.db
          .update(tasks)
          .set({
            nextRunAt: nextRun,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, task.id))
      }
    } catch (err: any) {
      console.error(`❌ 任务执行异常: ${task.id}`, err)

      // 异常情况下也设置 5 分钟后重试
      const nextRun = new Date(Date.now() + 5 * 60 * 1000)
      await this.db
        .update(tasks)
        .set({
          nextRunAt: nextRun,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))
    }
  }

  /**
   * 更新下次执行时间
   */
  private async updateNextRun(task: any): Promise<void> {
    const strategy = task.strategy as TaskStrategy

    let intervalMs: number

    if (strategy.mode === 'fixed' && strategy.value) {
      // 固定模式：直接使用配置的间隔（分钟）
      intervalMs = strategy.value * 60 * 1000
    } else if (strategy.mode === 'smart') {
      // 智能模式：根据发布时间计算间隔
      const intervalMinutes = this.calculateSmartInterval(task)
      intervalMs = intervalMinutes * 60 * 1000
    } else if (strategy.mode === 'manual') {
      // 手动模式：不自动调度
      await this.db
        .update(tasks)
        .set({
          status: 'stopped',
          reason: '手动模式，等待用户触发',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))
      return
    } else {
      // 默认使用 30 分钟
      intervalMs = 30 * 60 * 1000
    }

    const nextRun = new Date(Date.now() + intervalMs)

    await this.db
      .update(tasks)
      .set({
        nextRunAt: nextRun,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))

    console.log(`⏰ 任务 ${task.id} 下次执行时间: ${nextRun.toISOString()}`)
  }

  /**
   * 智能频率计算
   * 
   * 根据发布时间距离现在的天数，自动调整采集频率：
   * - 段A: 0-5天 → 10分钟
   * - 段B: 5-14天 → 2小时
   * - 段C: 14天+ → 4小时
   */
  private calculateSmartInterval(task: any): number {
    if (!task.publishedAt) {
      // 如果没有发布时间，使用默认 30 分钟
      return 30
    }

    const publishTime = new Date(task.publishedAt).getTime()
    const now = Date.now()
    const daysOld = (now - publishTime) / (1000 * 60 * 60 * 24)

    if (daysOld < 5) {
      // 段A: 0-5天 → 10分钟
      return 10
    } else if (daysOld < 14) {
      // 段B: 5-14天 → 2小时
      return 2 * 60
    } else {
      // 段C: 14天+ → 4小时
      return 4 * 60
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { running: boolean; nextPollAt?: Date } {
    return {
      running: this.isRunning,
      nextPollAt: this.isRunning ? new Date(Date.now() + 5000) : undefined,
    }
  }

  /**
   * 手动触发任务执行
   */
  async triggerTask(taskId: string): Promise<void> {
    const taskList = await this.db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)

    if (taskList.length === 0) {
      throw new Error('Task not found')
    }

    const task = taskList[0]

    if (task.status !== 'running' && task.status !== 'stopped') {
      throw new Error(`Task cannot be triggered in ${task.status} status`)
    }

    console.log(`🔧 手动触发任务: ${taskId}`)
    await this.executeTask(task)
  }

  /**
   * 批量更新到期任务（用于初始化或修复）
   */
  async initializeTaskSchedules(): Promise<number> {
    const runningTasks = await this.db.select().from(tasks).where(eq(tasks.status, 'running'))

    let updated = 0

    for (const task of runningTasks) {
      if (!task.nextRunAt || new Date(task.nextRunAt) < new Date()) {
        // 设置立即执行
        await this.db
          .update(tasks)
          .set({
            nextRunAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, task.id))

        updated++
      }
    }

    console.log(`✅ 初始化了 ${updated} 个任务的调度时间`)
    return updated
  }
}

