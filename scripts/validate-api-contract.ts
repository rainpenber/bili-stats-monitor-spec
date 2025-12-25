// T012: 接口契约验证脚本 - 自动检测前后端接口不匹配
import { readFileSync } from 'fs'
import { globSync } from 'glob'
import YAML from 'yaml'

interface ContractViolation {
  type: 'missing-in-frontend' | 'missing-in-openapi' | 'aligned'
  endpoint: { method: string; path: string }
  severity: 'error' | 'warning' | 'info'
  description: string
}

/**
 * 从前端代码中提取 API 端点
 */
function extractFrontendEndpoints(): Set<string> {
  const endpoints = new Set<string>()
  
  try {
    const apiFiles = globSync('frontend/web/src/lib/api*.ts')
    
    for (const file of apiFiles) {
      const content = readFileSync(file, 'utf8')
      
      // 提取 http.get/post/put/patch/delete 调用（包括 await 和不带 await 的）
      const httpCallRegex = /(?:await\s+)?http\.(get|post|put|patch|delete)(?:<[^>]*>)?\([`'"]([^`'"]+)[`'"]/g
      let match
      
      while ((match = httpCallRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        let path = match[2]
        
        // 规范化路径（移除查询参数）
        path = path.split('?')[0]
        
        // 替换模板字符串变量为对应的路径参数
        // ${bv} -> {bv}, ${uid} -> {uid}, ${id} -> {id}, ${sessionId} -> {session_id}
        path = path.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          // 将驼峰命名转为下划线命名（与OpenAPI保持一致）
          const paramName = varName.replace(/([A-Z])/g, '_$1').toLowerCase()
          return `{${paramName}}`
        })
        
        endpoints.add(`${method} ${path}`)
      }
    }
  } catch (error) {
    console.error('Error extracting frontend endpoints:', error)
  }
  
  return endpoints
}

/**
 * 从 OpenAPI 规范中提取端点
 */
function extractOpenAPIEndpoints(): Set<string> {
  const endpoints = new Set<string>()
  
  try {
    const openapi = YAML.parse(
      readFileSync('specs/001-bilibili-monitor/api/openapi.yaml', 'utf8')
    )
    
    for (const [path, methods] of Object.entries(openapi.paths || {})) {
      for (const method of Object.keys(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          endpoints.add(`${method.toUpperCase()} ${path}`)
        }
      }
    }
  } catch (error) {
    console.error('Error extracting OpenAPI endpoints:', error)
  }
  
  return endpoints
}

/**
 * 验证接口契约
 */
function validateContract(): ContractViolation[] {
  const frontend = extractFrontendEndpoints()
  const openapi = extractOpenAPIEndpoints()
  const violations: ContractViolation[] = []
  
  console.log(`\n📊 检测到前端端点: ${frontend.size} 个`)
  console.log(`📊 检测到 OpenAPI 端点: ${openapi.size} 个\n`)
  
  // 检查前端调用但 OpenAPI 未定义
  for (const endpoint of frontend) {
    if (!openapi.has(endpoint)) {
      const [method, path] = endpoint.split(' ')
      violations.push({
        type: 'missing-in-openapi',
        endpoint: { method, path },
        severity: 'error',
        description: `前端调用了 ${endpoint}，但 OpenAPI 中未定义此端点`
      })
    } else {
      const [method, path] = endpoint.split(' ')
      violations.push({
        type: 'aligned',
        endpoint: { method, path },
        severity: 'info',
        description: `${endpoint} 已对齐`
      })
    }
  }
  
  // 检查 OpenAPI 定义但前端未使用
  for (const endpoint of openapi) {
    if (!frontend.has(endpoint)) {
      const [method, path] = endpoint.split(' ')
      violations.push({
        type: 'missing-in-frontend',
        endpoint: { method, path },
        severity: 'warning',
        description: `OpenAPI 定义了 ${endpoint}，但前端未实现调用函数`
      })
    }
  }
  
  return violations
}

// 运行验证
const violations = validateContract()

const errors = violations.filter(v => v.severity === 'error')
const warnings = violations.filter(v => v.severity === 'warning')
const aligned = violations.filter(v => v.severity === 'info')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 接口契约验证报告')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log(`✅ 已对齐: ${aligned.length}`)
console.log(`⚠️  警告: ${warnings.length}`)
console.log(`❌ 错误: ${errors.length}\n`)

if (errors.length > 0) {
  console.log('❌ 错误列表（前端调用但 OpenAPI 未定义）:\n')
  for (const v of errors) {
    console.log(`   ${v.endpoint.method} ${v.endpoint.path}`)
    console.log(`   → ${v.description}\n`)
  }
}

if (warnings.length > 0) {
  console.log('⚠️  警告列表（OpenAPI 定义但前端未使用）:\n')
  for (const v of warnings) {
    console.log(`   ${v.endpoint.method} ${v.endpoint.path}`)
    console.log(`   → ${v.description}\n`)
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if (errors.length > 0) {
  console.log('💡 建议: 请在 OpenAPI 规范中添加缺失的端点定义\n')
  process.exit(1)
} else if (warnings.length > 0) {
  console.log('💡 建议: 请在前端 API 文件中补全缺失的函数\n')
  console.log('   参考: specs/003-integration-test-suite/contracts/test-api-coverage.md\n')
  process.exit(0)
} else {
  console.log('✅ 所有接口已对齐！\n')
  process.exit(0)
}

