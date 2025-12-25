// T051-T054: Task 服务层单元测试（简化版 - 使用真实DB）
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { TaskService } from '../../../src/services/task'
import { createDb, migrateDb, cleanupDb } from '../../helpers/test-db'
import type { CreateTaskData } from '../../../src/services/task'
import { accounts } from '../../../src/db/schema'

describe('TaskService - Unit Tests (Simplified)', () => {
  let db: any
  let taskService: TaskService

  beforeEach(async () => {
    db = createDb()
    await migrateDb(db)
    taskService = new TaskService(db)

    // 创建测试账号以满足外键约束
    await db.insert(accounts).values({
      id: 'test-account-1',
      uid: '123456',
      nickname: 'Test User',
      sessdata: 'encrypted_test_sessdata',
      biliJct: 'test_jct',
      bindMethod: 'cookie',
      status: 'valid',
      lastFailures: 0,
      boundAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  afterEach(async () => {
    await cleanupDb(db)
  })

  // T051: 任务创建测试
  describe('create - 任务创建', () => {
    test('应成功创建视频监控任务', async () => {
      const taskData: CreateTaskData = {
        type: 'video',
        targetId: 'BV1234567890',
        title: '测试视频标题',
        accountId: 'test-account-1',
        strategy: { mode: 'fixed', value: 30, unit: 'minute' },
        tags: ['测试', 'demo'],
      }

      const taskId = await taskService.create(taskData)

      // 验证任务已创建
      expect(taskId).toBeTruthy()
      const task = await taskService.findById(taskId)
      expect(task).not.toBeNull()
      expect(task?.type).toBe('video')
      expect(task?.targetId).toBe('BV1234567890')
      expect(task?.title).toBe('测试视频标题')
      expect(task?.status).toBe('running')
      expect(task?.tags).toEqual(['测试', 'demo'])
    })

    test('应成功创建博主监控任务', async () => {
      const taskData: CreateTaskData = {
        type: 'author',
        targetId: '123456',
        title: '测试博主',
        strategy: { mode: 'fixed', value: 60, unit: 'minute' },
      }

      const taskId = await taskService.create(taskData)

      const task = await taskService.findById(taskId)
      expect(task?.type).toBe('author')
      expect(task?.targetId).toBe('123456')
    })

    test('应使用默认值创建任务', async () => {
      const taskData: CreateTaskData = {
        type: 'video',
        targetId: 'BV9999999999',
        title: '无账号任务',
        strategy: { mode: 'smart_video' },
      }

      const taskId = await taskService.create(taskData)

      const task = await taskService.findById(taskId)
      expect(task?.accountId).toBeNull()
      expect(task?.tags).toEqual([])
      expect(task?.deadline).toBeInstanceOf(Date)
    })
  })

  // T052: 任务更新测试
  describe('update - 任务更新', () => {
    test('应成功更新任务标题', async () => {
      const taskId = await taskService.create({
        type: 'video',
        targetId: 'BV111',
        title: '原标题',
        strategy: { mode: 'smart_video' },
      })

      await taskService.update(taskId, { title: '新标题' })

      const task = await taskService.findById(taskId)
      expect(task?.title).toBe('新标题')
    })

    test('应成功更新任务状态', async () => {
      const taskId = await taskService.create({
        type: 'video',
        targetId: 'BV222',
        title: 'Test',
        strategy: { mode: 'smart_video' },
      })

      await taskService.update(taskId, { status: 'paused' })

      const task = await taskService.findById(taskId)
      expect(task?.status).toBe('paused')
    })
  })

  // T053: 任务查询测试
  describe('findById & findMany - 任务查询', () => {
    test('应成功查找存在的任务', async () => {
      const taskId = await taskService.create({
        type: 'video',
        targetId: 'BV333',
        title: 'Find Test',
        strategy: { mode: 'smart_video' },
      })

      const task = await taskService.findById(taskId)
      expect(task).not.toBeNull()
      expect(task?.id).toBe(taskId)
    })

    test('应返回 null 当任务不存在', async () => {
      const task = await taskService.findById('non-existent-id')
      expect(task).toBeNull()
    })

    test('应返回所有任务', async () => {
      await taskService.create({ type: 'video', targetId: 'bv1', title: 't1', strategy: { mode: 'smart_video' } })
      await taskService.create({ type: 'author', targetId: 'uid1', title: 't2', strategy: { mode: 'smart_video' } })

      const tasks = await taskService.findMany()
      expect(tasks.length).toBeGreaterThanOrEqual(2)
    })

    test('应支持类型过滤', async () => {
      await taskService.create({ type: 'video', targetId: 'bv1', title: 't1', strategy: { mode: 'smart_video' } })
      await taskService.create({ type: 'author', targetId: 'uid1', title: 't2', strategy: { mode: 'smart_video' } })

      const videoTasks = await taskService.findMany({ type: 'video' })
      expect(videoTasks.every(t => t.type === 'video')).toBe(true)
    })
  })

  // T054: 任务删除测试
  describe('delete - 任务删除（软删除）', () => {
    test('应将任务标记为 stopped 而非物理删除', async () => {
      const taskId = await taskService.create({
        type: 'video',
        targetId: 'BV444',
        title: 'Delete Test',
        strategy: { mode: 'smart_video' },
      })

      await taskService.delete(taskId)

      // 任务应仍存在，但状态为stopped
      const task = await taskService.findById(taskId)
      expect(task).not.toBeNull()
      expect(task?.status).toBe('stopped')
    })
  })
})
