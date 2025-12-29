import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createDb } from '../../src/db'
import { getDbConfig } from '../../src/config/database'
import { loadEnv } from '../../src/config/env'
import { importFollowerFile, importVideoFile } from '../../src/services/csv-import'
import { tasks, authorMetrics, videoMetrics } from '../../src/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('CSV Import Integration', () => {
  let db: ReturnType<typeof createDb>
  const testDir = tmpdir()

  beforeEach(async () => {
    // 使用测试数据库（SQLite 内存数据库）
    const env = loadEnv()
    const dbConfig = getDbConfig(env)
    // 如果配置是 PostgreSQL，跳过测试（需要真实数据库）
    if (dbConfig.type === 'postgres') {
      return
    }
    db = createDb(dbConfig)
  })

  afterEach(async () => {
    if (db) {
      // 清理测试数据
      try {
        await db.delete(authorMetrics)
        await db.delete(videoMetrics)
        await db.delete(tasks)
      } catch (error) {
        // 忽略清理错误
      }
    }
  })

  test('导入粉丝数据文件', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    // 创建测试 CSV 文件
    const testFile = join(testDir, '28457_follower.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753
2025-11-28 21:08,321763
2025-11-29 01:33,321776`

    await writeFile(testFile, content, 'utf-8')

    try {
      const result = await importFollowerFile(db, testFile, {
        enabled: false,
        updateExisting: false,
      })

      expect(result.taskId).toBeTruthy()
      expect(result.inserted).toBe(3)
      expect(result.skipped).toBe(0)
      expect(result.errors).toHaveLength(0)

      // 验证任务已创建
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, result.taskId))
        .limit(1)

      expect(task).toHaveLength(1)
      expect(task[0].targetId).toBe('28457')
      expect(task[0].type).toBe('author')

      // 验证数据已插入
      const metrics = await db
        .select()
        .from(authorMetrics)
        .where(eq(authorMetrics.taskId, result.taskId))

      expect(metrics).toHaveLength(3)
      expect(metrics[0].follower).toBe(321753)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('导入视频数据文件', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    // 创建测试 CSV 文件
    const testFile = join(testDir, 'BV11A7fzTEti_views.csv')
    const content = `时间,播放量,在线观看人数,点赞,投币,收藏,分享,弹幕
2025-05-13 18:09,88,6,13,10,2,0,0
2025-05-13 18:19,188,17,27,18,8,0,0`

    await writeFile(testFile, content, 'utf-8')

    try {
      const result = await importVideoFile(db, testFile, {
        enabled: true,
        updateExisting: false,
      })

      expect(result.taskId).toBeTruthy()
      expect(result.inserted).toBe(2)
      expect(result.skipped).toBe(0)
      expect(result.errors).toHaveLength(0)

      // 验证任务已创建
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, result.taskId))
        .limit(1)

      expect(task).toHaveLength(1)
      expect(task[0].targetId).toBe('BV11A7fzTEti')
      expect(task[0].type).toBe('video')
      expect(task[0].status).toBe('running') // enabled=true

      // 验证数据已插入
      const metrics = await db
        .select()
        .from(videoMetrics)
        .where(eq(videoMetrics.taskId, result.taskId))

      expect(metrics).toHaveLength(2)
      expect(metrics[0].view).toBe(88)
      expect(metrics[0].like).toBe(13)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('跳过重复数据', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753
2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    try {
      // 第一次导入
      const result1 = await importFollowerFile(db, testFile, {
        updateExisting: false,
      })
      expect(result1.inserted).toBe(2)
      expect(result1.skipped).toBe(0)

      // 第二次导入（应该跳过重复数据）
      const result2 = await importFollowerFile(db, testFile, {
        updateExisting: false,
      })
      expect(result2.inserted).toBe(0)
      expect(result2.skipped).toBe(2) // 两条记录都被跳过

      // 验证数据只有 2 条（没有重复）
      const metrics = await db
        .select()
        .from(authorMetrics)
        .where(eq(authorMetrics.taskId, result1.taskId))

      expect(metrics).toHaveLength(2)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('更新已存在数据', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753
2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    try {
      // 第一次导入
      const result1 = await importFollowerFile(db, testFile, {
        updateExisting: false,
      })
      expect(result1.inserted).toBe(2)

      // 修改 CSV 内容（更新粉丝数）
      const updatedContent = `时间,粉丝数
2025-11-28 16:43,321800
2025-11-28 21:08,321900`
      await writeFile(testFile, updatedContent, 'utf-8')

      // 第二次导入（更新模式）
      const result2 = await importFollowerFile(db, testFile, {
        updateExisting: true,
      })
      expect(result2.inserted).toBe(0)
      expect(result2.updated).toBe(2) // 两条记录都被更新

      // 验证数据已更新
      const metrics = await db
        .select()
        .from(authorMetrics)
        .where(eq(authorMetrics.taskId, result1.taskId))
        .orderBy(authorMetrics.collectedAt)

      expect(metrics).toHaveLength(2)
      expect(metrics[0].follower).toBe(321800) // 已更新
      expect(metrics[1].follower).toBe(321900) // 已更新
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('处理验证错误', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    const content = `时间,粉丝数
invalid-time,321753
2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    try {
      const result = await importFollowerFile(db, testFile, {
        updateExisting: false,
      })

      // 应该有一条记录插入成功，一条记录验证失败
      expect(result.inserted).toBe(1)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('时间')
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('批量插入优化', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    // 创建大量数据（超过批量大小）
    const rows = Array.from({ length: 250 }, (_, i) => {
      const date = new Date(2025, 10, 28, 16 + Math.floor(i / 10), (i % 10) * 6)
      return `${date.toISOString().slice(0, 16).replace('T', ' ')},${321753 + i}`
    }).join('\n')
    const content = `时间,粉丝数\n${rows}`

    await writeFile(testFile, content, 'utf-8')

    try {
      const result = await importFollowerFile(db, testFile, {
        batchSize: 100, // 批量大小为 100
      })

      expect(result.inserted).toBe(250)
      expect(result.errors).toHaveLength(0)

      // 验证所有数据都已插入
      const metrics = await db
        .select()
        .from(authorMetrics)
        .where(eq(authorMetrics.taskId, result.taskId))

      expect(metrics).toHaveLength(250)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })
})

