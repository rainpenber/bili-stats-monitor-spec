import { Database } from 'bun:sqlite'
import { readFileSync } from 'fs'
import { join } from 'path'

const dbPath = join(process.cwd(), 'data/dev/bili-stats-dev.db')
const migrationPath = join(process.cwd(), 'src/db/migrations/0001_daffy_swordsman.sql')

console.log('📦 连接数据库:', dbPath)
const db = new Database(dbPath)

console.log('📄 读取迁移文件:', migrationPath)
const sql = readFileSync(migrationPath, 'utf-8')

// 分割SQL语句（按 --> statement-breakpoint 分隔）
const statements = sql
  .split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('/*'))

console.log(`\n🔄 执行 ${statements.length} 条SQL语句...\n`)

try {
  db.run('BEGIN TRANSACTION')
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`)
    db.run(statement)
  }
  
  db.run('COMMIT')
  console.log('\n✅ 迁移执行成功！')
  
  // 验证新字段
  const result = db.query('SELECT sql FROM sqlite_master WHERE type="table" AND name="tasks"').get() as { sql: string }
  console.log('\n📋 Tasks表结构:')
  console.log(result.sql)
  
} catch (error) {
  db.run('ROLLBACK')
  console.error('\n❌ 迁移失败:', error)
  process.exit(1)
} finally {
  db.close()
}

