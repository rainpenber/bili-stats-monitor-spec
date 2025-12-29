import type { Context } from 'hono'

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export function success<T>(c: Context, data: T, message = 'success', status = 200) {
  return c.json<ApiResponse<T>>(
    {
      code: 0,
      message,
      data,
    },
    status
  )
}

export function error(c: Context, code: number, message: string, detail?: any, status = 200) {
  return c.json<ApiResponse>(
    {
      code,
      message,
      data: detail,
    },
    status
  )
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
} as const

