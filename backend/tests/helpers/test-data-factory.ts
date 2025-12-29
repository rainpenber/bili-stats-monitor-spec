// T006: 测试数据工厂 - 用于快速创建测试数据
import { nanoid } from 'nanoid'

export interface MockUser {
  id: string
  username: string
  passwordHash: string
  role: 'admin' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

export interface MockAccount {
  id: string
  uid: string
  nickname: string
  sessdata: string
  biliJct: string
  bindMethod: 'cookie' | 'qrcode'
  status: 'valid' | 'expired'
  lastFailures: number
  boundAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MockTask {
  id: string
  type: 'video' | 'author'
  targetId: string
  accountId: string | null
  status: 'running' | 'stopped' | 'completed' | 'failed' | 'paused'
  reason: string | null
  strategy: {
    mode: 'fixed' | 'smart'
    value?: number
    unit?: 'minute' | 'hour' | 'day'
  }
  deadline: Date
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export class TestDataFactory {
  /**
   * 创建测试用户
   */
  static createUser(overrides?: Partial<MockUser>): MockUser {
    return {
      id: nanoid(),
      username: `testuser_${nanoid(6)}`,
      passwordHash: '$2b$10$defaulthash',
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  /**
   * 创建测试账号
   */
  static createAccount(overrides?: Partial<MockAccount>): MockAccount {
    return {
      id: nanoid(),
      uid: String(Math.floor(Math.random() * 1000000000)),
      nickname: `测试账号_${nanoid(6)}`,
      sessdata: `encrypted_${nanoid()}`,
      biliJct: `encrypted_${nanoid()}`,
      bindMethod: 'cookie',
      status: 'valid',
      lastFailures: 0,
      boundAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  /**
   * 创建测试任务
   */
  static createTask(overrides?: Partial<MockTask>): MockTask {
    return {
      id: nanoid(),
      type: 'video',
      targetId: `BV${nanoid(10)}`,
      accountId: null,
      status: 'running',
      reason: null,
      strategy: { mode: 'smart' },
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 天后
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      ...overrides
    }
  }
}

