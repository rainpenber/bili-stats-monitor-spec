import { Database } from 'bun:sqlite'
import { join } from 'path'

const dbPath = join(process.cwd(), 'data/dev/bili-stats-dev.db')
const db = new Database(dbPath)

console.log('📦 检查数据库:', dbPath)

// 检查tasks表结构
const tasksSchema = db.query('SELECT sql FROM sqlite_master WHERE type="table" AND name="tasks"').get() as { sql: string }
console.log('\n📋 Tasks表结构:')
console.log(tasksSchema.sql)

// 检查是否有author_uid和bili_account_id字段
const hasAuthorUid = tasksSchema.sql.includes('author_uid')
const hasBiliAccountId = tasksSchema.sql.includes('bili_account_id')

console.log('\n✅ author_uid字段:', hasAuthorUid ? '已存在' : '❌ 不存在')
console.log('✅ bili_account_id字段:', hasBiliAccountId ? '已存在' : '❌ 不存在')

// 检查settings表中是否有default_account_id
const defaultAccount = db.query('SELECT * FROM settings WHERE key="default_account_id"').get()
console.log('\n📌 default_account_id:', defaultAccount ? '已初始化' : '❌ 未初始化')

if (defaultAccount) {
  console.log('   值:', defaultAccount)
}

// 检查tasks表数据
const taskCount = db.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
console.log('\n📊 Tasks表记录数:', taskCount.count)

if (taskCount.count > 0) {
  // 检查有多少tasks的author_uid为NULL
  const nullAuthorUidCount = db.query('SELECT COUNT(*) as count FROM tasks WHERE author_uid IS NULL').get() as { count: number }
  console.log('   author_uid为NULL的记录数:', nullAuthorUidCount.count)
  
  if (nullAuthorUidCount.count > 0) {
    console.log('   ⚠️ 需要执行数据回填!')
  } else {
    console.log('   ✅ 所有记录的author_uid都已填充')
  }
}

db.close()

