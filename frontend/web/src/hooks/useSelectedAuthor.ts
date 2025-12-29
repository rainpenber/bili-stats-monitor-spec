import { useEffect, useState } from 'react'
import { fetchDefaultDisplayAuthor, saveDefaultDisplayAuthor } from '@/lib/api'
import { useSelectedAccount } from './useSelectedAccount'

/**
 * useSelectedAuthor Hook
 * 
 * 管理"我的账号"页面的当前展示博主和默认展示博主状态
 * 
 * 状态说明：
 * - currentDisplayAuthor: 当前展示博主（临时选择，仅本次会话有效，存储在组件state中）
 * - defaultDisplayAuthor: 默认展示博主（持久化设置，从settings表读取，页面刷新后自动加载）
 * 
 * 优先级逻辑（页面刷新时）：
 * 1. 优先展示默认展示博主（从settings表读取default_display_author）
 * 2. 如果没有设置默认展示博主，则展示当前选择账号对应的博主（account.uid）
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-041, FR-043, FR-045
 */
export function useSelectedAuthor() {
  const { account } = useSelectedAccount()
  const [currentDisplayAuthor, setCurrentDisplayAuthor] = useState<string | null>(null)
  const [defaultDisplayAuthor, setDefaultDisplayAuthor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化：加载默认展示博主
  useEffect(() => {
    let isMounted = true

    const loadDefaultDisplayAuthor = async () => {
      try {
        setLoading(true)
        setError(null)

        const uid = await fetchDefaultDisplayAuthor()
        
        if (!isMounted) return

        setDefaultDisplayAuthor(uid)

        // 如果设置了默认展示博主，将其设为当前展示博主
        if (uid) {
          setCurrentDisplayAuthor(uid)
        } else {
          // 如果没有设置默认展示博主，使用当前选择账号的UID
          if (account?.uid) {
            setCurrentDisplayAuthor(account.uid)
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load default display author:', err)
        setError(err instanceof Error ? err.message : 'Failed to load default display author')
        
        // 失败时fallback到当前选择账号
        if (account?.uid) {
          setCurrentDisplayAuthor(account.uid)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDefaultDisplayAuthor()

    return () => {
      isMounted = false
    }
  }, [account?.uid]) // 当账号变化时重新加载（处理账号切换场景）

  // 当默认展示博主变化时，如果当前没有临时选择，则更新当前展示博主
  useEffect(() => {
    if (defaultDisplayAuthor && !currentDisplayAuthor) {
      setCurrentDisplayAuthor(defaultDisplayAuthor)
    }
  }, [defaultDisplayAuthor, currentDisplayAuthor])

  /**
   * 选择当前展示博主（临时选择，仅本次会话有效）
   */
  const selectAuthor = (uid: string) => {
    setCurrentDisplayAuthor(uid)
  }

  /**
   * 设置默认展示博主（持久化设置）
   */
  const setDefaultAuthor = async (uid: string | null): Promise<boolean> => {
    try {
      setError(null)
      const success = await saveDefaultDisplayAuthor(uid)
      
      if (success) {
        setDefaultDisplayAuthor(uid)
        // 如果设置为默认，同时更新当前展示博主
        if (uid) {
          setCurrentDisplayAuthor(uid)
        }
        return true
      }
      
      return false
    } catch (err) {
      console.error('Failed to save default display author:', err)
      setError(err instanceof Error ? err.message : 'Failed to save default display author')
      return false
    }
  }

  return {
    currentDisplayAuthor,
    defaultDisplayAuthor,
    loading,
    error,
    selectAuthor,
    setDefaultAuthor,
  }
}

