// T009: 前端 MSW handlers - Mock Service Worker 请求处理器
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth API
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        token: 'mock-jwt-token',
        user: {
          id: 'test-user-001',
          username: 'admin',
          role: 'admin'
        }
      }
    })
  }),

  // Tasks API
  http.get('/api/v1/tasks', () => {
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        items: [
          {
            id: 'task-001',
            type: 'video',
            target_id: 'BV1234567890',
            status: 'running',
            strategy: { mode: 'smart' },
            deadline: '2025-04-01T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tags: ['测试']
          }
        ],
        page: 1,
        page_size: 20,
        total: 1
      }
    })
  }),

  // Accounts API
  http.get('/api/v1/accounts', () => {
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        items: [
          {
            id: 'account-001',
            uid: '123456789',
            nickname: '测试UP主',
            bind_method: 'cookie',
            status: 'valid',
            last_failures: 0,
            bound_at: '2025-01-01T00:00:00Z'
          }
        ],
        page: 1,
        page_size: 20,
        total: 1
      }
    })
  })
]

