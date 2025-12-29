import { Database } from 'bun:sqlite'
import { join } from 'path'

const dbPath = join(process.cwd(), 'backend/data/dev/bili-stats-dev.db')

console.log('📦 回填 author_uid 字段...')
console.log('📦 数据库文件:', dbPath)

const db = new Database(dbPath)

// 检查需要回填的任务
const nullAuthorUidCount = db.query('SELECT COUNT(*) as count FROM tasks WHERE author_uid IS NULL AND type = "author"').get() as { count: number }
console.log('📊 需要回填的 author 类型任务数:', nullAuthorUidCount.count)

if (nullAuthorUidCount.count === 0) {
  console.log('✅ 所有 author 类型任务的 author_uid 都已填充')
  db.close()
  process.exit(0)
}

// 开始事务
db.run('BEGIN TRANSACTION')

try {
  // 对于 type='author' 的任务，target_id 就是 author_uid
  const result = db.run(`
    UPDATE tasks 
    SET author_uid = target_id 
    WHERE type = 'author' AND author_uid IS NULL
  `)
  
  console.log(`✅ 成功更新 ${result.changes} 个任务的 author_uid`)
  
  // 提交事务
  db.run('COMMIT')
  
  // 验证结果
  const remainingNull = db.query('SELECT COUNT(*) as count FROM tasks WHERE author_uid IS NULL AND type = "author"').get() as { count: number }
  console.log('📊 剩余未填充的 author_uid:', remainingNull.count)
  
  if (remainingNull.count === 0) {
    console.log('✅ 所有 author 类型任务的 author_uid 都已填充')
  }
  
} catch (err: any) {
  // 回滚事务
  db.run('ROLLBACK')
  console.error('❌ 回填失败:', err.message)
  process.exit(1)
} finally {
  db.close()
}



