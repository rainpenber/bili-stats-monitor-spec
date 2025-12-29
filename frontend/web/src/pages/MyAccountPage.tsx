import { useEffect, useState, useRef } from 'react'
import { useSelectedAccount } from '@/hooks/useSelectedAccount'
import { useSelectedAuthor } from '@/hooks/useSelectedAuthor'
import { useAuthorMetrics } from '@/hooks/useAuthorMetrics'
import { fetchTasksByAuthorUid, fetchAuthorInfo, type AuthorInfo } from '@/lib/api'
import { AccountDataDashboard } from '@/components/account/AccountDataDashboard'
import { FollowerChart } from '@/components/account/FollowerChart'
import { TaskCardList } from '@/components/account/TaskCardList'
import { AccountSwitchModal } from '@/components/account/AccountSwitchModal'
import { AuthorSelectModal } from '@/components/account/AuthorSelectModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import type { Task } from '@/lib/api'
import VideoMetricsChart from '@/components/detail/VideoMetricsChart'
import VideoEngagementChart from '@/components/detail/VideoEngagementChart'

/**
 * MyAccountPage - 我的账号页面
 * 
 * 显示当前选中账号的数据：
 * - 账号信息和切换按钮
 * - 数据仪表板（总监视视频数、粉丝量）
 * - 粉丝数量变化图表
 * - 该账号发布的所有视频任务卡片
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-005至FR-015
 */
