import { Hono } from 'hono'
import { desc, and, eq, like, gte, lte } from 'drizzle-orm'
import { success, error, ErrorCodes } from '../utils/response'
import { systemLogs } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * 日志路由
 */
export function createLogsRoutes(db: DrizzleInstance) {
  const app = new Hono()

  /**
   * GET /api/v1/logs - 查询日志
   */
  app.get('/', async (c) => {
    try {
      const date = c.req.query('date') // YYYY-MM-DD
      const level = c.req.query('level') as 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | undefined
      const source = c.req.query('source')
      const keyword = c.req.query('keyword')
      const limit = parseInt(c.req.query('limit') || '100')
      const offset = parseInt(c.req.query('offset') || '0')
      const order = (c.req.query('order') || 'desc') as 'asc' | 'desc'

      const conditions = []

      // 日期过滤
      if (date) {
        const startDate = new Date(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)

        conditions.push(gte(systemLogs.timestamp, startDate))
        conditions.push(lte(systemLogs.timestamp, endDate))
      }

      // 级别过滤
      if (level) {
        conditions.push(eq(systemLogs.level, level))
      }

      // 来源过滤
      if (source) {
        conditions.push(eq(systemLogs.source, source))
      }

      // 关键词搜索
      if (keyword) {
        conditions.push(like(systemLogs.message, `%${keyword}%`))
      }

      // 构建查询
      let query = db.select().from(systemLogs)

      if (conditions.length > 0) {
        query = query.where(and(...conditions)!) as any
      }

      // 排序
      if (order === 'asc') {
        query = query.orderBy(systemLogs.timestamp) as any
      } else {
        query = query.orderBy(desc(systemLogs.timestamp)) as any
      }

      // 分页
      query = query.limit(limit).offset(offset) as any

      const logs = await query

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
      const level = c.req.query('level')

      const conditions = []

      if (date) {
        const startDate = new Date(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)

        conditions.push(gte(systemLogs.timestamp, startDate))
        conditions.push(lte(systemLogs.timestamp, endDate))
      }

      if (level) {
        conditions.push(eq(systemLogs.level, level as any))
      }

      let query = db.select().from(systemLogs)

      if (conditions.length > 0) {
        query = query.where(and(...conditions)!) as any
      }

      query = query.orderBy(desc(systemLogs.timestamp)) as any

      const logs = await query

      // 生成 CSV
      const csvLines = ['ID,Timestamp,Level,Source,Message,Metadata']
      for (const log of logs) {
        const metadata = log.metadata ? JSON.stringify(log.metadata) : ''
        csvLines.push(
          `"${log.id}","${log.timestamp.toISOString()}","${log.level}","${log.source}","${log.message.replace(/"/g, '""')}","${metadata.replace(/"/g, '""')}"`
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

