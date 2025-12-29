import { pgTable, text, integer, real, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'viewer'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// BiliAccount table
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  nickname: text('nickname'),
  sessdata: text('sessdata').notNull(), // Encrypted
  biliJct: text('bili_jct'),
  bindMethod: text('bind_method', { enum: ['cookie', 'qrcode'] }).notNull(),
  status: text('status', { enum: ['valid', 'expired'] }).notNull().default('valid'),
  lastFailures: integer('last_failures').default(0),
  boundAt: timestamp('bound_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// MonitoringTask table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['video', 'author'] }).notNull(),
  targetId: text('target_id').notNull(), // BV or UID
  title: text('title'),
  cid: text('cid'), // Video CID (for online viewers)
  cidRetries: integer('cid_retries').default(0), // Retry count for CID fetching
  accountId: text('account_id').references(() => accounts.id),
  strategy: jsonb('strategy').notNull(), // { mode, value?, unit? }
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: text('status', { enum: ['running', 'stopped', 'completed', 'failed', 'paused'] }).notNull().default('running'),
  reason: text('reason'), // Pause/failure reason
  tags: jsonb('tags'), // string[]
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }), // Video publish time
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// VideoMetrics table
export const videoMetrics = pgTable('video_metrics', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
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
export const authorMetrics = pgTable('author_metrics', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  follower: integer('follower').notNull(),
})

// NotifyChannels table
export const notifyChannels = pgTable('notify_channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // onebot, telegram, bark, etc.
  enabled: boolean('enabled').default(false),
  config: jsonb('config'), // Channel-specific config (encrypted sensitive fields)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// NotifyRules table
export const notifyRules = pgTable('notify_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: boolean('enabled').default(true),
  triggers: jsonb('triggers').notNull(), // string[]
  channels: jsonb('channels').notNull(), // string[]
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// SystemLogs table
export const systemLogs = pgTable('system_logs', {
  id: text('id').primaryKey(),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  level: text('level', { enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] }).notNull(),
  source: text('source').notNull(),
  message: text('message').notNull(),
  context: jsonb('context'), // Optional structured context
})

// Settings table
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// MediaAssets table
export const mediaAssets = pgTable('media_assets', {
  id: text('id').primaryKey(),
  targetType: text('target_type', { enum: ['video', 'author'] }).notNull(),
  targetId: text('target_id').notNull(),
  assetType: text('asset_type', { enum: ['cover', 'avatar'] }).notNull(),
  localPath: text('local_path'),
  sourceUrl: text('source_url'),
  lastRefresh: timestamp('last_refresh', { withTimezone: true }),
  status: text('status', { enum: ['cached', 'failed', 'pending'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