export default function MyAccountPage() {
  const { account, accounts, loading: accountLoading, error: accountError, selectAccount } = useSelectedAccount()
  const { 
    currentDisplayAuthor, 
    defaultDisplayAuthor, 
    loading: authorLoading,
    selectAuthor, 
    setDefaultAuthor 
  } = useSelectedAuthor()
  
  // 使用当前展示博主（而非账号UID）来获取数据
  const displayUid = currentDisplayAuthor || account?.uid || null
  const { data: metricsData, loading: metricsLoading, error: metricsError } = useAuthorMetrics(displayUid)
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [switchModalOpen, setSwitchModalOpen] = useState(false)
  const [authorSelectModalOpen, setAuthorSelectModalOpen] = useState(false)
  const [displayAuthorInfo, setDisplayAuthorInfo] = useState<AuthorInfo | null>(null)
  const [authorInfoLoading, setAuthorInfoLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'videos' | 'followers'>('videos') // 默认显示视频监控任务
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null) // 当前选中的任务ID
  const [videoChartTab, setVideoChartTab] = useState<'metrics' | 'engagement'>('metrics')
  const metricsRef = useRef<any>(null)
  const engagementRef = useRef<any>(null)
  
  // 加载当前展示博主的信息
  useEffect(() => {
    if (!displayUid) {
      setDisplayAuthorInfo(null)
      return
    }

    // 如果展示的是当前账号，不需要额外加载
    if (displayUid === account?.uid) {
      setDisplayAuthorInfo({
        uid: account.uid,
        nickname: account.nickname,
        avatar: account.avatar,
        hasBoundAccount: true,
      })
      return
    }

    let isMounted = true

    const loadAuthorInfo = async () => {
      try {
        setAuthorInfoLoading(true)
        const info = await fetchAuthorInfo(displayUid)
        if (isMounted) {
          setDisplayAuthorInfo(info)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load author info:', err)
          // 如果获取失败，使用基本信息
          setDisplayAuthorInfo({
            uid: displayUid,
            nickname: null,
            avatar: null,
            hasBoundAccount: accounts.some(acc => acc.uid === displayUid),
          })
        }
      } finally {
        if (isMounted) {
          setAuthorInfoLoading(false)
        }
      }
    }

    loadAuthorInfo()

    return () => {
      isMounted = false
    }
  }, [displayUid, account?.uid, accounts])
  
  // 检查当前展示博主是否有对应的已绑定账号
  const hasBoundAccount = displayAuthorInfo?.hasBoundAccount ?? (account?.uid === displayUid || accounts.some(acc => acc.uid === displayUid))

  // 加载当前展示博主的视频任务
  useEffect(() => {
    if (!displayUid) {
      setTasks([])
      return
    }

    let isMounted = true

    const loadTasks = async () => {
      try {
        setTasksLoading(true)
        setTasksError(null)

        const response = await fetchTasksByAuthorUid(displayUid)
        
        if (!isMounted) return

        setTasks(response.items)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load tasks:', err)
        setTasksError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        if (isMounted) {
          setTasksLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [displayUid])

  // Loading状态
  if (accountLoading) {
    return (
      <div className="container-page py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (accountError) {
    return (
      <div className="container-page py-6">
        <EmptyState
          title="加载失败"
          description={accountError}
          action={
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      </div>
    )
  }

  // 无账号状态
  if (!account) {
    return (
      <div className="container-page py-6">
        <EmptyState
          title="暂无已绑定账号"
          description="请先前往账号管理页面绑定B站账号"
          action={
            <Link to="/accounts">
              <Button>前往账号管理</Button>
            </Link>
          }
        />
      </div>
    )
  }

  // 计算数据
  const totalVideos = tasks.filter(t => t.type === 'video').length
  const latestFollowerCount = metricsData?.metrics.length
    ? metricsData.metrics[metricsData.metrics.length - 1].follower
    : 0

  // 确定要显示的博主信息（优先显示选择的博主，否则显示账号）
  const displayInfo = displayAuthorInfo || (account ? {
    uid: account.uid,
    nickname: account.nickname,
    avatar: account.avatar,
    hasBoundAccount: true,
  } : null)

  const isDisplayingDifferentAuthor = currentDisplayAuthor && currentDisplayAuthor !== account?.uid

  return (
    <div className="container-page py-6 space-y-6">
      {/* 1. 账号/博主信息卡片（合并显示） */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {displayInfo?.avatar ? (
                <img src={displayInfo.avatar} alt={displayInfo.nickname || 'Author'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">👤</span>
              )}
            </div>
            <div>
              <div className="font-semibold">{displayInfo?.nickname || '未知昵称'}</div>
              <div className="text-sm text-muted-foreground">UID: {displayInfo?.uid || 'N/A'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAuthorSelectModalOpen(true)}>
              选择博主
            </Button>
            {accounts.length > 1 && (
              <Button variant="outline" onClick={() => setSwitchModalOpen(true)}>
                切换账号
              </Button>
            )}
          </div>
        </div>

        {/* 如果展示的是不同的博主，显示额外信息 */}
        {isDisplayingDifferentAuthor && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              {defaultDisplayAuthor === currentDisplayAuthor && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  默认展示
                </span>
              )}
              {!hasBoundAccount && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  仅公开数据
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. 数据仪表板（可点击切换tab） */}
      <AccountDataDashboard
        totalVideos={totalVideos}
        followerCount={latestFollowerCount}
        loading={metricsLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 3. 粉丝数量图表（根据tab显示/隐藏） */}
      {activeTab === 'followers' && (
        <div className="border rounded-lg bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">粉丝数量变化</h3>
          {metricsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-destructive">{metricsError}</div>
            </div>
          ) : (
            <FollowerChart
              data={metricsData?.metrics || []}
              loading={metricsLoading}
            />
          )}
        </div>
      )}

      {/* 4. 视频任务卡片列表（根据tab显示/隐藏，默认显示） */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="border rounded-lg bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">视频监控任务</h3>
            {tasksError ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-destructive">{tasksError}</div>
              </div>
            ) : (
              <TaskCardList
                tasks={tasks}
                loading={tasksLoading}
                activeTaskId={activeTaskId}
                onTaskClick={(task) => {
                  // 切换选中任务（如果已选中则取消选中）
                  setActiveTaskId(activeTaskId === task.id ? null : task.id)
                }}
              />
            )}
          </div>

          {/* 视频数据图表（展开显示） */}
          {activeTaskId && (() => {
            const activeTask = tasks.find(t => t.id === activeTaskId)
            if (!activeTask || activeTask.type !== 'video') return null
            
            return (
              <div className="border rounded-lg bg-card p-6 space-y-3">
                {/* 精简选中卡片头部区域 */}
                <div className="p-2 border rounded">
                  <div className="min-w-0 text-sm">
                    <div className="truncate" title={activeTask.title || ''}>
                      <span className="font-medium">{activeTask.title || '视频详情'}</span>
                      <span className="text-muted-foreground"> · BV：{activeTask.target_id || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Tabs + 复位同一行 */}
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-2">
                    <div className="flex items-center gap-2">
                      <button 
                        className={`h-8 px-3 rounded-md text-sm ${
                          videoChartTab === 'metrics' 
                            ? 'bg-accent text-accent-foreground' 
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`} 
                        onClick={() => setVideoChartTab('metrics')}
                      >
                        播放量 + 在线观看
                      </button>
                      <button 
                        className={`h-8 px-3 rounded-md text-sm ${
                          videoChartTab === 'engagement' 
                            ? 'bg-accent text-accent-foreground' 
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`} 
                        onClick={() => setVideoChartTab('engagement')}
                      >
                        互动数据
                      </button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const inst = videoChartTab === 'metrics' ? metricsRef.current : engagementRef.current
                        inst?.dispatchAction?.({ type: 'restore' })
                      }}
                    >
                      复位
                    </Button>
                  </div>
                  <div className="pt-3">
                    {videoChartTab === 'metrics' ? (
                      <div className="w-full">
                        <VideoMetricsChart onReady={(inst) => { metricsRef.current = inst }} />
                      </div>
                    ) : (
                      <div className="w-full">
                        <VideoEngagementChart onReady={(inst) => { engagementRef.current = inst }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 账号切换Modal */}
      <AccountSwitchModal
        open={switchModalOpen}
        onClose={() => setSwitchModalOpen(false)}
        accounts={accounts}
        currentAccountId={account?.id || null}
        onSelect={selectAccount}
      />

      {/* 博主选择Modal */}
      <AuthorSelectModal
        open={authorSelectModalOpen}
        onClose={() => setAuthorSelectModalOpen(false)}
        currentAuthorUid={currentDisplayAuthor}
        defaultAuthorUid={defaultDisplayAuthor}
        onSelect={selectAuthor}
        onSetDefault={setDefaultAuthor}
      />
    </div>
  )
}

