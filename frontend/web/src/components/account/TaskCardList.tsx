import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/lib/api'

/**
 * TaskCardList - 任务卡片列表组件（使用网格布局，与CardGrid一致）
 * 
 * 显示多个任务卡片的列表
 * - 网格布局（响应式：1列/2列/4列）
 * - 支持点击查看详情
 * - 空状态处理
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-013
 */

export interface TaskCardListProps {
  tasks: Task[]
  loading?: boolean
  activeTaskId?: string | null
  onTaskClick?: (task: Task) => void
}

export function TaskCardList({ tasks, loading, activeTaskId, onTaskClick }: TaskCardListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-video border rounded-lg animate-pulse bg-muted" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          isActive={activeTaskId === task.id}
          onClick={() => onTaskClick?.(task)}
        />
      ))}
    </div>
  )
}

