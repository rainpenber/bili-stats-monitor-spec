import { Hono } from 'hono'
import type { Context } from 'hono'
import { loadConfig } from './config'
import { createContainer, type ServiceContainer } from './services/container'
import { errorHandler } from './middlewares/error'
import { requestLogger } from './middlewares/logger'
import { success } from './utils/response'
import { createAccountsRoutes } from './routes/accounts'

const config = loadConfig()
const container = createContainer(config)

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
app.route('/api/v1/accounts', createAccountsRoutes(container.db))

const port = config.port

console.log(`🚀 Server running on http://localhost:${port}`)
console.log(`📦 Database: ${config.database.type}`)

export default {
  port,
  fetch: app.fetch,
}

