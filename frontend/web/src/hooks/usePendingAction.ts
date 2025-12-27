/**
 * usePendingAction Hook - Pending Action管理
 * 
 * 用于：
 * 1. 保存用户触发的操作（当需要鉴权时）
 * 2. 登录成功后自动重试之前的操作
 */

import { useUISelection } from '@/store/uiSelection'
import type { PendingAction } from '@/types/auth'

export function usePendingAction() {
  const { pendingAction, setPendingAction } = useUISelection()

  /**
   * 设置Pending Action
   */
  const set = (action: PendingAction | null) => {
    setPendingAction(action)
  }

  /**
   * 执行Pending Action并清除
   */
  const execute = async () => {
    if (!pendingAction) return

    try {
      if (pendingAction.type === 'api-call' && pendingAction.payload.apiCall) {
        await pendingAction.payload.apiCall()
      } else if (pendingAction.type === 'modal-open' && pendingAction.payload.modalAction) {
        pendingAction.payload.modalAction()
      }
    } finally {
      // 执行后清除
      setPendingAction(null)
    }
  }

  /**
   * 清除Pending Action
   */
  const clear = () => {
    setPendingAction(null)
  }

  return {
    pendingAction,
    set,
    execute,
    clear,
  }
}

