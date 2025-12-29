import { defineConfig } from 'drizzle-kit'

// Auto-detect database type from environment
const dbType = process.env.DB_TYPE || 'sqlite'

const config = dbType === 'postgres' 
  ? {
      schema: './src/db/schema-pg.ts',
      out: './src/db/migrations',
      dialect: 'postgresql' as const,
      dbCredentials: {
        url: process.env.DATABASE_URL || '',
      },
    }
  : {
      schema: './src/db/schema.ts',
      out: './src/db/migrations',
      dialect: 'sqlite' as const,
      driver: 'better-sqlite' as const,
      dbCredentials: {
        url: process.env.SQLITE_PATH || './data/app.db',
      },
    }

export default defineConfig(config)

