import { nanoid } from 'nanoid'
import bcrypt from 'bcrypt'
import { eq, sql } from 'drizzle-orm'
import { users, settings } from './db/schema'
import type { DrizzleInstance } from './db'

/**
 * 检查数据库是否已初始化
 */
export async function checkDatabaseInitialized(db: DrizzleInstance): Promise<boolean> {
  try {
    // 尝试查询 users 表，如果表不存在会抛出错误
    await db.select().from(users).limit(1)
    return true
  } catch (err) {
    return false
  }
}

/**
 * 检查是否存在管理员账号
 */
export async function checkAdminExists(db: DrizzleInstance): Promise<boolean> {
  try {
    const adminList = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
    return adminList.length > 0
  } catch (err) {
    return false
  }
}

/**
 * 创建默认管理员账号
 */
export async function createDefaultAdmin(db: DrizzleInstance): Promise<void> {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin'
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'

  const passwordHash = await bcrypt.hash(password, 10)

  await db.insert(users).values({
    id: nanoid(),
    username,
    passwordHash,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log(`✅ 默认管理员账号已创建: ${username}`)
  console.log(`⚠️  请在首次登录后立即修改密码！`)
}

/**
 * 初始化系统设置
 */
export async function initializeSettings(db: DrizzleInstance): Promise<void> {
  try {
    const settingsList = await db.select().from(settings).limit(1)

    if (settingsList.length === 0) {
      await db.insert(settings).values({
        key: 'system',
        value: {
          maxTaskInterval: 1440, // 1 天（分钟）
          defaultTaskDeadline: 90, // 90 天
          dataRetentionDays: 365, // 1 年
        },
        updatedAt: new Date(),
      })

      console.log('✅ 系统设置已初始化')
    }
  } catch (err) {
    console.warn('⚠️  系统设置初始化失败:', err)
  }
}

/**
 * 运行数据库迁移
 * 
 * 注意：这里简化处理，假设使用 drizzle-kit push 或 migrate 已经创建表
 * 如果需要在应用启动时自动创建表，需要额外实现
 */
export async function runMigrations(db: DrizzleInstance): Promise<void> {
  console.log('⚠️  请使用 drizzle-kit push 或 migrate 创建数据库表')
  console.log('   命令: bun run db:push:sqlite 或 bun run db:push:pg')
  throw new Error('Database tables not found. Please run migrations first.')
}

/**
 * 初始化应用
 */
export async function initializeApp(db: DrizzleInstance): Promise<void> {
  console.log('🔍 检查数据库初始化状态...')

  const isInitialized = await checkDatabaseInitialized(db)
  if (!isInitialized) {
    console.log('❌ 数据库表未创建')
    await runMigrations(db)
    return
  }

  console.log('✅ 数据库表已存在')

  const hasAdmin = await checkAdminExists(db)
  if (!hasAdmin) {
    console.log('👤 创建默认管理员账号...')
    await createDefaultAdmin(db)
  } else {
    console.log('✅ 管理员账号已存在')
  }

  await initializeSettings(db)

  console.log('✅ 初始化完成')
}

