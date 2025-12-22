import { loadEnv } from './env'
import { getDbConfig, type DbConfig } from './database'

export interface AppConfig {
  port: number
  nodeEnv: string
  database: DbConfig
  jwt: {
    secret: string
    expiresIn: string
  }
  encryption: {
    key: string
  }
  bili: {
    userAgent: string
  }
}

export function loadConfig(): AppConfig {
  const env = loadEnv()
  
  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    database: getDbConfig(env),
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    encryption: {
      key: env.ENCRYPT_KEY,
    },
    bili: {
      userAgent: env.BILI_USER_AGENT,
    },
  }
}

