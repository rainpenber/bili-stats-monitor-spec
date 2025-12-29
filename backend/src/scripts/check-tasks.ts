import { Database } from 'bun:sqlite'
import { join } from 'path'
import { existsSync, copyFileSync } from 'fs'

const dbPath = join(process.cwd(), 'backend/data/dev/bili-stats-dev.db')
const backupPath = join(process.cwd(), 'backend/data/dev/bili-stats-dev.db.backup')

console.log('📦 检查数据库:', dbPath)
console.log('📦 备份文件:', backupPath)

// 检查数据库文件是否存在
if (!existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)

// 检查tasks表数据
const taskCount = db.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
console.log('\n📊 当前数据库 Tasks表记录数:', taskCount.count)

if (taskCount.count > 0) {
  // 显示一些示例数据
  const sampleTasks = db.query('SELECT id, type, target_id, title, author_uid FROM tasks LIMIT 5').all() as any[]
  console.log('\n📋 示例任务:')
  sampleTasks.forEach((task, i) => {
    console.log(`  ${i + 1}. [${task.type}] ${task.title || task.target_id} (author_uid: ${task.author_uid || 'NULL'})`)
  })
} else {
  console.log('⚠️  Tasks表为空!')
  
  // 检查备份文件
  if (existsSync(backupPath)) {
    console.log('\n📦 发现备份文件，检查备份数据...')
    const backupDb = new Database(backupPath)
    const backupTaskCount = backupDb.query('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
    console.log('📊 备份文件 Tasks表记录数:', backupTaskCount.count)
    
    if (backupTaskCount.count > 0) {
      console.log('\n✅ 备份文件中有数据，可以恢复')
      console.log('   要恢复备份，请运行: bun run backend/src/scripts/restore-tasks.ts')
    } else {
      console.log('⚠️  备份文件也是空的')
    }
    backupDb.close()
  } else {
    console.log('⚠️  未找到备份文件')
  }
}

db.close()



