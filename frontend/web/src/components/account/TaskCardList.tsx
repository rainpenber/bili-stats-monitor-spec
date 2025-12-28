import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/lib/api'

/**
 * TaskCardList - 任务卡片列表组件
 * 
 * 显示多个任务卡片的列表
 * - 垂直堆叠
 * - 支持点击查看详情
 * - 空状态处理
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-013
 */

export interface TaskCardListProps {
  tasks: Task[]
  loading?: boolean
  onTaskClick?: (task: Task) => void
}

export function TaskCardList({ tasks, loading, onTaskClick }: TaskCardListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 border rounded-lg animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="暂无视频任务"
        description="该账号尚未添加任何视频监控任务"
      />
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick?.(task)}
        />
      ))}
    </div>
  )
}

