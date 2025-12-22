#!/usr/bin/env bun
/**
 * 测试数据库连接脚本
 * 用法: bun run scripts/test-db-connection.ts
 */

import { loadConfig } from '../src/config'
import { Database } from 'bun:sqlite'
import postgres from 'postgres'

async function testConnection() {
  try {
    console.log('🔍 检查配置...')
    const config = loadConfig()
    
    console.log(`📦 数据库类型: ${config.database.type}`)
    
    if (config.database.type === 'postgres') {
      console.log(`🔗 连接字符串: ${config.database.postgresUrl?.replace(/:[^:@]+@/, ':****@')}`)
    } else {
      console.log(`📁 SQLite 路径: ${config.database.sqlitePath}`)
    }
    
    console.log('\n🔌 尝试连接数据库...')
    
    // 直接使用底层客户端测试连接
    if (config.database.type === 'postgres') {
      if (!config.database.postgresUrl) {
        throw new Error('DATABASE_URL is required for PostgreSQL')
      }
      
      // 使用 postgres 客户端直接连接
      const client = postgres(config.database.postgresUrl)
      
      try {
        const result = await client`SELECT version() as version`
        console.log('✅ PostgreSQL 连接成功!')
        if (result && result.length > 0) {
          console.log(`📊 数据库版本: ${result[0].version || 'Unknown'}`)
        }
      } finally {
        await client.end()
      }
    } else {
      // SQLite 测试
      const sqlite = new Database(config.database.sqlitePath || './data/app.db')
      try {
        const result = sqlite.query('SELECT sqlite_version() as version').get()
        console.log('✅ SQLite 连接成功!')
        if (result) {
          console.log(`📊 SQLite 版本: ${(result as any).version || 'Unknown'}`)
        }
      } finally {
        sqlite.close()
      }
    }
    
    console.log('\n✨ 数据库连接测试通过!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 数据库连接失败:')
    console.error(error instanceof Error ? error.message : error)
    
    if (error instanceof Error && error.message.includes('getSQL')) {
      console.error('\n💡 这可能是 Drizzle ORM 版本兼容性问题')
    }
    
    console.error('\n💡 请检查:')
    console.error('  1. .env 文件中的 DATABASE_URL 是否正确')
    console.error('  2. 服务器上的 PostgreSQL 容器是否运行')
    console.error('  3. 防火墙是否允许连接')
    console.error('  4. 用户名和密码是否正确')
    console.error('  5. 网络连接是否正常 (ping 192.168.0.124)')
    process.exit(1)
  }
}

testConnection()

