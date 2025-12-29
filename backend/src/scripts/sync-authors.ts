import { Database } from 'bun:sqlite'
import { join } from 'path'
import { biliClient } from '../services/bili/client'

// 获取数据库路径（从backend目录或项目根目录）
const dbPath = process.cwd().endsWith('backend')
  ? join(process.cwd(), 'data/dev/bili-stats-dev.db')
  : join(process.cwd(), 'backend/data/dev/bili-stats-dev.db')

console.log('📦 同步博主信息到 authors 表...')
console.log('📦 数据库文件:', dbPath)

const db = new Database(dbPath)

// 检查authors表是否存在
try {
  db.query('SELECT 1 FROM authors LIMIT 1').get()
} catch (err: any) {
  console.error('❌ authors 表不存在，请先运行数据库迁移')
  db.close()
  process.exit(1)
}

// 从tasks表提取所有不同的author_uid
const authorUids = db.query<{ author_uid: string }, []>(
  'SELECT DISTINCT author_uid FROM tasks WHERE author_uid IS NOT NULL AND author_uid != ""'
).all()

console.log(`📊 找到 ${authorUids.length} 个不同的博主UID`)

if (authorUids.length === 0) {
  console.log('✅ 没有需要同步的博主')
  db.close()
  process.exit(0)
}

// 开始事务
db.run('BEGIN TRANSACTION')

let successCount = 0
let errorCount = 0
const errors: Array<{ uid: string; error: string }> = []

try {
  for (const { author_uid } of authorUids) {
    const uid = author_uid
    
    try {
      // 检查是否已存在
      const existing = db.query<{ uid: string }, [string]>(
        'SELECT uid FROM authors WHERE uid = ?'
      ).get(uid)
      
      if (existing) {
        console.log(`⏭️  跳过已存在的博主: ${uid}`)
        continue
      }
      
      // 调用B站API获取用户信息
      console.log(`🔄 获取博主信息: ${uid}...`)
      const userInfo = await biliClient.getUserInfo(parseInt(uid, 10))
      
      // 插入或更新authors表
      db.run(
        `INSERT INTO authors (uid, nickname, avatar, updated_at, created_at) 
         VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
         ON CONFLICT(uid) DO UPDATE SET 
           nickname = excluded.nickname,
           avatar = excluded.avatar,
           updated_at = strftime('%s', 'now')`,
        [uid, userInfo.nickname || null, userInfo.avatar || null]
      )
      
      console.log(`✅ 同步成功: ${uid} - ${userInfo.nickname || '未知'}`)
      successCount++
      
      // 避免请求过快，添加延迟
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (err: any) {
      console.error(`❌ 同步失败 ${uid}:`, err.message)
      errorCount++
      errors.push({ uid, error: err.message })
      
      // 即使失败也插入记录（nickname和avatar为NULL）
      try {
        db.run(
          `INSERT INTO authors (uid, nickname, avatar, updated_at, created_at) 
           VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
           ON CONFLICT(uid) DO NOTHING`,
          [uid, null, null]
        )
      } catch (insertErr: any) {
        console.error(`❌ 插入失败记录失败 ${uid}:`, insertErr.message)
      }
    }
  }
  
  // 提交事务
  db.run('COMMIT')
  
  console.log('\n📊 同步结果:')
  console.log(`✅ 成功: ${successCount}`)
  console.log(`❌ 失败: ${errorCount}`)
  
  if (errors.length > 0) {
    console.log('\n❌ 失败详情:')
    errors.forEach(({ uid, error }) => {
      console.log(`  - ${uid}: ${error}`)
    })
  }
  
} catch (err: any) {
  // 回滚事务
  db.run('ROLLBACK')
  console.error('❌ 同步失败:', err.message)
  process.exit(1)
} finally {
  db.close()
}

console.log('✅ 博主信息同步完成')

