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
