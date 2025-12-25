// T010: 前端测试环境设置
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './msw-handlers'

// 设置 MSW 服务器
const server = setupServer(...handlers)

// 在所有测试前启动 MSW 服务器
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// 每个测试后重置 handlers
afterEach(() => server.resetHandlers())

// 所有测试完成后关闭服务器
afterAll(() => server.close())

