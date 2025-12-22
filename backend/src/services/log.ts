import type { DrizzleInstance } from '../db'
import { systemLogs } from '../db/schema'
import { and, gte, lte, sql, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'

export interface LogQuery {
  from?: Date
  to?: Date
  levels?: LogLevel[]
  sources?: string[]
  keyword?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export class LogService {
  constructor(private db: DrizzleInstance) {}
  
  async log(level: LogLevel, source: string, message: string, context?: any) {
    await (this.db.insert(systemLogs) as any).values({
      id: nanoid(),
      ts: new Date(),
      level,
      source,
      message,
      context: context ? JSON.stringify(context) : null,
    })
  }
  
  async query(filters: LogQuery) {
    const conditions: any[] = []
    
    if (filters.from) {
      conditions.push(gte(systemLogs.ts, filters.from))
    }
    if (filters.to) {
      conditions.push(lte(systemLogs.ts, filters.to))
    }
    if (filters.levels && filters.levels.length > 0) {
      conditions.push(inArray(systemLogs.level, filters.levels))
    }
    if (filters.sources && filters.sources.length > 0) {
      conditions.push(inArray(systemLogs.source, filters.sources))
    }
    if (filters.keyword) {
      conditions.push(sql`${systemLogs.message} LIKE ${`%${filters.keyword}%`}`)
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const orderBy = filters.order === 'asc' 
      ? sql`${systemLogs.ts} ASC`
      : sql`${systemLogs.ts} DESC`
    
    return await (this.db
      .select()
      .from(systemLogs)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0) as any) as any[]
  }
  
  async download(filters: LogQuery): Promise<string> {
    const logs = await this.query({ ...filters, limit: 10000 })
    
    // Format as CSV
    const headers = 'timestamp,level,source,message,context\n'
    const rows = logs.map((log: any) => {
      const ts = log.ts instanceof Date ? log.ts.toISOString() : new Date(log.ts).toISOString()
      const context = log.context ? JSON.stringify(log.context) : ''
      return `${ts},${log.level},${log.source},"${log.message.replace(/"/g, '""')}","${context.replace(/"/g, '""')}"`
    }).join('\n')
    
    return headers + rows
  }
}

