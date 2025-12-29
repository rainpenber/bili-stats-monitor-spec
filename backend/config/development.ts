/**
 * 开发环境配置
 * Development Environment Configuration
 */

export const developmentConfig = {
  // ===== 应用配置 =====
  app: {
    nodeEnv: 'development',
    port: 3000,
  },

  // ===== 数据库配置 =====
  database: {
    type: 'sqlite' as const,
    sqlitePath: './data/dev/bili-stats-dev.db',
  },

  // ===== JWT密钥配置 =====
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production-12345678',
    expiresIn: '7d',
  },

  // ===== 数据加密配置 =====
  encryption: {
    // 用于加密敏感数据（账号cookie、通知密码等）
    // 开发环境使用固定值，方便调试
    key: process.env.ENCRYPT_KEY || '9871a122c24abeae9cb1171f75120edd3acf46b655f4711a73edcb82eadcc674',
  },

  // ===== Bilibili API配置 =====
  bili: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    requestInterval: 1000, // 毫秒
    requestTimeout: 10000, // 毫秒
  },

  // ===== 媒体资源配置 =====
  media: {
    storagePath: './data/dev/media',
    cacheExpiry: 168, // 小时
  },

  // ===== 日志配置 =====
  logging: {
    level: 'debug' as const,
    filePath: './data/dev/logs',
    retentionDays: 7,
  },

  // ===== CORS配置 =====
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  },

  // ===== 任务调度配置 =====
  scheduler: {
    minCollectionInterval: 1, // 分钟
    maxConcurrentTasks: 5,
  },

  // ===== 通知配置 =====
  notification: {
    configPath: './data/dev/notifications.json',
  },

  // ===== 性能配置 =====
  performance: {
    enableQueryCache: true,
    cacheTTL: 300, // 秒
  },

  // ===== 调试配置 =====
  debug: {
    enableDetailedErrors: true,
    enableApiLogging: true,
    enablePerformanceMonitoring: true,
  },

  // ===== 前端配置 =====
  frontend: {
    distPath: '../frontend/web/dist',
  },

  // ===== 开发工具配置 =====
  devTools: {
    enableHotReload: true,
    enableMockData: false,
  },
}

export type AppConfig = typeof developmentConfig

