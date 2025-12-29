import { Database } from 'bun:sqlite'
import { join } from 'path'
import { existsSync, copyFileSync } from 'fs'

const dbPath = join(process.cwd(), 'backend/data/dev/bili-stats-dev.db')
const backupPath = join(process.cwd(), 'backend/data/dev/bili-stats-dev.db.backup')

console.log('📦 恢复任务数据...')
console.log('📦 数据库文件:', dbPath)
console.log('📦 备份文件:', backupPath)

// 检查备份文件是否存在
if (!existsSync(backupPath)) {
  console.error('❌ 备份文件不存在:', backupPath)
  process.exit(1)
}

// 打开备份数据库
const backupDb = new Database(backupPath)
const backupTaskCount = backupDb.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
console.log('📊 备份文件 Tasks表记录数:', backupTaskCount.count)

if (backupTaskCount.count === 0) {
  console.error('❌ 备份文件中没有任务数据')
  backupDb.close()
  process.exit(1)
}

// 打开当前数据库
if (!existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath)
  backupDb.close()
  process.exit(1)
}

const db = new Database(dbPath)

// 检查当前数据库中的任务数
const currentTaskCount = db.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
console.log('📊 当前数据库 Tasks表记录数:', currentTaskCount.count)

// 从备份中读取所有任务
const backupTasks = backupDb.query('SELECT * FROM tasks').all() as any[]
console.log(`\n📋 从备份中读取 ${backupTasks.length} 个任务`)

// 开始事务
db.run('BEGIN TRANSACTION')

try {
  // 清空当前tasks表（可选，如果不想保留现有数据）
  if (currentTaskCount.count > 0) {
    console.log('⚠️  当前数据库中有任务，将清空后恢复备份数据')
    db.run('DELETE FROM tasks')
  }
  
  // 插入备份的任务
  let inserted = 0
  for (const task of backupTasks) {
    try {
      // 构建INSERT语句
      const columns = Object.keys(task).join(', ')
      const placeholders = Object.keys(task).map(() => '?').join(', ')
      const values = Object.values(task)
      
      db.run(`INSERT INTO tasks (${columns}) VALUES (${placeholders})`, ...values)
      inserted++
    } catch (err: any) {
      console.error(`⚠️  插入任务失败 (id: ${task.id}):`, err.message)
    }
  }
  
  // 提交事务
  db.run('COMMIT')
  
  console.log(`\n✅ 成功恢复 ${inserted}/${backupTasks.length} 个任务`)
  
  // 验证恢复结果
  const newTaskCount = db.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
  console.log('📊 恢复后 Tasks表记录数:', newTaskCount.count)
  
} catch (err: any) {
  // 回滚事务
  db.run('ROLLBACK')
  console.error('❌ 恢复失败:', err.message)
  process.exit(1)
} finally {
  db.close()
  backupDb.close()
}



