import type { Env } from './env'

export type DbType = 'sqlite' | 'postgres'

export interface DbConfig {
  type: DbType
  sqlitePath?: string
  postgresUrl?: string
}

export function getDbConfig(env: Env): DbConfig {
  if (env.DB_TYPE === 'postgres') {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when DB_TYPE=postgres')
    }
    return {
      type: 'postgres',
      postgresUrl: env.DATABASE_URL,
    }
  }
  
  return {
    type: 'sqlite',
    sqlitePath: env.SQLITE_PATH,
  }
}

