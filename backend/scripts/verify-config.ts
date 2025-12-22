#!/usr/bin/env bun
/**
 * 配置验证脚本
 * 验证本地配置与服务器 Docker 配置是否匹配
 */

import { loadConfig } from '../src/config'

console.log('🔍 验证数据库配置...\n')

try {
  const config = loadConfig()
  
  console.log('📋 当前配置:')
  console.log(`   数据库类型: ${config.database.type}`)
  
  if (config.database.type === 'postgres') {
    const url = config.database.postgresUrl || ''
    
    // 解析连接字符串
    const urlMatch = url.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    
    if (!urlMatch) {
      console.error('❌ DATABASE_URL 格式错误')
      process.exit(1)
    }
    
    const [, username, password, host, port, database] = urlMatch
    
    console.log(`   用户名: ${username}`)
    console.log(`   密码: ${password === 'your_password' ? '⚠️  需要替换为实际密码' : '***'}`)
    console.log(`   主机: ${host}`)
    console.log(`   端口: ${port}`)
    console.log(`   数据库: ${database}`)
    
    console.log('\n✅ 服务器 Docker 配置要求:')
    console.log('   测试环境:')
    console.log('     - 用户名: bili_monitor_test')
    console.log('     - 端口: 5555')
    console.log('     - 数据库: bili_monitor_test')
    console.log('   生产环境:')
    console.log('     - 用户名: bili_monitor_prod')
    console.log('     - 端口: 5556')
    console.log('     - 数据库: bili_monitor_prod')
    
    console.log('\n🔍 配置匹配检查:')
    
    let allMatch = true
    
    // 检查测试环境配置
    if (port === '5555') {
      if (username !== 'bili_monitor_test') {
        console.error(`   ❌ 用户名不匹配: 期望 bili_monitor_test, 实际 ${username}`)
        allMatch = false
      } else {
        console.log('   ✅ 测试环境用户名匹配')
      }
      
      if (database !== 'bili_monitor_test') {
        console.error(`   ❌ 数据库名不匹配: 期望 bili_monitor_test, 实际 ${database}`)
        allMatch = false
      } else {
        console.log('   ✅ 测试环境数据库名匹配')
      }
      
      if (port !== '5555') {
        console.error(`   ❌ 端口不匹配: 期望 5555, 实际 ${port}`)
        allMatch = false
      } else {
        console.log('   ✅ 测试环境端口匹配')
      }
    }
    
    // 检查生产环境配置
    if (port === '5556') {
      if (username !== 'bili_monitor_prod') {
        console.error(`   ❌ 用户名不匹配: 期望 bili_monitor_prod, 实际 ${username}`)
        allMatch = false
      } else {
        console.log('   ✅ 生产环境用户名匹配')
      }
      
      if (database !== 'bili_monitor_prod') {
        console.error(`   ❌ 数据库名不匹配: 期望 bili_monitor_prod, 实际 ${database}`)
        allMatch = false
      } else {
        console.log('   ✅ 生产环境数据库名匹配')
      }
      
      if (port !== '5556') {
        console.error(`   ❌ 端口不匹配: 期望 5556, 实际 ${port}`)
        allMatch = false
      } else {
        console.log('   ✅ 生产环境端口匹配')
      }
    }
    
    const needsPassword = password === 'your_password'
    
    if (host !== '192.168.0.124') {
      console.log(`\n⚠️  注意: 主机地址是 ${host}，确保这是正确的服务器 IP`)
    }
    
    console.log('\n📊 验证结果:')
    
    if (!allMatch) {
      console.log('   ❌ 配置不匹配，请检查 .env 文件')
      process.exit(1)
    }
    
    if (needsPassword) {
      console.log('   ⚠️  配置格式正确，但密码仍是占位符')
      console.log('   💡 请将 .env 中的 your_password 替换为服务器 Docker 容器的实际密码')
      console.log('   💡 密码在服务器上的 .env 文件中: POSTGRES_TEST_PASSWORD 或 POSTGRES_PROD_PASSWORD')
      console.log('\n✅ 配置格式验证通过，替换密码后即可连接')
    } else {
      console.log('   ✅ 所有配置匹配！')
      console.log('\n💡 下一步: 运行 "bun run db:test" 测试连接')
    }
  } else {
    console.log('   使用 SQLite 数据库')
    console.log('   ⚠️  当前配置使用 SQLite，如需连接 PostgreSQL，请设置 DB_TYPE=postgres')
  }
  
} catch (error) {
  console.error('\n❌ 配置验证失败:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

