import { http } from './http'

// Type definitions based on OpenAPI schema
export interface Task {
  id: string
  type: 'video' | 'author'
  target_id: string
  account_id?: string | null
  status: 'running' | 'stopped' | 'completed' | 'failed' | 'paused'
  reason?: string | null
  strategy: StrategyFixed | StrategySmart
  deadline: string
  created_at: string
  updated_at: string
  tags: string[]
  latest_sample?: {
    play?: number
    fans?: number
    last_collected_at?: string
  }
  media?: {
    cover_url?: string | null
    avatar_url?: string | null
  }
  title?: string
  nickname?: string
}

export interface StrategyFixed {
  mode: 'fixed'
  value: number
  unit: 'minute' | 'hour' | 'day'
}

export interface StrategySmart {
  mode: 'smart'
}

export interface Account {
  id: string
  uid: string
  nickname: string
  bind_method: 'cookie' | 'qrcode'
  status: 'valid' | 'expired'
  last_failures: number
  bound_at: string
}

export interface LogItem {
  ts: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
  source: string
  message: string
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  page_size: number
  total: number
}

export interface FetchTasksParams {
  page: number
  page_size: number
  keyword?: string
  type?: 'video' | 'author'
}

export async function fetchTasks(params: FetchTasksParams) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('page_size', String(params.page_size))
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.type) qs.set('type', params.type)
  return http.get<PaginatedResponse<Task>>(`/api/v1/tasks?${qs.toString()}`)
}

export async function fetchAccounts(page = 1, page_size = 50) {
  return http.get<PaginatedResponse<Account>>(`/api/v1/accounts?page=${page}&page_size=${page_size}`)
}

export async function fetchDefaultAccount() {
  return http.get<{ id?: string }>(`/api/v1/accounts/default`)
}

export async function saveDefaultAccount(id: string) {
  await http.post(`/api/v1/accounts/default`, { id })
  return true
}

// Notifications API
export interface ChannelConfig {
  enabled: boolean
  target?: string
  token?: string
}

export async function getNotificationChannels() {
  return http.get<Record<string, ChannelConfig>>(`/api/v1/notifications/channels`)
}

export async function saveNotificationChannels(channels: Record<string, ChannelConfig>) {
  await http.post(`/api/v1/notifications/channels`, { action: 'save', channels })
  return true
}

export interface TestNotificationPayload {
  channel: string
  payload: Record<string, unknown>
}

export async function testNotification(channel: string, payload: Record<string, unknown>) {
  await http.post(`/api/v1/notifications/test`, { channel, payload })
  return true
}

export interface NotifyRule {
  id?: string
  name: string
  enabled: boolean
  triggers: string[]
  channels: string[]
}

export async function getNotificationRules() {
  return http.get<{ items: NotifyRule[]; triggers: string[]; channels: string[] }>(`/api/v1/notifications/rules`)
}

export async function saveNotificationRule(rule: NotifyRule) {
  await http.post(`/api/v1/notifications/rules`, { action: 'save', rule })
  return true
}

