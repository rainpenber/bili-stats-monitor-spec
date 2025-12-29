import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { fetchAuthorList, type AuthorInfo } from '@/lib/api'

/**
 * AuthorSelectModal - 博主选择Modal
 * 
 * 功能：
 * - 显示博主列表（从authors表查询，仅显示有监控任务的博主）
 * - 支持按昵称和UID搜索筛选
 * - 标记当前默认展示的博主（显示"默认展示"标签）
 * - "设为默认"按钮功能（调用saveDefaultDisplayAuthor API）
 * - 选择博主后立即更新为所选博主的数据（当前展示，临时选择）
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-037至FR-042
 */

export interface AuthorSelectModalProps {
  open: boolean
  onClose: () => void
  currentAuthorUid: string | null
  defaultAuthorUid: string | null
  onSelect: (uid: string) => void
  onSetDefault: (uid: string) => Promise<boolean>
}

export function AuthorSelectModal({
  open,
  onClose,
  currentAuthorUid,
  defaultAuthorUid,
  onSelect,
  onSetDefault,
}: AuthorSelectModalProps) {
  const [authors, setAuthors] = useState<AuthorInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  // 加载博主列表
  useEffect(() => {
    if (!open) return

    let isMounted = true

    const loadAuthors = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchAuthorList(search || undefined)
        
        if (!isMounted) return

        setAuthors(data)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load authors:', err)
        setError(err instanceof Error ? err.message : 'Failed to load authors')
        setAuthors([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAuthors()

    return () => {
      isMounted = false
    }
  }, [open, search])

  // 处理选择博主
  const handleSelect = (uid: string) => {
    onSelect(uid)
    onClose()
    const author = authors.find(a => a.uid === uid)
    if (author) {
      toast.success(`已切换到博主：${author.nickname || uid}`)
    }
  }

  // 处理设为默认
  const handleSetDefault = async (uid: string, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止触发选择事件

    try {
      setSettingDefault(uid)
      const success = await onSetDefault(uid)
      
      if (success) {
        toast.success('已设置为默认展示博主')
      } else {
        toast.error('设置失败，请重试')
      }
    } catch (err) {
      console.error('Failed to set default author:', err)
      toast.error('设置失败，请重试')
    } finally {
      setSettingDefault(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader 
        title="选择博主" 
        description="选择要查看的博主数据，可以设置为默认展示"
      />
      <ModalBody>
        {/* 搜索框 */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="搜索博主昵称或UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {/* 错误状态 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        )}

        {/* 博主列表 */}
        {!loading && !error && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {authors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? '未找到匹配的博主' : '暂无博主数据'}
              </div>
            ) : (
              authors.map((author) => {
                const isCurrent = author.uid === currentAuthorUid
                const isDefault = author.uid === defaultAuthorUid
                const isSettingDefault = settingDefault === author.uid

                return (
                  <div
                    key={author.uid}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      isCurrent
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                    onClick={() => handleSelect(author.uid)}
                  >
                    <div className="flex items-center gap-4">
                      {/* 头像 */}
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {author.avatar ? (
                          <img
                            src={author.avatar}
                            alt={author.nickname || author.uid}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate">
                            {author.nickname || `UID: ${author.uid}`}
                          </div>
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                              当前展示
                            </span>
                          )}
                          {isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex-shrink-0">
                              默认展示
                            </span>
                          )}
                          {!author.hasBoundAccount && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                              仅公开数据
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          UID: {author.uid}
                        </div>
                      </div>

                      {/* 设为默认按钮 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleSetDefault(author.uid, e)}
                        disabled={isDefault || isSettingDefault}
                        className="flex-shrink-0"
                      >
                        {isSettingDefault ? '设置中...' : isDefault ? '已是默认' : '设为默认'}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
      </ModalFooter>
    </Modal>
  )
}


