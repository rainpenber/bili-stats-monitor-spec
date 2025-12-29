/**
 * 修复author_uid字段的脚本
 * 
 * 将除了BV号为 BV1aHrLYuECp 和 BV19jr4Y3ESZ 以外的全部视频task的author_uid设置为3493141386627335（狐正正）
 */

import { Database } from 'bun:sqlite'
import { join } from 'path'

const dbPath = join(process.cwd(), 'data', 'dev', 'bili-stats-dev.db')
const db = new Database(dbPath)

const TARGET_AUTHOR_UID = '3493141386627335'
const EXCLUDED_BVS = ['BV1aHrLYuECp', 'BV19jr4Y3ESZ']

try {
  console.log('开始修复author_uid字段...')
  
  // 查询需要更新的任务
  const tasksToUpdate = db.query<{ id: string; target_id: string; author_uid: string | null }, []>(
    `SELECT id, target_id, author_uid FROM tasks 
     WHERE type = 'video' 
     AND target_id NOT IN (?, ?)`
  ).all(EXCLUDED_BVS[0], EXCLUDED_BVS[1])
  
  console.log(`找到 ${tasksToUpdate.length} 个需要更新的视频任务`)
  
  // 更新author_uid
  const updateStmt = db.prepare(`
    UPDATE tasks 
    SET author_uid = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `)
  
  let updatedCount = 0
  for (const task of tasksToUpdate) {
    updateStmt.run(TARGET_AUTHOR_UID, task.id)
    updatedCount++
  }
  
  console.log(`成功更新 ${updatedCount} 个任务的author_uid为 ${TARGET_AUTHOR_UID}`)
  
  // 验证更新结果
  const verifyResult = db.query<{ count: number }, []>(
    `SELECT COUNT(*) as count FROM tasks 
     WHERE type = 'video' 
     AND target_id NOT IN (?, ?)
     AND author_uid = ?`
  ).get(EXCLUDED_BVS[0], EXCLUDED_BVS[1], TARGET_AUTHOR_UID) as { count: number }
  
  console.log(`验证：${verifyResult.count} 个任务已正确设置author_uid`)
  
} catch (error) {
  console.error('修复失败:', error)
  process.exit(1)
} finally {
  db.close()
}

