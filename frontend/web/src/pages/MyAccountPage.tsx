import { useEffect, useState } from 'react'
import { useSelectedAccount } from '@/hooks/useSelectedAccount'
import { useAuthorMetrics } from '@/hooks/useAuthorMetrics'
import { fetchTasksByAuthorUid } from '@/lib/api'
import { AccountDataDashboard } from '@/components/account/AccountDataDashboard'
import { FollowerChart } from '@/components/account/FollowerChart'
import { TaskCardList } from '@/components/account/TaskCardList'
import { AccountSwitchModal } from '@/components/account/AccountSwitchModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import type { Task } from '@/lib/api'

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
  const { data: metricsData, loading: metricsLoading, error: metricsError } = useAuthorMetrics(account?.uid || null)
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [switchModalOpen, setSwitchModalOpen] = useState(false)

  // 加载该账号的视频任务
  useEffect(() => {
    if (!account?.uid) {
      setTasks([])
      return
    }

    let isMounted = true

    const loadTasks = async () => {
      try {
        setTasksLoading(true)
        setTasksError(null)

        const response = await fetchTasksByAuthorUid(account.uid)
        
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
  }, [account?.uid])

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
          icon="⚠️"
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
          icon="👤"
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

  return (
    <div className="container-page py-6 space-y-6">
      {/* 1. 已选择账号 + 切换按钮 */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {account.avatar ? (
              <img src={account.avatar} alt={account.nickname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <div>
            <div className="font-semibold">{account.nickname}</div>
            <div className="text-sm text-muted-foreground">UID: {account.uid}</div>
          </div>
        </div>
        
        {accounts.length > 1 && (
          <Button variant="outline" onClick={() => setSwitchModalOpen(true)}>
            切换账号
          </Button>
        )}
      </div>

      {/* 2. 数据仪表板 */}
      <AccountDataDashboard
        totalVideos={totalVideos}
        followerCount={latestFollowerCount}
        loading={metricsLoading}
      />

      {/* 3. 粉丝数量图表 */}
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

      {/* 4. 视频任务卡片列表 */}
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
            onTaskClick={(task) => {
              // TODO: 打开任务详情（可选功能）
              console.log('Clicked task:', task)
            }}
          />
        )}
      </div>

      {/* 账号切换Modal */}
      <AccountSwitchModal
        open={switchModalOpen}
        onClose={() => setSwitchModalOpen(false)}
        accounts={accounts}
        currentAccountId={account?.id || null}
        onSelect={selectAccount}
      />
    </div>
  )
}

