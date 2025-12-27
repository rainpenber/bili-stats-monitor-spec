import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'viewer'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// BiliAccount table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  nickname: text('nickname'),
  sessdata: text('sessdata').notNull(), // Encrypted
  biliJct: text('bili_jct'),
  bindMethod: text('bind_method', { enum: ['cookie', 'qrcode'] }).notNull(),
  status: text('status', { enum: ['valid', 'expired'] }).notNull().default('valid'),
  lastFailures: integer('last_failures').default(0),
  boundAt: integer('bound_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// MonitoringTask table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['video', 'author'] }).notNull(),
  targetId: text('target_id').notNull(), // BV or UID
  title: text('title'),
  cid: text('cid'), // Video CID (for online viewers)
  cidRetries: integer('cid_retries').default(0), // Retry count for CID fetching
  accountId: text('account_id').references(() => accounts.id),
  strategy: text('strategy', { mode: 'json' }).notNull(), // { mode, value?, unit? }
  deadline: integer('deadline', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['running', 'stopped', 'completed', 'failed', 'paused'] }).notNull().default('running'),
  reason: text('reason'), // Pause/failure reason
  tags: text('tags', { mode: 'json' }), // string[]
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
  publishedAt: integer('published_at', { mode: 'timestamp' }), // Video publish time
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// VideoMetrics table
export const videoMetrics = sqliteTable('video_metrics', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  view: integer('view').notNull(),
  online: integer('online'),
  like: integer('like').notNull(),
  coin: integer('coin').notNull(),
  favorite: integer('favorite').notNull(),
  share: integer('share').notNull(),
  danmaku: integer('danmaku').notNull(),
  reply: integer('reply'),
  completionRate: real('completion_rate'), // Optional, only for owned accounts
  avgWatchDuration: real('avg_watch_duration'), // Optional, in seconds
})

// AuthorMetrics table
export const authorMetrics = sqliteTable('author_metrics', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  follower: integer('follower').notNull(),
})

// NotifyChannels table
export const notifyChannels = sqliteTable('notify_channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // onebot, telegram, bark, etc.
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  config: text('config', { mode: 'json' }), // Channel-specific config (encrypted sensitive fields)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// NotifyRules table
export const notifyRules = sqliteTable('notify_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  triggers: text('triggers', { mode: 'json' }).notNull(), // string[]
  channels: text('channels', { mode: 'json' }).notNull(), // string[]
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// SystemLogs table
export const systemLogs = sqliteTable('system_logs', {
  id: text('id').primaryKey(),
  ts: integer('ts', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  level: text('level', { enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] }).notNull(),
  source: text('source').notNull(),
  message: text('message').notNull(),
  context: text('context', { mode: 'json' }), // Optional structured context
})

// Settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// MediaAssets table
export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  targetType: text('target_type', { enum: ['video', 'author'] }).notNull(),
  targetId: text('target_id').notNull(),
  assetType: text('asset_type', { enum: ['cover', 'avatar'] }).notNull(),
  localPath: text('local_path'),
  sourceUrl: text('source_url'),
  lastRefresh: integer('last_refresh', { mode: 'timestamp' }),
  status: text('status', { enum: ['cached', 'failed', 'pending'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// QRCodeSessions table - for Bilibili account binding via QR code
export const qrcodeSessions = sqliteTable('qrcode_sessions', {
  id: text('id').primaryKey(),
  qrcodeKey: text('qrcode_key').notNull().unique(),
  qrUrl: text('qr_url').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'scanned', 'confirmed', 'expired'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expireAt: integer('expire_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('idx_qrcode_sessions_user_id').on(table.userId),
  expireAtIdx: index('idx_qrcode_sessions_expire_at').on(table.expireAt),
}))

