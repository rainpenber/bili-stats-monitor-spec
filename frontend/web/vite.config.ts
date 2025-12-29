import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { createServer } from 'net'
import { writeFileSync } from 'fs'
import { join } from 'path'

// #region agent log
const logDebug = (location: string, message: string, data: any) => {
  const logPath = join(process.cwd(), '.cursor', 'debug.log')
  const logEntry = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: data.hypothesisId || 'A'
  }
  try {
    writeFileSync(logPath, JSON.stringify(logEntry) + '\n', { flag: 'a' })
  } catch (e) {
    // 忽略文件写入错误
  }
}
// #endregion

// #region agent log
// 检查端口是否可用（假设A: 端口被占用）
const checkPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    server.on('error', (err: any) => {
      logDebug('vite.config.ts:checkPortAvailable', 'Port check error', {
        hypothesisId: 'A',
        port,
        errorCode: err.code,
        errorMessage: err.message,
        syscall: err.syscall,
        address: err.address
      })
      resolve(false)
    })
  })
}
// #endregion

// #region agent log
// 记录配置加载信息
logDebug('vite.config.ts:config', 'Vite config loading start', {
  hypothesisId: 'A',
  nodeVersion: process.version,
  platform: process.platform,
  cwd: process.cwd(),
  env: {
    USER: process.env.USER,
    USERNAME: process.env.USERNAME
  }
})
// #endregion

// #region agent log
// 异步检查端口（在配置函数中调用）
let portCheckPromise: Promise<boolean> | null = null
const ensurePortCheck = () => {
  if (!portCheckPromise) {
    portCheckPromise = checkPortAvailable(5173).then((isAvailable) => {
      logDebug('vite.config.ts:ensurePortCheck', 'Port availability result', {
        hypothesisId: 'A',
        port: 5173,
        isAvailable
      })
      return isAvailable
    })
  }
  return portCheckPromise
}
// #endregion

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    // #region agent log
    // 插件：在服务器启动时检查端口
    {
      name: 'debug-port-check',
      configureServer(server) {
        server.httpServer?.on('listening', () => {
          logDebug('vite.config.ts:configureServer', 'Server listening', {
            hypothesisId: 'A',
            address: server.httpServer?.address(),
            port: 5173
          })
        })
        server.httpServer?.on('error', (err: any) => {
          logDebug('vite.config.ts:configureServer', 'Server error event', {
            hypothesisId: 'A',
            errorCode: err.code,
            errorMessage: err.message,
            syscall: err.syscall,
            address: err.address,
            port: err.port,
            errno: err.errno
          })
        })
      }
    }
    // #endregion
  ],
  server: {
    port: 5173,
    strictPort: false, // 允许自动选择其他端口
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:38080',
        changeOrigin: true,
      },
    },
  },
  // #region agent log
  // 添加构建时的日志
  logLevel: 'info',
  // #endregion
})
