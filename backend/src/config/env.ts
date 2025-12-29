import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
  SQLITE_PATH: z.string().default('./data/app.db'),
  DATABASE_URL: z.string().optional(),
  
  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Encryption (optional in development, required in production)
  ENCRYPT_KEY: z.string().min(32, 'ENCRYPT_KEY must be at least 32 characters').optional(),
  
  // Bili
  BILI_USER_AGENT: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }
  
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ Environment variable validation failed:')
    console.error(result.error.format())
    throw new Error('Invalid environment variables')
  }
  
  cachedEnv = result.data
  return cachedEnv
}

