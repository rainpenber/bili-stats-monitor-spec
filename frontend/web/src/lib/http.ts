export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpError extends Error {
  status?: number
  code?: number | string
  url?: string
  detail?: any
}

interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: any
  timeoutMs?: number
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT = 15000

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT)
  const mergedHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...options.headers,
  }
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: mergedHeaders,
    body: options.body,
    signal: options.signal ?? controller.signal,
  }
  try {
    const resp = await fetch(url, init)
    const text = await resp.text()
    let json: any
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }

    // 优先解析标准 { code, message, data }
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code === 0) return json.data as T
      const err: HttpError = new Error(json.message || 'request error')
      err.status = resp.status
      err.code = json.code
      err.url = url
      err.detail = json
      throw err
    }

    if (!resp.ok) {
      const err: HttpError = new Error(`HTTP ${resp.status}`)
      err.status = resp.status
      err.url = url
      err.detail = json
      throw err
    }

    return json as T
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const err: HttpError = new Error('请求超时')
      err.code = 'TIMEOUT'
      err.url = url
      throw err
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

function jsonBody(data: any) {
  return { 'Content-Type': 'application/json', body: JSON.stringify(data ?? {}) }
}

export const http = {
  request,
  get<T = any>(url: string, opts: Omit<RequestOptions,'method'|'body'> = {}) {
    return request<T>(url, { ...opts, method: 'GET' })
  },
  post<T = any>(url: string, data?: any, opts: Omit<RequestOptions,'method'|'body'> = {}) {
    const jb = jsonBody(data)
    return request<T>(url, { ...opts, method: 'POST', headers: { ...(opts.headers||{}), 'Content-Type': 'application/json' }, body: jb.body })
  },
  jsonBody,
}

