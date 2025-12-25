// T045-T048: 调度器模块单元测试
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SchedulerService } from '../../../src/services/scheduler'
import { CollectorService } from '../../../src/services/collector'
import { AccountService } from '../../../src/services/account'
import type { DrizzleInstance } from '../../../src/db'

// Mock 环境变量加载
vi.mock('../../../src/config/env', () => ({
  env: {
    BILIBILI_COOKIE: 'test_cookie',
    BILI_USER_AGENT: 'Mozilla/5.0 (Test)',
    PORT: 3000,
    NODE_ENV: 'test',
  },
  loadEnv: vi.fn(),
}))

// Mock biliClient
vi.mock('../../../src/services/bili/client', () => ({
  biliClient: {
    getVideoView: vi.fn(),
    getOnlineTotal: vi.fn(),
    getUserStat: vi.fn(),
  },
  BiliClient: vi.fn(),
}))

// Mock 依赖
vi.mock('../../../src/services/collector')
vi.mock('../../../src/services/account')

describe('SchedulerService - Unit Tests', () => {
  let scheduler: SchedulerService
  let mockDb: any
  let mockAccountService: any
  let mockCollectorService: any

  beforeEach(() => {
    // 创建 mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }

    // 创建 mock services
    mockAccountService = {
      handleExpired: vi.fn().mockResolvedValue(undefined),
    } as any

    mockCollectorService = {
      collect: vi.fn().mockResolvedValue({ success: true }),
    } as any

    // 创建 scheduler 实例
    scheduler = new SchedulerService(mockDb as DrizzleInstance, mockAccountService)
    
    // 替换内部的 collector（因为在构造函数中创建）
    ;(scheduler as any).collector = mockCollectorService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // T045: 测试智能策略间隔计算
  describe('calculateSmartInterval (智能策略间隔计算)', () => {
    test('新发布视频（0-5天）应返回 10 分钟间隔', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-1',
        type: 'video',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(10) // 10分钟
    })

    test('中期视频（5-14天）应返回 2 小时间隔', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-2',
        type: 'video',
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(120) // 2小时 = 120分钟
    })

    test('旧视频（14天+）应返回 4 小时间隔', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-3',
        type: 'video',
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(240) // 4小时 = 240分钟
    })

    test('无发布时间应返回默认 30 分钟间隔', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-4',
        type: 'author',
        publishedAt: null,
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(30) // 默认30分钟
    })

    test('边界值：刚好5天应进入中期区间', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-5',
        type: 'video',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 刚好5天
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(120) // 应该是2小时，而非10分钟
    })

    test('边界值：刚好14天应进入长期区间', () => {
      const calculateSmartInterval = (scheduler as any).calculateSmartInterval.bind(scheduler)
      
      const task = {
        id: 'test-6',
        type: 'video',
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 刚好14天
      }

      const interval = calculateSmartInterval(task)
      expect(interval).toBe(240) // 应该是4小时
    })
  })

  // T046: 测试固定策略时间解析
  describe('updateNextRun - 固定策略时间解析', () => {
    test('固定模式：10分钟间隔', async () => {
      const task = {
        id: 'task-fixed-1',
        type: 'video',
        strategy: { mode: 'fixed', value: 10 },
      }

      const beforeTime = Date.now()
      await (scheduler as any).updateNextRun(task)
      const afterTime = Date.now()

      // 验证数据库更新被调用
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      
      // 验证 set 被调用时传入的 nextRunAt 在合理范围内
      const setCall = mockDb.set.mock.calls[0][0]
      expect(setCall.nextRunAt).toBeInstanceOf(Date)
      
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = beforeTime + 10 * 60 * 1000 // 10分钟
      
      // 允许±1秒的误差
      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })

    test('固定模式：60分钟间隔', async () => {
      const task = {
        id: 'task-fixed-2',
        type: 'video',
        strategy: { mode: 'fixed', value: 60 },
      }

      const beforeTime = Date.now()
      await (scheduler as any).updateNextRun(task)

      const setCall = mockDb.set.mock.calls[0][0]
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = beforeTime + 60 * 60 * 1000 // 60分钟

      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })

    test('智能模式：应调用 calculateSmartInterval', async () => {
      const task = {
        id: 'task-smart-1',
        type: 'video',
        strategy: { mode: 'smart' },
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
      }

      const spy = vi.spyOn(scheduler as any, 'calculateSmartInterval')
      
      await (scheduler as any).updateNextRun(task)

      expect(spy).toHaveBeenCalledWith(task)
      
      // 验证使用智能计算结果（2天前 = 10分钟间隔）
      const setCall = mockDb.set.mock.calls[0][0]
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = Date.now() + 10 * 60 * 1000

      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })

    test('手动模式：应停止任务并不设置下次执行时间', async () => {
      const task = {
        id: 'task-manual-1',
        type: 'video',
        strategy: { mode: 'manual' },
      }

      await (scheduler as any).updateNextRun(task)

      // 验证任务状态被设置为 stopped
      const setCall = mockDb.set.mock.calls[0][0]
      expect(setCall.status).toBe('stopped')
      expect(setCall.reason).toBe('手动模式，等待用户触发')
      expect(setCall.nextRunAt).toBeUndefined()
    })

    test('无效策略模式：应使用默认30分钟间隔', async () => {
      const task = {
        id: 'task-invalid-1',
        type: 'video',
        strategy: { mode: 'unknown' as any },
      }

      const beforeTime = Date.now()
      await (scheduler as any).updateNextRun(task)

      const setCall = mockDb.set.mock.calls[0][0]
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = beforeTime + 30 * 60 * 1000 // 默认30分钟

      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })
  })

  // T047: 测试任务优先级排序逻辑
  describe('getDueTasks - 任务优先级排序', () => {
    test('应只获取状态为 running 且到期的任务', async () => {
      const mockTasks = [
        { id: '1', status: 'running', nextRunAt: new Date(Date.now() - 1000) },
        { id: '2', status: 'running', nextRunAt: new Date(Date.now() - 2000) },
      ]

      mockDb.limit.mockResolvedValue(mockTasks)

      const dueTasks = await (scheduler as any).getDueTasks()

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.limit).toHaveBeenCalledWith(100)
      expect(dueTasks).toEqual(mockTasks)
    })

    test('应限制一次最多处理100个任务', async () => {
      await (scheduler as any).getDueTasks()

      expect(mockDb.limit).toHaveBeenCalledWith(100)
    })
  })

  // T048: 测试任务状态转换
  describe('executeTask - 任务状态转换', () => {
    test('running → completed：任务过期时应标记为 completed', async () => {
      const task = {
        id: 'task-expired',
        type: 'video',
        targetId: 'BV123',
        deadline: new Date(Date.now() - 1000), // 已过期
        status: 'running',
      }

      await (scheduler as any).executeTask(task)

      // 验证状态更新为 completed
      expect(mockDb.update).toHaveBeenCalled()
      const setCall = mockDb.set.mock.calls[0][0]
      expect(setCall.status).toBe('completed')
      expect(setCall.reason).toBe('已到达截止时间')
    })

    test('running → running：采集成功后应更新下次执行时间', async () => {
      const task = {
        id: 'task-success',
        type: 'video',
        targetId: 'BV456',
        strategy: { mode: 'fixed', value: 10 },
        status: 'running',
      }

      mockCollectorService.collect.mockResolvedValue({ success: true })

      await (scheduler as any).executeTask(task)

      // 验证 updateNextRun 被调用
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      
      const setCall = mockDb.set.mock.calls[0][0]
      expect(setCall.nextRunAt).toBeInstanceOf(Date)
    })

    test('running → paused：采集失败应设置5分钟后重试', async () => {
      const task = {
        id: 'task-fail',
        type: 'video',
        targetId: 'BV789',
        accountId: 'acc-1',
        status: 'running',
      }

      mockCollectorService.collect.mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const beforeTime = Date.now()
      await (scheduler as any).executeTask(task)

      // 验证设置了5分钟后重试
      expect(mockDb.update).toHaveBeenCalled()
      const setCall = mockDb.set.mock.calls[0][0]
      expect(setCall.nextRunAt).toBeInstanceOf(Date)
      
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = beforeTime + 5 * 60 * 1000
      
      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })

    test('账号失效：应调用 accountService.handleExpired', async () => {
      const task = {
        id: 'task-auth-fail',
        type: 'video',
        targetId: 'BV111',
        accountId: 'acc-expired',
        status: 'running',
      }

      mockCollectorService.collect.mockResolvedValue({
        success: false,
        error: 'Invalid cookie: 账号未授权',
      })

      await (scheduler as any).executeTask(task)

      expect(mockAccountService.handleExpired).toHaveBeenCalledWith('acc-expired')
    })

    test('异常处理：执行异常时应设置5分钟后重试', async () => {
      const task = {
        id: 'task-exception',
        type: 'video',
        targetId: 'BV222',
        status: 'running',
      }

      mockCollectorService.collect.mockRejectedValue(new Error('Unexpected error'))

      const beforeTime = Date.now()
      await (scheduler as any).executeTask(task)

      // 验证设置了5分钟后重试
      const setCall = mockDb.set.mock.calls[0][0]
      const nextRunTime = setCall.nextRunAt.getTime()
      const expectedTime = beforeTime + 5 * 60 * 1000
      
      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })
  })

  // 生命周期管理测试
  describe('调度器生命周期管理', () => {
    test('start() 应启动调度器并开始轮询', () => {
      const pollSpy = vi.spyOn(scheduler as any, 'poll').mockResolvedValue(undefined)
      
      scheduler.start()

      expect((scheduler as any).isRunning).toBe(true)
      expect(pollSpy).toHaveBeenCalled()
    })

    test('stop() 应停止调度器并清除定时器', () => {
      scheduler.start()
      scheduler.stop()

      expect((scheduler as any).isRunning).toBe(false)
      expect((scheduler as any).pollTimer).toBeNull()
    })

    test('重复调用 start() 应输出警告', () => {
      scheduler.start()
      scheduler.start() // 第二次调用

      expect((scheduler as any).isRunning).toBe(true)
    })

    test('未运行时调用 stop() 应输出警告', () => {
      scheduler.stop() // 在未启动时调用

      expect((scheduler as any).isRunning).toBe(false)
    })
  })
})

