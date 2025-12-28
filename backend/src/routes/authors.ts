import { Hono } from 'hono'
import { success, error, ErrorCodes } from '../utils/response'
import { AuthorService } from '../services/author'
import type { DrizzleInstance } from '../db'

/**
 * Authors路由
 * 
 * 提供作者相关的数据查询接口
 */
export function createAuthorsRoutes(db: DrizzleInstance) {
  const app = new Hono()
  const authorService = new AuthorService(db)

  /**
   * GET /api/v1/authors/:uid/metrics
   * 
   * 获取指定作者的粉丝历史数据
   * 
   * 实现逻辑（参考research.md R2）：
   * - 查询所有author_uid为该UID的tasks
   * - 聚合所有tasks的author_metrics记录
   * - 按collected_at分组，取MAX(follower)
   * - 按时间升序排序
   * 
   * Response:
   * {
   *   "code": 200,
   *   "data": {
   *     "uid": "12345",
   *     "metrics": [
   *       { "collected_at": "2024-01-01T00:00:00Z", "follower": 1000 },
   *       { "collected_at": "2024-01-02T00:00:00Z", "follower": 1050 }
   *     ]
   *   }
   * }
   */
  app.get('/:uid/metrics', async (c) => {
    try {
      const uid = c.req.param('uid')

      if (!uid) {
        return error(c, ErrorCodes.VALIDATION_ERROR, 'UID is required')
      }

      const result = await authorService.getAuthorMetrics(uid)

      return success(c, result)
    } catch (err) {
      console.error('Failed to get author metrics:', err)
      return error(c, ErrorCodes.INTERNAL_ERROR, 'Failed to get author metrics', undefined, 500)
    }
  })

  return app
}

