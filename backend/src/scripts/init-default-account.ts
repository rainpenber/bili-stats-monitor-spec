import { Database } from 'bun:sqlite'
import { join } from 'path'

const dbPath = join(process.cwd(), 'data/dev/bili-stats-dev.db')
const db = new Database(dbPath)

console.log('📦 连接数据库:', dbPath)

try {
  // 初始化default_account_id
  db.run(`
    INSERT OR IGNORE INTO settings (key, value, updated_at) 
    VALUES ('default_account_id', 'null', strftime('%s', 'now'))
  `)
  
  console.log('✅ default_account_id已初始化')
  
  // 验证
  const result = db.query('SELECT * FROM settings WHERE key="default_account_id"').get()
  console.log('验证:', result)
  
} catch (error) {
  console.error('❌ 初始化失败:', error)
  process.exit(1)
} finally {
  db.close()
}

