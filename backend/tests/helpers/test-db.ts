// T007: 测试数据库工具 - 创建和管理测试用的 SQLite 内存数据库
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema'
import { TestDataFactory } from './test-data-factory'

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>

/**
 * 创建测试数据库（SQLite :memory:）
 */
export function createTestDb(): TestDatabase {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  
  return db
}

/**
 * 别名函数以兼容其他测试文件
 */
export const createDb = createTestDb

/**
 * 运行数据库迁移（手动创建表结构）
 */
export async function migrateDb(db: TestDatabase) {
  // 手动创建表结构（因为没有迁移文件）
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      uid TEXT NOT NULL,
      nickname TEXT,
      sessdata TEXT NOT NULL,
      bili_jct TEXT,
      bind_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'valid',
      last_failures INTEGER DEFAULT 0,
      bound_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL,
      cid TEXT,
      cid_retries INTEGER DEFAULT 0,
      strategy TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      reason TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      account_id TEXT,
      next_run_at INTEGER NOT NULL,
      deadline INTEGER,
      published_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS video_metrics (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      bvid TEXT NOT NULL,
      cid TEXT NOT NULL,
      view INTEGER,
      like INTEGER,
      coin INTEGER,
      favorite INTEGER,
      share INTEGER,
      comment INTEGER,
      danmaku INTEGER,
      online INTEGER,
      collected_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS author_metrics (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      uid TEXT NOT NULL,
      follower INTEGER,
      view INTEGER,
      like INTEGER,
      collected_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS notification_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      events TEXT NOT NULL,
      channels TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
}

/**
 * 清理测试数据库
 */
export async function cleanupDb(db: TestDatabase) {
  // 删除所有数据
  await db.delete(schema.notificationRules).execute().catch(() => {})
  await db.delete(schema.authorMetrics).execute().catch(() => {})
  await db.delete(schema.videoMetrics).execute().catch(() => {})
  await db.delete(schema.tasks).execute().catch(() => {})
  await db.delete(schema.accounts).execute().catch(() => {})
  await db.delete(schema.users).execute().catch(() => {})
}

/**
 * 测试数据库辅助类
 */
export class TestDatabaseHelper {
  constructor(private db: TestDatabase) {}

  /**
   * 插入标准测试数据
   */
  async seed() {
    // 插入测试用户
    await this.db.insert(schema.users).values([
      TestDataFactory.createUser({
        id: 'test-admin',
        username: 'admin',
        role: 'admin',
        passwordHash: '$2b$10$test.hash.for.password123'
      }),
      TestDataFactory.createUser({
        id: 'test-viewer',
        username: 'viewer',
        role: 'viewer',
        passwordHash: '$2b$10$test.hash.for.password123'
      })
    ])

    // 插入测试账号
    await this.db.insert(schema.accounts).values([
      TestDataFactory.createAccount({
        id: 'test-account-valid',
        uid: '123456789',
        nickname: '测试UP主',
        status: 'valid',
        lastFailures: 0
      }),
      TestDataFactory.createAccount({
        id: 'test-account-expired',
        uid: '987654321',
        nickname: '过期账号',
        status: 'expired',
        lastFailures: 6
      })
    ])

    // 插入测试任务
    await this.db.insert(schema.tasks).values([
      TestDataFactory.createTask({
        id: 'test-task-001',
        type: 'video',
        targetId: 'BV1234567890',
        accountId: 'test-account-valid',
        status: 'running'
      }),
      TestDataFactory.createTask({
        id: 'test-task-002',
        type: 'author',
        targetId: '123456789',
        accountId: 'test-account-expired',
        status: 'paused',
        reason: '账号鉴权失败'
      })
    ])
  }

  /**
   * 清空所有表
   */
  async clean() {
    await this.db.delete(schema.tasks)
    await this.db.delete(schema.accounts)
    await this.db.delete(schema.users)
  }

  /**
   * 重置数据库（清空 + 插入标准数据）
   */
  async reset() {
    await this.clean()
    await this.seed()
  }
}

