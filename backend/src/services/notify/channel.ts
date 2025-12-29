import { z } from 'zod'

/**
 * 通知渠道接口
 */
export interface NotifyChannel {
  /** 渠道名称 */
  readonly name: string

  /** 配置验证 schema */
  readonly configSchema: z.ZodSchema

  /**
   * 发送通知
   * @param title 通知标题
   * @param content 通知内容
   * @param config 渠道配置
   * @returns 是否发送成功
   */
  send(title: string, content: string, config: unknown): Promise<boolean>

  /**
   * 测试渠道配置
   * @param config 渠道配置
   * @returns 是否配置有效
   */
  test(config: unknown): Promise<boolean>
}

/**
 * 通知事件类型
 */
export type NotifyEventType =
  | 'task_failed' // 任务失败
  | 'task_completed' // 任务完成
  | 'account_expired' // 账号失效
  | 'cid_retry_failed' // CID 获取失败
  | 'metric_threshold' // 指标阈值触发
  | 'system_error' // 系统错误

/**
 * 通知事件
 */
export interface NotifyEvent {
  type: NotifyEventType
  title: string
  content: string
  metadata?: Record<string, any>
}

