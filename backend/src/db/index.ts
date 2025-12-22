import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { Database } from 'bun:sqlite'
import postgres from 'postgres'
import type { DbConfig } from '../config/database'
import * as schemaSqlite from './schema'
import * as schemaPg from './schema-pg'

export type DrizzleInstance = ReturnType<typeof createDb>

export function createDb(config: DbConfig) {
  if (config.type === 'sqlite') {
    const sqlite = new Database(config.sqlitePath || './data/app.db')
    return drizzleSqlite(sqlite, { schema: schemaSqlite })
  } else {
    if (!config.postgresUrl) {
      throw new Error('PostgreSQL URL is required')
    }
    const client = postgres(config.postgresUrl)
    return drizzlePg(client, { schema: schemaPg })
  }
}

