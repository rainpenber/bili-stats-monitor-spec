/**
 * 生产环境配置
 * Production Environment Configuration
 */

export const productionConfig = {
  // ===== 应用配置 =====
  app: {
    nodeEnv: 'production',
    port: parseInt(process.env.PORT || '3000', 10),
  },

  // ===== 数据库配置 =====
  database: {
    type: (process.env.DB_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    sqlitePath: process.env.SQLITE_PATH || './data/prod/bili-stats.db',
    postgresUrl: process.env.DATABASE_URL,
  },

  // ===== JWT密钥配置 =====
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET must be set in production environment')
    })(),
    expiresIn: '7d',
  },

  // ===== 数据加密配置 =====
  encryption: {
    // 用于加密敏感数据（账号cookie、通知密码等）
    // 生产环境必须设置，用于保护敏感信息
    key: process.env.ENCRYPT_KEY || (() => {
      throw new Error('ENCRYPT_KEY must be set in production environment')
    })(),
  },

  // ===== Bilibili API配置 =====
  bili: {
    userAgent: process.env.BILI_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    requestInterval: parseInt(process.env.BILI_REQUEST_INTERVAL || '2000', 10), // 生产环境更保守
    requestTimeout: parseInt(process.env.BILI_REQUEST_TIMEOUT || '15000', 10),
  },

  // ===== 媒体资源配置 =====
  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH || './data/prod/media',
    cacheExpiry: parseInt(process.env.MEDIA_CACHE_EXPIRY || '168', 10),
  },

  // ===== 日志配置 =====
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    filePath: process.env.LOG_FILE_PATH || './data/prod/logs',
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
  },

  // ===== CORS配置 =====
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://yourdomain.com'],
    credentials: true,
  },

  // ===== 任务调度配置 =====
  scheduler: {
    minCollectionInterval: parseInt(process.env.MIN_COLLECTION_INTERVAL || '5', 10),
    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '10', 10),
  },

  // ===== 通知配置 =====
  notification: {
    configPath: process.env.NOTIFICATION_CONFIG_PATH || './data/prod/notifications.json',
  },

  // ===== 性能配置 =====
  performance: {
    enableQueryCache: process.env.ENABLE_QUERY_CACHE !== 'false',
    cacheTTL: parseInt(process.env.CACHE_TTL || '600', 10),
  },

  // ===== 调试配置 =====
  debug: {
    enableDetailedErrors: process.env.ENABLE_DETAILED_ERRORS === 'true', // 生产环境默认关闭
    enableApiLogging: process.env.ENABLE_API_LOGGING === 'true', // 生产环境默认关闭
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
  },

  // ===== 前端配置 =====
  frontend: {
    distPath: process.env.FRONTEND_DIST_PATH || '../frontend/web/dist',
  },

  // ===== 开发工具配置 =====
  devTools: {
    enableHotReload: false, // 生产环境禁用
    enableMockData: false, // 生产环境禁用
  },
}

export type AppConfig = typeof productionConfig

