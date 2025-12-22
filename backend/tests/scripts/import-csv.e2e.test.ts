import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createDb } from '../../src/db'
import { getDbConfig } from '../../src/config/database'
import { loadEnv } from '../../src/config/env'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'
import { $ } from 'bun'

describe('CSV Import CLI E2E', () => {
  const testDir = join(tmpdir(), 'csv-import-test')
  let db: ReturnType<typeof createDb> | null = null

  beforeEach(async () => {
    // 设置测试环境变量
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long'
    process.env.ENCRYPT_KEY = 'test-encrypt-key-minimum-32-characters-long'
    process.env.DB_TYPE = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'

    // 创建测试目录
    await mkdir(testDir, { recursive: true })

    // 创建测试数据库
    const env = loadEnv()
    const dbConfig = getDbConfig(env)
    if (dbConfig.type === 'postgres') {
      return // 跳过 PostgreSQL 测试
    }
    db = createDb(dbConfig)
  })

  afterEach(async () => {
    // 清理测试文件
    if (existsSync(testDir)) {
      // 注意：在实际测试中，应该清理测试文件
      // 这里简化处理
    }
  })

  test('CLI 帮助信息', async () => {
    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { stdout, exitCode } = await $`bun run ${scriptPath} --help`.quiet()
    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('CSV 数据导入工具')
    expect(stdout.toString()).toContain('用法:')
  })

  test('CLI 参数验证 - 无效数据库类型', async () => {
    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { stderr, exitCode } = await $`bun run ${scriptPath} --db invalid`.quiet()
    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('无效的数据库类型')
  })

  test('CLI 文件扫描 - 空目录', async () => {
    const emptyDir = join(testDir, 'empty')
    await mkdir(emptyDir, { recursive: true })
    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')

    const { stderr, exitCode } = await $`bun run ${scriptPath} --db test ${emptyDir}`.quiet()
    expect(exitCode).toBe(3)
    expect(stderr.toString()).toContain('未找到任何 CSV 文件')
  })

  test('CLI 导入单个文件', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    // 创建测试 CSV 文件
    const testFile = join(testDir, '28457_follower.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753
2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { stdout, exitCode } = await $`bun run ${scriptPath} --db test ${testFile}`.quiet()
    
    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('导入完成报告')
    expect(stdout.toString()).toContain('成功文件数: 1')
  })

  test('CLI 导入多个文件', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    // 创建多个测试 CSV 文件
    const file1 = join(testDir, '28457_follower.csv')
    const file2 = join(testDir, 'BV11A7fzTEti_views.csv')
    
    await writeFile(file1, `时间,粉丝数\n2025-11-28 16:43,321753`, 'utf-8')
    await writeFile(file2, `时间,播放量,在线观看人数,点赞,投币,收藏,分享,弹幕\n2025-05-13 18:09,88,6,13,10,2,0,0`, 'utf-8')

    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { stdout, exitCode } = await $`bun run ${scriptPath} --db test ${testDir}`.quiet()
    
    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('总文件数: 2')
  })

  test('CLI 生成报告文件', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    const reportFile = join(testDir, 'report.json')
    
    await writeFile(testFile, `时间,粉丝数\n2025-11-28 16:43,321753`, 'utf-8')

    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { exitCode } = await $`bun run ${scriptPath} --db test --output-report ${reportFile} ${testFile}`.quiet()
    
    expect(exitCode).toBe(0)
    expect(existsSync(reportFile)).toBe(true)
    
    const reportContent = await Bun.file(reportFile).json()
    expect(reportContent).toHaveProperty('totalFiles')
    expect(reportContent).toHaveProperty('successFiles')
    expect(reportContent).toHaveProperty('files')
  })

  test('CLI 详细模式', async () => {
    if (!db) {
      return // 跳过 PostgreSQL 测试
    }

    const testFile = join(testDir, '28457_follower.csv')
    await writeFile(testFile, `时间,粉丝数\n2025-11-28 16:43,321753`, 'utf-8')

    const scriptPath = join(process.cwd(), 'backend/scripts/import-csv.ts')
    const { stdout } = await $`bun run ${scriptPath} --db test --verbose ${testFile}`.quiet()
    
    expect(stdout.toString()).toContain('连接数据库')
  })
})

