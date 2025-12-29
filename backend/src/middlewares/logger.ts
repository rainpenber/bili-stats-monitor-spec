import type { Context, Next } from 'hono'

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  
  await next()
  
  const duration = Date.now() - start
  const status = c.res.status
  
  // Log to console (will be replaced by LogService in B009)
  console.log(`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms`)
}

