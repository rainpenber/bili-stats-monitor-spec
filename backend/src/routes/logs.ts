import { Hono } from 'hono'
import { success, error, ErrorCodes } from '../utils/response'
import { LogService, type LogLevel } from '../services/log'
import type { DrizzleInstance } from '../db'

/**
 * 日志路由
 */
export function createLogsRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const logService = new LogService(db)

  /**
   * GET /api/v1/logs - 查询日志
   */
  app.get('/', async (c) => {
    try {
      const date = c.req.query('date') // YYYY-MM-DD
      const level = c.req.query('level') as LogLevel | undefined
      const source = c.req.query('source')
      const keyword = c.req.query('keyword')
      const limit = parseInt(c.req.query('limit') || '100')
      const offset = parseInt(c.req.query('offset') || '0')
      const order = (c.req.query('order') || 'desc') as 'asc' | 'desc'

      // 构建查询过滤器
      let from: Date | undefined
      let to: Date | undefined

      if (date) {
        from = new Date(date)
        to = new Date(date)
        to.setDate(to.getDate() + 1)
      }

      const logs = await logService.query({
        from,
        to,
        levels: level ? [level] : undefined,
        sources: source ? [source] : undefined,
        keyword,
        order,
        limit,
        offset,
      })

      return success(c, {
        logs,
        pagination: {
          limit,
          offset,
          total: logs.length,
        },
      })
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to get logs', undefined, 500)
    }
  })

  /**
   * GET /api/v1/logs/download - 下载日志
   * 
   * 返回日志文件（CSV 格式）
   */
  app.get('/download', async (c) => {
    try {
      const date = c.req.query('date')
      const level = c.req.query('level') as LogLevel | undefined

      // 构建查询过滤器
      let from: Date | undefined
      let to: Date | undefined

      if (date) {
        from = new Date(date)
        to = new Date(date)
        to.setDate(to.getDate() + 1)
      }

      const logs = await logService.query({
        from,
        to,
        levels: level ? [level] : undefined,
        order: 'desc',
      })

      // 生成 CSV
      const csvLines = ['ID,Timestamp,Level,Source,Message,Context']
      for (const log of logs) {
        const context = log.context ? JSON.stringify(log.context) : ''
        const timestamp = log.ts instanceof Date ? log.ts.toISOString() : new Date(log.ts).toISOString()
        csvLines.push(
          `"${log.id}","${timestamp}","${log.level}","${log.source}","${log.message.replace(/"/g, '""')}","${context.replace(/"/g, '""')}"`
        )
      }

      const csv = csvLines.join('\n')

      // 设置响应头
      c.header('Content-Type', 'text/csv; charset=utf-8')
      c.header('Content-Disposition', `attachment; filename="logs-${date || 'all'}.csv"`)

      return c.body(csv)
    } catch (err: any) {
      return error(c, ErrorCodes.INTERNAL_ERROR, err.message || 'Failed to download logs', undefined, 500)
    }
  })

  return app
}

