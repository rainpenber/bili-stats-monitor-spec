// T108: E2E测试 - 查看视频数据趋势
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'bun'
import {
  setupTestDatabase,
  teardownTestDatabase,
  post,
  get,
  createTestAccount,
  sleep,
} from '../integration/helpers/test-helpers'
import { createAuthenticatedUser } from '../integration/helpers/auth-helper'
import type { DrizzleInstance } from '../../src/db'
import { accounts, videoMetrics, authorMetrics } from '../../src/db/schema'

/**
 * E2E测试：数据可视化流程
 * 
 * 用户故事：
 * 作为用户，我希望能够查看视频和UP主的数据趋势，
 * 包括观看量、点赞数、粉丝数等指标的变化图表。
 * 
 * 测试流程：
 * 1. 创建任务
 * 2. 触发数据采集
 * 3. 插入多条历史数据
 * 4. 查询数据趋势
 * 5. 验证数据点完整性
 * 6. 测试时间范围筛选
 * 7. 验证每日洞察数据
 */
describe('E2E: Data Visualization', () => {
  let db: DrizzleInstance
  let server: Server
  let adminToken: string
  const BASE_URL = 'http://localhost:3000'

  beforeAll(async () => {
    db = await setupTestDatabase()
    // TODO: 启动测试服务器
    // server = await startTestServer(db)

    const { token } = await createAuthenticatedUser(db, BASE_URL, 'admin')
    adminToken = token
  })

  afterAll(async () => {
    // TODO: 停止测试服务器
    await teardownTestDatabase(db)
  })

  test.skip('应能查看视频数据趋势', async () => {
    // ========== 第1步: 创建账号和任务 ==========
    const account = createTestAccount({
      uid: '222222222',
      nickname: 'Viz Test User',
      status: 'valid',
    })
    await db.insert(accounts).values(account)

    const bvid = 'BV1visualization'
    const taskData = {
      type: 'video',
      targetId: bvid,
      title: '数据可视化测试视频',
      accountId: account.id,
      strategy: { mode: 'smart_video' },
    }

    const createResponse = await post(
      `${BASE_URL}/api/v1/tasks`,
      taskData,
      adminToken
    )

    expect(createResponse.status).toBe(201)
    const taskId = createResponse.data.data.id

    // ========== 第2步: 插入模拟历史数据 ==========
    const now = Date.now()
    const metricsData = []

    // 插入30天的数据，模拟增长趋势
    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now - (29 - i) * 24 * 60 * 60 * 1000)
      metricsData.push({
        bvid,
        timestamp,
        views: 10000 + i * 500, // 每天增长500
        likes: 1000 + i * 50,
        coins: 500 + i * 20,
        favorites: 800 + i * 30,
        shares: 200 + i * 10,
        comments: 300 + i * 15,
        danmakus: 1500 + i * 100,
      })
    }

    await db.insert(videoMetrics).values(metricsData)

    // ========== 第3步: 查询完整数据趋势 ==========
    const metricsResponse = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/metrics`,
      adminToken
    )

    expect(metricsResponse.status).toBe(200)
    expect(metricsResponse.data.data).toBeInstanceOf(Array)
    expect(metricsResponse.data.data.length).toBe(30)

    // 验证数据按时间排序
    const timestamps = metricsResponse.data.data.map((d: any) => 
      new Date(d.timestamp).getTime()
    )
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1])
    }

    // 验证数据结构
    expect(metricsResponse.data.data[0]).toMatchObject({
      timestamp: expect.any(String),
      views: expect.any(Number),
      likes: expect.any(Number),
      coins: expect.any(Number),
      favorites: expect.any(Number),
    })

    // ========== 第4步: 测试时间范围筛选 ==========
    const startTime = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
    const endTime = new Date(now).toISOString()

    const rangeResponse = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/metrics?startTime=${startTime}&endTime=${endTime}`,
      adminToken
    )

    expect(rangeResponse.status).toBe(200)
    expect(rangeResponse.data.data.length).toBeLessThanOrEqual(15) // 最近14-15天

    // ========== 第5步: 查询每日洞察数据 ==========
    const insightsResponse = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/insights/daily`,
      adminToken
    )

    expect(insightsResponse.status).toBe(200)
    expect(insightsResponse.data.data).toBeInstanceOf(Array)

    if (insightsResponse.data.data.length > 0) {
      // 验证洞察数据包含增长率
      expect(insightsResponse.data.data[0]).toMatchObject({
        date: expect.any(String),
        viewsGrowth: expect.any(Number),
        likesGrowth: expect.any(Number),
        avgGrowthRate: expect.any(Number),
      })

      // 验证增长趋势计算
      const firstDay = insightsResponse.data.data[0]
      const lastDay = insightsResponse.data.data[insightsResponse.data.data.length - 1]

      expect(lastDay.viewsGrowth).toBeGreaterThanOrEqual(firstDay.viewsGrowth)
    }

    // ========== 第6步: 验证统计摘要 ==========
    if (insightsResponse.data.summary) {
      expect(insightsResponse.data.summary).toMatchObject({
        totalGrowth: expect.any(Number),
        avgDailyGrowth: expect.any(Number),
        trend: expect.stringMatching(/up|down|stable/),
      })

      // 对于持续增长的数据，趋势应该是"up"
      expect(insightsResponse.data.summary.trend).toBe('up')
      expect(insightsResponse.data.summary.totalGrowth).toBeGreaterThan(0)
    }
  })

  test.skip('应能查看UP主粉丝趋势', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    const uid = '333333333'
    const taskData = {
      type: 'author',
      targetId: uid,
      title: 'UP主粉丝趋势测试',
      accountId: account.id,
      strategy: { mode: 'smart_author' },
    }

    await post(`${BASE_URL}/api/v1/tasks`, taskData, adminToken)

    // 插入粉丝数据
    const now = Date.now()
    const followerData = []

    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now - (29 - i) * 24 * 60 * 60 * 1000)
      followerData.push({
        uid,
        timestamp,
        follower: 50000 + i * 100, // 每天涨粉100
        totalViews: 1000000 + i * 5000,
      })
    }

    await db.insert(authorMetrics).values(followerData)

    // 查询UP主指标
    const metricsResponse = await get(
      `${BASE_URL}/api/v1/authors/${uid}/metrics`,
      adminToken
    )

    expect(metricsResponse.status).toBe(200)
    expect(metricsResponse.data.data.length).toBe(30)

    // 验证粉丝增长
    const firstDay = metricsResponse.data.data[0]
    const lastDay = metricsResponse.data.data[29]

    expect(lastDay.follower).toBeGreaterThan(firstDay.follower)

    const growth = lastDay.follower - firstDay.follower
    expect(growth).toBeCloseTo(2900, -2) // 约29天 * 100
  })

  test.skip('应正确处理数据缺失的情况', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    // 创建任务但不插入数据
    const bvid = 'BV1nodata'
    await post(
      `${BASE_URL}/api/v1/tasks`,
      {
        type: 'video',
        targetId: bvid,
        title: 'No Data Test',
        accountId: account.id,
        strategy: { mode: 'smart_video' },
      },
      adminToken
    )

    // 查询不存在的数据
    const metricsResponse = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/metrics`,
      adminToken
    )

    expect(metricsResponse.status).toBe(200)
    expect(metricsResponse.data.data).toEqual([])
  })

  test.skip('应支持分页查询历史数据', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    const bvid = 'BV1pagination'
    await post(
      `${BASE_URL}/api/v1/tasks`,
      {
        type: 'video',
        targetId: bvid,
        title: 'Pagination Test',
        accountId: account.id,
        strategy: { mode: 'smart_video' },
      },
      adminToken
    )

    // 插入100条数据
    const metricsData = []
    for (let i = 0; i < 100; i++) {
      metricsData.push({
        bvid,
        timestamp: new Date(Date.now() - (99 - i) * 60 * 60 * 1000), // 每小时一条
        views: 10000 + i * 10,
        likes: 1000 + i,
        coins: 500,
        favorites: 800,
        shares: 200,
        comments: 300,
        danmakus: 1500,
      })
    }
    await db.insert(videoMetrics).values(metricsData)

    // 第一页
    const page1Response = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/metrics?page=1&pageSize=20`,
      adminToken
    )

    expect(page1Response.status).toBe(200)
    expect(page1Response.data.data.length).toBe(20)
    expect(page1Response.data.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 100,
    })

    // 第二页
    const page2Response = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/metrics?page=2&pageSize=20`,
      adminToken
    )

    expect(page2Response.status).toBe(200)
    expect(page2Response.data.data.length).toBe(20)

    // 验证两页数据不重复
    const page1Ids = page1Response.data.data.map((d: any) => d.timestamp)
    const page2Ids = page2Response.data.data.map((d: any) => d.timestamp)
    
    const intersection = page1Ids.filter((id: string) => page2Ids.includes(id))
    expect(intersection.length).toBe(0)
  })

  test.skip('应计算正确的增长率', async () => {
    const account = createTestAccount()
    await db.insert(accounts).values(account)

    const bvid = 'BV1growth'
    await post(
      `${BASE_URL}/api/v1/tasks`,
      {
        type: 'video',
        targetId: bvid,
        title: 'Growth Rate Test',
        accountId: account.id,
        strategy: { mode: 'smart_video' },
      },
      adminToken
    )

    // 插入明确的数据点
    const metricsData = [
      { bvid, timestamp: new Date('2024-01-01'), views: 10000, likes: 1000, coins: 500, favorites: 800, shares: 200, comments: 300, danmakus: 1500 },
      { bvid, timestamp: new Date('2024-01-02'), views: 11000, likes: 1100, coins: 550, favorites: 880, shares: 220, comments: 330, danmakus: 1650 },
      { bvid, timestamp: new Date('2024-01-03'), views: 12100, likes: 1210, coins: 605, favorites: 968, shares: 242, comments: 363, danmakus: 1815 },
    ]
    await db.insert(videoMetrics).values(metricsData)

    // 查询洞察
    const insightsResponse = await get(
      `${BASE_URL}/api/v1/videos/${bvid}/insights/daily?startDate=2024-01-01&endDate=2024-01-03`,
      adminToken
    )

    expect(insightsResponse.status).toBe(200)
    
    if (insightsResponse.data.data.length >= 2) {
      // 第一天到第二天: 10000 -> 11000, 增长10%
      const day1Growth = insightsResponse.data.data[0]
      expect(day1Growth.viewsGrowth).toBeCloseTo(1000, 0)
      expect(day1Growth.viewsGrowthRate).toBeCloseTo(10, 1)

      // 第二天到第三天: 11000 -> 12100, 增长10%
      const day2Growth = insightsResponse.data.data[1]
      expect(day2Growth.viewsGrowth).toBeCloseTo(1100, 0)
      expect(day2Growth.viewsGrowthRate).toBeCloseTo(10, 1)
    }
  })
})

