#!/usr/bin/env bun
/**
 * 修复导入的任务状态
 * 将所有 status='running' 且 accountId=null 的任务停用
 */
import { createDb } from '../src/db'
import { tasks } from '../src/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { loadConfig } from '../src/config'

async function main() {
  console.log('🔧 开始修复导入的任务状态...\n')
  
  // 加载配置
  const config = loadConfig()
  
  // 创建数据库连接
  const dbConfig = {
    type: config.database.type as 'sqlite' | 'postgres',
    sqlitePath: config.database.type === 'sqlite' ? config.database.sqlitePath : undefined,
    postgresUrl: config.database.type === 'postgres' ? config.database.postgresUrl : undefined,
  }
  const db = createDb(dbConfig)
  
  try {
    // 查找所有 status='running' 且 accountId=null 的任务
    const runningTasksWithoutAccount = await db
      .select({ id: tasks.id, type: tasks.type, targetId: tasks.targetId })
      .from(tasks)
      .where(and(
        eq(tasks.status, 'running'),
        isNull(tasks.accountId)
      ))
    
    console.log(`📊 找到 ${runningTasksWithoutAccount.length} 个需要停用的任务\n`)
    
    if (runningTasksWithoutAccount.length === 0) {
      console.log('✅ 没有需要修复的任务')
      return
    }
    
    // 更新这些任务的状态为 'stopped'
    const result = await db
      .update(tasks)
      .set({ 
        status: 'stopped',
        reason: '导入任务自动停用（无关联账号）'
      })
      .where(and(
        eq(tasks.status, 'running'),
        isNull(tasks.accountId)
      ))
    
    console.log(`✅ 成功停用 ${runningTasksWithoutAccount.length} 个任务\n`)
    console.log('📋 这些任务在绑定 Bilibili 账号后可以手动激活')
    
  } catch (error) {
    console.error('❌ 修复失败:', error)
    process.exit(1)
  }
}

main()
