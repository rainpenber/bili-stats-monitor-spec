#!/usr/bin/env bun
/**
 * CSV 数据导入工具
 * 将历史 CSV 数据导入到数据库
 */

import { parseArgs } from 'util'
import { existsSync, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { join, resolve, extname, basename, dirname } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { createDb } from '../src/db'
import { importFollowerFile, importVideoFile, parseFilename, type ImportResult } from '../src/services/csv-import'
import { getDbConfig } from '../src/config/database'
import { sql } from 'drizzle-orm'
import { Database } from 'bun:sqlite'
import postgres from 'postgres'
import { z } from 'zod'

/**
 * CLI 参数接口
 */
interface CLIOptions {
  db?: 'test' | 'prod'
  activate?: boolean
  updateExisting?: boolean
  outputReport?: string
  verbose?: boolean
  help?: boolean
  files?: string[]
}

/**
 * 解析命令行参数
 */
function parseCLIArgs(): CLIOptions {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      db: { type: 'string', short: 'd' },
      activate: { type: 'boolean', short: 'a' },
      'update-existing': { type: 'boolean', short: 'u' },
      'output-report': { type: 'string', short: 'o' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  })

  return {
    db: values.db as 'test' | 'prod' | undefined,
    activate: values.activate || values['update-existing'] === undefined ? values.activate : false,
    updateExisting: values['update-existing'] || false,
    outputReport: values['output-report'] as string | undefined,
    verbose: values.verbose || false,
    help: values.help || false,
    files: positionals.length > 0 ? positionals : undefined,
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
CSV 数据导入工具

用法:
  bun run backend/scripts/import-csv.ts [OPTIONS] [FILES...]

参数:
  FILES...              要导入的 CSV 文件路径或目录路径（默认: backend/data/old-migrate/）

选项:
  -d, --db <test|prod>  目标数据库类型（默认: test）
  -a, --activate        导入后激活任务（enabled=true）
  -u, --update-existing 覆盖已存在的记录（默认跳过）
  -o, --output-report   将导入报告保存到文件（JSON 格式）
  -v, --verbose         显示详细日志输出
  -h, --help            显示帮助信息

示例:
  # 导入单个文件到测试数据库
  bun run backend/scripts/import-csv.ts --db test backend/data/old-migrate/28457_follower.csv

  # 批量导入目录下所有文件，激活任务
  bun run backend/scripts/import-csv.ts --db test --activate backend/data/old-migrate/

  # 导入到生产数据库，覆盖已存在记录
  bun run backend/scripts/import-csv.ts --db prod --update-existing backend/data/old-migrate/

退出码:
  0  导入成功
  1  参数错误
  2  数据库连接失败
  3  文件读取错误
  4  严重错误
`)
}

/**
 * 加载 CSV 导入工具所需的环境变量（不需要 JWT 和加密密钥）
 */
function loadImportEnv() {
  const envSchema = z.object({
    DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
    SQLITE_PATH: z.string().default('./data/app.db'),
    DATABASE_URL: z.string().optional(),
  })

  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    throw new Error(`环境变量验证失败: ${result.error.format()}`)
  }
  
  return result.data
}

/**
 * 确保数据库目录存在
 */
function ensureDatabaseDirectory(dbPath: string): void {
  const dir = dirname(resolve(dbPath))
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * 根据 --db 参数设置数据库配置
 */
function getDatabaseConfig(dbType: 'test' | 'prod'): { type: 'sqlite' | 'postgres'; postgresUrl?: string; sqlitePath?: string } {
  const env = loadImportEnv()
  
  if (dbType === 'test') {
    // 测试数据库：PostgreSQL 端口 5555 或 SQLite
    if (env.DB_TYPE === 'postgres') {
      // 如果环境变量中指定了 PostgreSQL，使用测试数据库连接
      // 假设测试数据库 URL 格式：postgres://user:pass@host:5555/db_test
      if (!env.DATABASE_URL) {
        throw new Error('测试数据库连接字符串未配置（DATABASE_URL）')
      }
      // 替换端口为 5555（测试数据库）
      const testUrl = env.DATABASE_URL.replace(/:(\d+)\//, ':5555/')
      return { type: 'postgres', postgresUrl: testUrl }
    }
    // 默认使用 SQLite
    return { type: 'sqlite', sqlitePath: env.SQLITE_PATH || './data/app.db' }
  } else {
    // 生产数据库：PostgreSQL 端口 5556
    if (!env.DATABASE_URL) {
      throw new Error('生产数据库连接字符串未配置（DATABASE_URL）')
    }
    // 替换端口为 5556（生产数据库）
    const prodUrl = env.DATABASE_URL.replace(/:(\d+)\//, ':5556/')
    return { type: 'postgres', postgresUrl: prodUrl }
  }
}

/**
 * 验证数据库连接
 */
async function verifyDatabaseConnection(dbConfig: { type: 'sqlite' | 'postgres'; postgresUrl?: string; sqlitePath?: string }): Promise<void> {
  try {
    // 直接使用底层客户端验证连接
    if (dbConfig.type === 'postgres') {
      if (!dbConfig.postgresUrl) {
        throw new Error('PostgreSQL URL is required')
      }
      const client = postgres(dbConfig.postgresUrl)
      try {
        await client`SELECT 1`
      } finally {
        await client.end()
      }
    } else {
      // SQLite 测试
      const sqlite = new Database(dbConfig.sqlitePath || './data/app.db')
      try {
        sqlite.query('SELECT 1').get()
      } finally {
        sqlite.close()
      }
    }
  } catch (error) {
    throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 扫描目录查找 CSV 文件
 */
async function scanCSVFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)
    
    if (entry.isDirectory()) {
      // 递归扫描子目录
      const subFiles = await scanCSVFiles(fullPath)
      files.push(...subFiles)
    } else if (entry.isFile() && entry.name.match(/_(follower|views)\.csv$/i)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 收集文件列表
 */
async function collectFiles(inputs: string[] | undefined): Promise<string[]> {
  const defaultDir = resolve(process.cwd(), 'backend/data/old-migrate')
  
  if (!inputs || inputs.length === 0) {
    // 默认扫描目录
    if (existsSync(defaultDir)) {
      return await scanCSVFiles(defaultDir)
    }
    return []
  }

  const files: string[] = []
  
  for (const input of inputs) {
    const resolved = resolve(input)
    
    if (!existsSync(resolved)) {
      console.error(`警告: 文件或目录不存在: ${input}`)
      continue
    }

    const stat = statSync(resolved)
    
    if (stat.isFile()) {
      // 单个文件
      if (resolved.match(/_(follower|views)\.csv$/i)) {
        files.push(resolved)
      } else {
        console.error(`警告: 文件格式不符合预期: ${input}`)
      }
    } else if (stat.isDirectory()) {
      // 目录，递归扫描
      const dirFiles = await scanCSVFiles(resolved)
      files.push(...dirFiles)
    }
  }

  return files
}

/**
 * 格式化进度条
 */
function formatProgress(current: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  const filled = Math.round((current / total) * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return `[${bar}] ${percentage}% (${current}/${total})`
}

/**
 * 导入报告
 */
interface ImportReport {
  totalFiles: number
  successFiles: number
  failedFiles: number
  totalRecords: number
  insertedRecords: number
  skippedRecords: number
  updatedRecords: number
  duration: number
  errors: Array<{
    file: string
    row?: number
    type: 'parse' | 'validate' | 'database'
    message: string
    data?: any
  }>
  files: Array<{
    file: string
    status: 'success' | 'failed'
    records?: number
    taskId?: string
    errors?: number
  }>
}

/**
 * 生成导入报告
 */
function generateReport(results: Array<{ file: string; result: ImportResult }>, startTime: number): ImportReport {
  const report: ImportReport = {
    totalFiles: results.length,
    successFiles: 0,
    failedFiles: 0,
    totalRecords: 0,
    insertedRecords: 0,
    skippedRecords: 0,
    updatedRecords: 0,
    duration: Date.now() - startTime,
    errors: [],
    files: [],
  }

  for (const { file, result } of results) {
    const fileName = basename(file)
    const hasErrors = result.errors.length > 0
    const isSuccess = result.taskId && !hasErrors

    if (isSuccess) {
      report.successFiles++
    } else {
      report.failedFiles++
    }

    report.totalRecords += result.inserted + result.skipped + result.updated
    report.insertedRecords += result.inserted
    report.skippedRecords += result.skipped
    report.updatedRecords += result.updated

    // 收集错误
    for (const error of result.errors) {
      report.errors.push({
        file: fileName,
        row: error.row,
        type: 'validate',
        message: error.message,
        data: error.data,
      })
    }

    // 文件结果
    report.files.push({
      file: fileName,
      status: isSuccess ? 'success' : 'failed',
      records: result.inserted + result.skipped + result.updated,
      taskId: result.taskId,
      errors: result.errors.length,
    })
  }

  return report
}

/**
 * 显示导入报告
 */
function displayReport(report: ImportReport, verbose: boolean) {
  console.log('\n========================================')
  console.log('导入完成报告')
  console.log('========================================')
  console.log(`总文件数: ${report.totalFiles}`)
  console.log(`成功文件数: ${report.successFiles}`)
  console.log(`失败文件数: ${report.failedFiles}`)
  console.log(`总记录数: ${report.totalRecords.toLocaleString()}`)
  console.log(`成功插入: ${report.insertedRecords.toLocaleString()}`)
  console.log(`跳过记录: ${report.skippedRecords.toLocaleString()} (重复数据)`)
  if (report.updatedRecords > 0) {
    console.log(`更新记录: ${report.updatedRecords.toLocaleString()}`)
  }
  console.log(`耗时: ${(report.duration / 1000).toFixed(1)} 秒`)

  if (report.errors.length > 0) {
    console.log('\n错误列表:')
    const displayErrors = verbose ? report.errors : report.errors.slice(0, 10)
    for (const error of displayErrors) {
      console.log(`- 文件: ${error.file}`)
      if (error.row) {
        console.log(`  行号: ${error.row}`)
      }
      console.log(`  错误: ${error.message}`)
    }
    if (!verbose && report.errors.length > 10) {
      console.log(`  ... 还有 ${report.errors.length - 10} 个错误（使用 --verbose 查看全部）`)
    }
  }

  console.log('========================================\n')
}

/**
 * 主函数
 */
async function main() {
  const options = parseCLIArgs()

  // 显示帮助
  if (options.help) {
    showHelp()
    process.exit(0)
  }

  // 验证数据库参数
  const dbType = options.db || 'test'
  if (dbType !== 'test' && dbType !== 'prod') {
    console.error(`错误: 无效的数据库类型 "${dbType}"，必须是 "test" 或 "prod"`)
    console.error('用法: bun run backend/scripts/import-csv.ts [OPTIONS] [FILES...]')
    process.exit(1)
  }

  let db: ReturnType<typeof createDb> | null = null
  let interrupted = false

  // 捕获 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n接收到中断信号，正在完成当前操作...')
    interrupted = true
  })

  try {
    // 设置数据库配置
    const dbConfig = getDatabaseConfig(dbType)
    
    // 如果是 SQLite，确保数据库目录存在
    if (dbConfig.type === 'sqlite' && dbConfig.sqlitePath) {
      ensureDatabaseDirectory(dbConfig.sqlitePath)
    }
    
    db = createDb(dbConfig)

    // 验证数据库连接
    if (options.verbose) {
      console.log(`🔍 连接数据库: ${dbType} (${dbConfig.type})`)
    }
    await verifyDatabaseConnection(dbConfig)
    if (options.verbose) {
      console.log('✅ 数据库连接成功\n')
    }

    // 收集文件列表
    const files = await collectFiles(options.files)
    
    if (files.length === 0) {
      console.error('错误: 未找到任何 CSV 文件')
      process.exit(3)
    }

    console.log(`📁 找到 ${files.length} 个 CSV 文件\n`)

    // 导入选项
    const importOptions = {
      enabled: options.activate || false,
      updateExisting: options.updateExisting || false,
      batchSize: 100,
    }

    const startTime = Date.now()
    const results: Array<{ file: string; result: ImportResult }> = []

    // 批量导入
    for (let i = 0; i < files.length; i++) {
      if (interrupted) {
        break
      }

      const file = files[i]
      const fileName = basename(file)
      const progress = formatProgress(i + 1, files.length)

      console.log(`${progress} 正在导入: ${fileName}`)

      try {
        // 解析文件名确定类型
        const fileInfo = parseFilename(file)
        if (!fileInfo) {
          results.push({
            file,
            result: {
              inserted: 0,
              skipped: 0,
              updated: 0,
              errors: [{ row: 0, message: `无效的文件名格式: ${fileName}` }],
              taskId: '',
            },
          })
          continue
        }

        // 调用导入函数
        const result = fileInfo.type === 'author'
          ? await importFollowerFile(db, file, importOptions)
          : await importVideoFile(db, file, importOptions)

        results.push({ file, result })

        if (result.errors.length > 0) {
          console.log(`  ⚠️  警告: ${result.errors.length} 个错误`)
        } else {
          console.log(`  ✅ 成功: 插入 ${result.inserted} 条，跳过 ${result.skipped} 条`)
        }
      } catch (error) {
        results.push({
          file,
          result: {
            inserted: 0,
            skipped: 0,
            updated: 0,
            errors: [{ row: 0, message: error instanceof Error ? error.message : String(error) }],
            taskId: '',
          },
        })
        console.log(`  ❌ 失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 生成报告
    const report = generateReport(results, startTime)
    displayReport(report, options.verbose || false)

    // 保存报告到文件
    if (options.outputReport) {
      const reportPath = resolve(options.outputReport)
      await Bun.write(reportPath, JSON.stringify(report, null, 2))
      console.log(`📄 报告已保存到: ${reportPath}\n`)
    }

    // 退出码
    if (report.failedFiles > 0) {
      process.exit(4) // 严重错误
    } else if (interrupted) {
      process.exit(130) // 中断
    } else {
      process.exit(0) // 成功
    }
  } catch (error) {
    console.error('\n❌ 错误:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.message.includes('数据库连接失败')) {
      console.error('\n💡 请检查:')
      console.error('  1. 数据库服务是否运行')
      console.error('  2. 连接字符串是否正确')
      console.error('  3. 网络连接是否正常')
      process.exit(2)
    } else if (error instanceof Error && error.message.includes('文件')) {
      process.exit(3)
    } else {
      process.exit(4)
    }
  }
}

// 运行主函数
main().catch((error) => {
  console.error('未处理的错误:', error)
  process.exit(4)
})

