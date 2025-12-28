import { useEffect, useState } from 'react'
import { useUISelection } from '@/store/uiSelection'
import type { BilibiliAccount } from '@/types/bilibili'
import { listBilibiliAccounts } from '@/lib/api'

const STORAGE_KEY = 'selected_account_id'

/**
 * useSelectedAccount Hook
 * 
 * 管理"我的账号"页面的选中账号状态
 * - 从localStorage读取/保存selectedAccountId
 * - 实时获取账号详情
 * - Fallback逻辑：选中的账号不存在时，选择第一个可用账号
 * 
 * 参考: specs/006-navigation-restructure/research.md R3
 */
export function useSelectedAccount() {
  const { selectedAccountId, setSelectedAccountId } = useUISelection()
  const [account, setAccount] = useState<BilibiliAccount | null>(null)
  const [accounts, setAccounts] = useState<BilibiliAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化：从localStorage读取
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (storedId && storedId !== 'null') {
      setSelectedAccountId(storedId)
    }
  }, [setSelectedAccountId])

  // 加载账号列表和账号详情
  useEffect(() => {
    let isMounted = true

    const loadAccounts = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await listBilibiliAccounts()
        
        if (!isMounted) return

        setAccounts(data)

        // Fallback逻辑
        if (selectedAccountId) {
          // 检查选中的账号是否仍存在
          const found = data.find(acc => acc.id === selectedAccountId)
          
          if (found) {
            setAccount(found)
          } else {
            // 选中的账号已被删除，fallback到第一个账号
            if (data.length > 0) {
              const firstAccount = data[0]
              setSelectedAccountId(firstAccount.id)
              setAccount(firstAccount)
              localStorage.setItem(STORAGE_KEY, firstAccount.id)
            } else {
              // 没有可用账号
              setSelectedAccountId(null)
              setAccount(null)
              localStorage.removeItem(STORAGE_KEY)
            }
          }
        } else if (data.length > 0) {
          // 没有选中账号，选择第一个
          const firstAccount = data[0]
          setSelectedAccountId(firstAccount.id)
          setAccount(firstAccount)
          localStorage.setItem(STORAGE_KEY, firstAccount.id)
        } else {
          // 没有可用账号
          setAccount(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load accounts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load accounts')
        setAccount(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAccounts()

    return () => {
      isMounted = false
    }
  }, [selectedAccountId, setSelectedAccountId])

  // 保存到localStorage（当selectedAccountId变化时）
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem(STORAGE_KEY, selectedAccountId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedAccountId])

  // 切换账号
  const selectAccount = (id: string) => {
    setSelectedAccountId(id)
  }

  return {
    account,
    accounts,
    loading,
    error,
    selectAccount,
  }
}

