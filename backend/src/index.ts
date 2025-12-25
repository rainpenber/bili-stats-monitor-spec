import { Hono } from 'hono'
import type { Context } from 'hono'
import { loadConfig } from './config'
import { createContainer, type ServiceContainer } from './services/container'
import { errorHandler } from './middlewares/error'
import { requestLogger } from './middlewares/logger'
import { success } from './utils/response'
import { createAccountsRoutes } from './routes/accounts'
import { createTasksRoutes } from './routes/tasks'
import { createMetricsRoutes } from './routes/metrics'
import { createNotificationsRoutes } from './routes/notifications'
import { createAuthRoutes } from './routes/auth'
import { createSettingsRoutes } from './routes/settings'
import { createLogsRoutes } from './routes/logs'
import { createSchedulerRoutes } from './routes/scheduler'
import { initializeApp } from './init'

const config = loadConfig()
const container = createContainer(config)

// 初始化应用（在启动服务之前）
await initializeApp(container.db)

// 启动调度器
console.log('🚀 启动任务调度器...')
await container.scheduler.initializeTaskSchedules()
container.scheduler.start()

type Env = {
  Variables: {
    container: ServiceContainer
  }
}

const app = new Hono<Env>()

// Inject container into context
app.use('*', async (c: Context<Env>, next) => {
  c.set('container', container)
  await next()
})

// Middlewares
app.use('*', requestLogger)
app.onError((err, c) => errorHandler(err, c))

// Health check endpoint
app.get('/health', (c) => {
  return success(c, { status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.route('/api/v1/auth', createAuthRoutes(container.db, config.jwtSecret))
app.route('/api/v1/settings', createSettingsRoutes(container.db, config.jwtSecret))
app.route('/api/v1/accounts', createAccountsRoutes(container.db))
app.route('/api/v1/tasks', createTasksRoutes(container.db))
app.route('/api/v1/tasks', createMetricsRoutes(container.db))
app.route('/api/v1/notifications', createNotificationsRoutes(container.db))
app.route('/api/v1/logs', createLogsRoutes(container.db))
app.route('/api/v1/scheduler', createSchedulerRoutes(container.scheduler))

const port = config.port

// Start the server
const server = Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`🚀 Server running on http://localhost:${port}`)
console.log(`📦 Database: ${config.database.type}`)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 收到 SIGINT 信号，正在关闭服务器...')
  container.scheduler.stop()
  server.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 收到 SIGTERM 信号，正在关闭服务器...')
  container.scheduler.stop()
  server.stop()
  process.exit(0)
})

export default server