export async function deleteNotificationRule(id: string) {
  await http.post(`/api/v1/notifications/rules`, { action: 'delete', id })
  return true
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
export interface FetchLogsParams {
  date_from?: string
  date_to?: string
  levels?: LogLevel[]
  sources?: string[]
  keyword?: string
  page?: number
  page_size?: number
  sort?: 'ts_desc' | 'ts_asc'
}

export interface FetchLogsResponse extends PaginatedResponse<LogItem> {
  sources: string[]
}

export async function fetchLogs(params: FetchLogsParams = {}) {
  const qs = new URLSearchParams()
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  if (params.levels && params.levels.length) qs.set('levels', params.levels.join(','))
  if (params.sources && params.sources.length) qs.set('sources', params.sources.join(','))
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  if (params.sort) qs.set('sort', params.sort)
  return http.get<FetchLogsResponse>(`/api/v1/logs?${qs.toString()}`)
}

export async function downloadLogs(params: FetchLogsParams = {}) {
  const qs = new URLSearchParams()
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  if (params.levels && params.levels.length) qs.set('levels', params.levels.join(','))
  if (params.sources && params.sources.length) qs.set('sources', params.sources.join(','))
  if (params.keyword) qs.set('keyword', params.keyword)
  return http.get<{ url: string }>(`/api/v1/logs/download?${qs.toString()}`)
}

// ============================================================================
// 以下函数由 /speckit.implement 自动补全 (T018-T040)
// ============================================================================

// Auth API (T018-T019)
export interface User {
  id: string
  username: string
  role: 'admin' | 'viewer'
}

/**
 * 退出登录
 */
export async function logout() {
  await http.post('/api/v1/auth/logout', { action: 'logout' })
  return true
}

/**
 * 获取当前用户信息
 */
export async function fetchProfile() {
  return http.get<User>('/api/v1/auth/profile')
}

// Accounts API (T020-T024)

/**
 * 通过 Cookie 绑定账号
 */
export async function bindAccountWithCookie(cookie: string) {
  return http.post<Account>('/api/v1/accounts/cookie', { cookie })
}

/**
 * 获取扫码登录二维码
 */
export async function createQRCode() {
  return http.post<{
    session_id: string
    qr_url: string
    expire_at: string
    poll_interval_sec: number
  }>('/api/v1/accounts/qrcode', { action: 'create' })
}

/**
 * 轮询扫码登录状态
 */
export async function pollQRCodeStatus(sessionId: string) {
  return http.get<{
    status: 'pending' | 'scanned' | 'confirmed' | 'expired'
    account?: Account
  }>(`/api/v1/accounts/qrcode/status?session_id=${sessionId}`)
}

/**
 * 验证账号
 */
export async function validateAccount(id: string) {
  await http.post(`/api/v1/accounts/${id}/action`, { action: 'validate' })
  return true
}

/**
 * 解绑账号
 */
export async function unbindAccount(id: string) {
  await http.post(`/api/v1/accounts/${id}/action`, { action: 'unbind' })
  return true
}

// Tasks API (T025-T029)

export interface TaskCreate {
  type: 'video' | 'author'
  target_id: string
  account_id?: string
  strategy?: StrategyFixed | StrategySmart
  deadline?: string
  tags?: string[]
}

export interface TaskUpdate {
  account_id?: string
  strategy?: StrategyFixed | StrategySmart
  deadline?: string
  tags?: string[]
}

export interface Selection {
  type: 'ids' | 'all'
  ids?: string[]
  filters?: {
    keyword?: string
    type?: 'video' | 'author'
    author_uid?: string
    tags?: string
  }
}

/**
 * 创建任务
 */
export async function createTask(data: TaskCreate) {
  return http.post<Task>('/api/v1/tasks', data)
}

/**
 * 获取任务详情
 */
export async function fetchTask(id: string) {
  return http.get<Task>(`/api/v1/tasks/${id}`)
}

/**
 * 更新任务
 */
export async function updateTask(id: string, data: TaskUpdate) {
  await http.post(`/api/v1/tasks/${id}`, {
    action: 'update',
    ...data
  })
  return true
}

/**
 * 删除任务
 */
export async function deleteTask(id: string) {
  await http.post(`/api/v1/tasks/${id}`, { action: 'delete' })
  return true
}

/**
 * 批量启用任务
 */
export async function batchEnableTasks(selection: Selection) {
  return http.post<{
    success_count: number
    failure_count: number
    failures: Array<{ id: string; reason: string }>
  }>('/api/v1/tasks/batch', {
    action: 'enable',
    selection
  })
}

/**
 * 批量禁用任务
 */
export async function batchDisableTasks(selection: Selection) {
  return http.post<{
    success_count: number
    failure_count: number
    failures: Array<{ id: string; reason: string }>
  }>('/api/v1/tasks/batch', {
    action: 'disable',
    selection
  })
}

// Metrics API (T030-T032)

export interface TimeRangeParams {
  from?: string  // ISO 8601 datetime
  to?: string    // ISO 8601 datetime
  fields?: string  // 逗号分隔，如 'play,watching,danmaku'
}

export interface MetricPoint {
  ts: string
  play?: number
  watching?: number
  danmaku?: number
  comment?: number
  coin?: number
  like?: number
  fans?: number
}

export interface InsightPoint {
  date: string
  completion_rate: number
  avg_watch_duration_sec: number
}

/**
 * 获取视频指标时序
 */
export async function fetchVideoMetrics(bv: string, params?: TimeRangeParams) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.fields) qs.set('fields', params.fields)
  return http.get<{ series: MetricPoint[] }>(`/api/v1/videos/${bv}/metrics?${qs.toString()}`)
}

/**
 * 获取视频私密指标（日粒度）
 */
export async function fetchVideoInsights(bv: string) {
  return http.get<InsightPoint[]>(`/api/v1/videos/${bv}/insights/daily`)
}

/**
 * 获取博主粉丝时序
 */
export async function fetchAuthorMetrics(uid: string, params?: TimeRangeParams) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  return http.get<{ series: MetricPoint[] }>(`/api/v1/authors/${uid}/metrics?${qs.toString()}`)
}

// Media API (T033-T035)

/**
 * 获取视频封面 URL
 */
export async function fetchVideoCover(bv: string) {
  return http.get<{ url: string }>(`/api/v1/media/videos/${bv}/cover`)
}

/**
 * 获取博主头像 URL
 */
export async function fetchAuthorAvatar(uid: string) {
  return http.get<{ url: string }>(`/api/v1/media/authors/${uid}/avatar`)
}

/**
 * 手动刷新封面/头像缓存
 */
export async function refreshMedia(targetType: 'video' | 'author', targetId: string) {
  await http.post('/api/v1/media/refresh', {
    target_type: targetType,
    target_id: targetId
  })
  return true
}

// Alerts API (T036-T038)

export interface AlertRule {
  enabled: boolean
  mode: 'absolute' | 'percent'
  threshold: number
  window_hours: number
}

/**
 * 获取博主粉丝告警规则
 */
export async function fetchAlertRule(uid: string) {
  return http.get<AlertRule>(`/api/v1/alerts/authors/${uid}`)
}

/**
 * 保存粉丝告警规则
 */
export async function saveAlertRule(uid: string, rule: AlertRule) {
  await http.post(`/api/v1/alerts/authors/${uid}`, {
    action: 'save',
    rule
  })
  return true
}

/**
 * 禁用粉丝告警规则
 */
export async function disableAlertRule(uid: string) {
  await http.post(`/api/v1/alerts/authors/${uid}`, {
    action: 'disable'
  })
  return true
}

// Settings API (T039-T040)

export interface Settings {
  min_interval_min: number
  max_fixed_interval_day: number
  max_retries: number
  page_size_default: number
  timezone: string
  users: User[]
}

/**
 * 获取系统设置
 */
export async function fetchSettings() {
  return http.get<Settings>('/api/v1/settings')
}

/**
 * 保存系统设置
 */
export async function saveSettings(settings: Settings) {
  await http.post('/api/v1/settings', {
    action: 'save',
    settings
  })
  return true
}