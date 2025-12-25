// T055-T058: Collector 服务层单元测试
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { CollectorService } from '../../../src/services/collector'
import { AccountService } from '../../../src/services/account'
import type { DrizzleInstance } from '../../../src/db'

// Mock 依赖
vi.mock('../../../src/services/bili/client', () => ({
  biliClient: {
    getVideoView: vi.fn(),
    getOnlineTotal: vi.fn(),
    getUserStat: vi.fn(),
  },
}))

vi.mock('../../../src/services/account')

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-metric-id-67890',
}))

import { biliClient } from '../../../src/services/bili/client'

describe('CollectorService - Unit Tests', () => {
  let collectorService: CollectorService
  let mockDb: any
  let mockAccountService: any

  beforeEach(() => {
    // 创建 mock database
    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }

    // 创建 mock AccountService
    mockAccountService = {
      getCookie: vi.fn().mockResolvedValue('mock_cookie_value'),
      getDefaultAccount: vi.fn().mockResolvedValue({ id: 'default-acc' }),
      handleExpired: vi.fn().mockResolvedValue(undefined),
    } as any

    collectorService = new CollectorService(mockDb as DrizzleInstance, mockAccountService)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  // T055: 测试视频数据采集和解析
  describe('collectVideo - 视频数据采集', () => {
    test('应成功采集视频数据并解析指标', async () => {
      const task = {
        id: 'task-video-1',
        type: 'video',
        targetId: 'BV1234567890',
        accountId: 'acc-1',
        cid: '98765',
      }

      // Mock Bilibili API 响应
      const mockVideoInfo = {
        code: 0,
        data: {
          bvid: 'BV1234567890',
          cid: 98765,
          stat: {
            view: 100000,
            like: 5000,
            coin: 2000,
            favorite: 3000,
            share: 1000,
            danmaku: 500,
            reply: 200,
          },
        },
      }

      const mockOnlineInfo = {
        code: 0,
        data: { total: '256' },
      }

      ;(biliClient.getVideoView as any).mockResolvedValue(mockVideoInfo)
      ;(biliClient.getOnlineTotal as any).mockResolvedValue(mockOnlineInfo)

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(true)
      expect(result.metrics).toEqual({
        view: 100000,
        online: 256,
        like: 5000,
        coin: 2000,
        favorite: 3000,
        share: 1000,
        danmaku: 500,
        reply: 200,
      })

      // 验证指标已保存
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalled()
    })

    test('应正确处理 0 值指标', async () => {
      const task = {
        id: 'task-video-2',
        type: 'video',
        targetId: 'BV9999999999',
        accountId: 'acc-2',
        cid: '11111',
      }

      const mockVideoInfo = {
        code: 0,
        data: {
          stat: {
            view: 0,
            like: 0,
            coin: 0,
            favorite: 0,
            share: 0,
            danmaku: 0,
            reply: 0,
          },
        },
      }

      ;(biliClient.getVideoView as any).mockResolvedValue(mockVideoInfo)
      ;(biliClient.getOnlineTotal as any).mockResolvedValue({ code: 0, data: { total: '0' } })

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(true)
      expect(result.metrics?.view).toBe(0)
      expect(result.metrics?.online).toBe(0)
    })

    test('在线人数获取失败不应影响整体采集', async () => {
      const task = {
        id: 'task-video-3',
        type: 'video',
        targetId: 'BV3333333333',
        accountId: 'acc-3',
        cid: '22222',
      }

      const mockVideoInfo = {
        code: 0,
        data: {
          stat: {
            view: 50000,
            like: 1000,
            coin: 500,
            favorite: 600,
            share: 200,
            danmaku: 100,
            reply: 50,
          },
        },
      }

      ;(biliClient.getVideoView as any).mockResolvedValue(mockVideoInfo)
      ;(biliClient.getOnlineTotal as any).mockRejectedValue(new Error('Network error'))

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(true)
      expect(result.metrics?.online).toBeNull() // 在线人数为 null
      expect(result.metrics?.view).toBe(50000) // 其他数据正常
    })

    test('无有效账号应返回失败', async () => {
      const task = {
        id: 'task-video-4',
        type: 'video',
        targetId: 'BV4444444444',
        accountId: 'acc-invalid',
      }

      mockAccountService.getCookie.mockResolvedValue(null)

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No valid account available')
    })

    test('获取 CID 失败应返回失败', async () => {
      const task = {
        id: 'task-video-5',
        type: 'video',
        targetId: 'BV5555555555',
        accountId: 'acc-5',
        cid: null,
      }

      // ensureCid 会在内部失败
      ;(biliClient.getVideoView as any).mockResolvedValue({ code: -404, message: 'Video not found' })

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get CID')
    })

    test('Bilibili API 返回错误码应返回失败', async () => {
      const task = {
        id: 'task-video-6',
        type: 'video',
        targetId: 'BV6666666666',
        accountId: 'acc-6',
        cid: '66666',
      }

      ;(biliClient.getVideoView as any).mockResolvedValue({
        code: -403,
        message: 'Access denied',
      })

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Access denied')
    })

    test('网络异常应被捕获并返回失败', async () => {
      const task = {
        id: 'task-video-7',
        type: 'video',
        targetId: 'BV7777777777',
        accountId: 'acc-7',
        cid: '77777',
      }

      ;(biliClient.getVideoView as any).mockRejectedValue(new Error('Network timeout'))

      const result = await collectorService.collectVideo(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })
  })

  // T056: 测试博主数据采集和解析
  describe('collectAuthor - 博主数据采集', () => {
    test('应成功采集博主数据并解析粉丝数', async () => {
      const task = {
        id: 'task-author-1',
        type: 'author',
        targetId: '123456',
        accountId: 'acc-1',
      }

      const mockUserInfo = {
        code: 0,
        data: {
          mid: 123456,
          follower: 500000,
        },
      }

      ;(biliClient.getUserStat as any).mockResolvedValue(mockUserInfo)

      const result = await collectorService.collectAuthor(task)

      expect(result.success).toBe(true)
      expect(result.metrics).toEqual({
        follower: 500000,
      })

      // 验证指标已保存
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalled()
    })

    test('应正确处理粉丝数为 0 的情况', async () => {
      const task = {
        id: 'task-author-2',
        type: 'author',
        targetId: '999999',
        accountId: 'acc-2',
      }

      const mockUserInfo = {
        code: 0,
        data: {
          follower: 0,
        },
      }

      ;(biliClient.getUserStat as any).mockResolvedValue(mockUserInfo)

      const result = await collectorService.collectAuthor(task)

      expect(result.success).toBe(true)
      expect(result.metrics?.follower).toBe(0)
    })

    test('无有效账号应返回失败', async () => {
      const task = {
        id: 'task-author-3',
        type: 'author',
        targetId: '333333',
        accountId: 'acc-invalid',
      }

      mockAccountService.getCookie.mockResolvedValue(null)

      const result = await collectorService.collectAuthor(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No valid account available')
    })

    test('Bilibili API 返回错误应返回失败', async () => {
      const task = {
        id: 'task-author-4',
        type: 'author',
        targetId: '444444',
        accountId: 'acc-4',
      }

      ;(biliClient.getUserStat as any).mockResolvedValue({
        code: -404,
        message: 'User not found',
      })

      const result = await collectorService.collectAuthor(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('User not found')
    })

    test('网络异常应被捕获', async () => {
      const task = {
        id: 'task-author-5',
        type: 'author',
        targetId: '555555',
        accountId: 'acc-5',
      }

      ;(biliClient.getUserStat as any).mockRejectedValue(new Error('Connection refused'))

      const result = await collectorService.collectAuthor(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })
  })

  // T057: 测试 Bilibili API 调用失败重试逻辑
  describe('ensureCid - 重试逻辑', () => {
    test('已有 CID 应直接返回', async () => {
      const task = {
        id: 'task-cid-1',
        targetId: 'BV1111111111',
        cid: '12345',
      }

      const cid = await (collectorService as any).ensureCid(task)

      expect(cid).toBe('12345')
      expect(biliClient.getVideoView).not.toHaveBeenCalled()
    })

    test('无 CID 应尝试获取并保存', async () => {
      const task = {
        id: 'task-cid-2',
        targetId: 'BV2222222222',
        accountId: 'acc-2',
        cid: null,
        cidRetries: 0,
      }

      ;(biliClient.getVideoView as any).mockResolvedValue({
        code: 0,
        data: { cid: 98765 },
      })

      const cid = await (collectorService as any).ensureCid(task)

      expect(cid).toBe('98765')
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()

      const updates = mockDb.set.mock.calls[0][0]
      expect(updates.cid).toBe('98765')
      expect(updates.cidRetries).toBe(0)
    })

    test('第1-4次失败应设置1分钟后重试', async () => {
      const task = {
        id: 'task-cid-3',
        targetId: 'BV3333333333',
        accountId: 'acc-3',
        cid: null,
        cidRetries: 2, // 已失败2次
      }

      ;(biliClient.getVideoView as any).mockResolvedValue({
        code: -404,
        message: 'Not found',
      })

      const beforeTime = Date.now()
      const cid = await (collectorService as any).ensureCid(task)
      const afterTime = Date.now()

      expect(cid).toBeNull()
      expect(mockDb.update).toHaveBeenCalled()

      const updates = mockDb.set.mock.calls[0][0]
      expect(updates.cidRetries).toBe(3) // 增加到3次
      expect(updates.nextRunAt).toBeInstanceOf(Date)

      const nextRunTime = updates.nextRunAt.getTime()
      const expectedTime = beforeTime + 60 * 1000
      expect(Math.abs(nextRunTime - expectedTime)).toBeLessThan(1000)
    })

    test('第5次失败应标记任务为 failed', async () => {
      const task = {
        id: 'task-cid-4',
        targetId: 'BV4444444444',
        accountId: 'acc-4',
        cid: null,
        cidRetries: 4, // 已失败4次
      }

      ;(biliClient.getVideoView as any).mockResolvedValue({
        code: -500,
        message: 'Internal error',
      })

      const cid = await (collectorService as any).ensureCid(task)

      expect(cid).toBeNull()
      expect(mockDb.update).toHaveBeenCalled()

      const updates = mockDb.set.mock.calls[0][0]
      expect(updates.status).toBe('failed')
      expect(updates.cidRetries).toBe(5)
      expect(updates.reason).toContain('Failed to get CID after 5 attempts')
    })

    test('网络异常也应计入重试次数', async () => {
      const task = {
        id: 'task-cid-5',
        targetId: 'BV5555555555',
        accountId: 'acc-5',
        cid: null,
        cidRetries: 0,
      }

      ;(biliClient.getVideoView as any).mockRejectedValue(new Error('Network error'))

      const cid = await (collectorService as any).ensureCid(task)

      expect(cid).toBeNull()
      
      const updates = mockDb.set.mock.calls[0][0]
      expect(updates.cidRetries).toBe(1)
    })
  })

  // T058: 测试鉴权失败处理（连续失败 > 5 次）
  describe('getAccountCookie - 账号获取和鉴权', () => {
    test('有指定账号ID应获取该账号的 Cookie', async () => {
      mockAccountService.getCookie.mockResolvedValue('specific_cookie')

      const cookie = await (collectorService as any).getAccountCookie('acc-specific')

      expect(mockAccountService.getCookie).toHaveBeenCalledWith('acc-specific')
      expect(cookie).toBe('specific_cookie')
    })

    test('无指定账号应使用默认账号', async () => {
      mockAccountService.getDefaultAccount.mockResolvedValue({ id: 'default-acc-id' })
      mockAccountService.getCookie.mockResolvedValue('default_cookie')

      const cookie = await (collectorService as any).getAccountCookie(null)

      expect(mockAccountService.getDefaultAccount).toHaveBeenCalled()
      expect(mockAccountService.getCookie).toHaveBeenCalledWith('default-acc-id')
      expect(cookie).toBe('default_cookie')
    })

    test('无默认账号应返回 null', async () => {
      mockAccountService.getDefaultAccount.mockResolvedValue(null)

      const cookie = await (collectorService as any).getAccountCookie(null)

      expect(cookie).toBeNull()
    })

    test('账号 Cookie 无效应返回 null', async () => {
      mockAccountService.getCookie.mockResolvedValue(null)

      const cookie = await (collectorService as any).getAccountCookie('acc-expired')

      expect(cookie).toBeNull()
    })
  })

  // 通用采集测试
  describe('collect - 任务类型分发', () => {
    test('应正确分发视频任务', async () => {
      const task = {
        id: 'task-dispatch-1',
        type: 'video',
        targetId: 'BV1111111111',
        accountId: 'acc-1',
        cid: '12345',
      }

      ;(biliClient.getVideoView as any).mockResolvedValue({
        code: 0,
        data: {
          stat: { view: 1000, like: 100, coin: 50, favorite: 80, share: 30, danmaku: 20, reply: 10 },
        },
      })
      ;(biliClient.getOnlineTotal as any).mockResolvedValue({ code: 0, data: { total: '5' } })

      const result = await collectorService.collect(task)

      expect(result.success).toBe(true)
    })

    test('应正确分发博主任务', async () => {
      const task = {
        id: 'task-dispatch-2',
        type: 'author',
        targetId: '123456',
        accountId: 'acc-2',
      }

      ;(biliClient.getUserStat as any).mockResolvedValue({
        code: 0,
        data: { follower: 10000 },
      })

      const result = await collectorService.collect(task)

      expect(result.success).toBe(true)
    })

    test('未知任务类型应返回错误', async () => {
      const task = {
        id: 'task-dispatch-3',
        type: 'unknown',
        targetId: 'xxx',
      }

      const result = await collectorService.collect(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown task type')
    })
  })
})

