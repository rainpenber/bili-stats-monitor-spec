import type { Context, Next } from 'hono'
import { jwtVerify } from 'jose'
import { error, ErrorCodes } from '../utils/response'
import { loadConfig } from '../config'

// Skip auth for these paths
const PUBLIC_PATHS = ['/health', '/api/v1/auth/login']

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path
  
  // Skip auth for public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    await next()
    return
  }
  
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(c, ErrorCodes.UNAUTHORIZED, 'Missing or invalid authorization header', undefined, 401)
  }
  
  const token = authHeader.substring(7)
  const config = loadConfig()
  
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.jwt.secret))
    
    // Inject user info into context
    c.set('user', payload)
    await next()
  } catch (err) {
    return error(c, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', undefined, 401)
  }
}

