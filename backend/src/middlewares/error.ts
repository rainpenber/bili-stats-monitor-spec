import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { error, ErrorCodes } from '../utils/response'
import { ZodError } from 'zod'

export async function errorHandler(err: Error, c: Context) {
  // Handle HTTPException from Hono
  if (err instanceof HTTPException) {
    return error(c, err.status, err.message, undefined, err.status)
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return error(
      c,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      err.errors,
      422
    )
  }
  
  // Handle unknown errors
  console.error('Unhandled error:', err)
  return error(
    c,
    ErrorCodes.INTERNAL_ERROR,
    err instanceof Error ? err.message : 'Internal server error',
    process.env.NODE_ENV === 'development' ? { stack: err instanceof Error ? err.stack : undefined } : undefined,
    500
  )
}

