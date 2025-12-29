import { Badge } from '@/components/ui/Badge'
import type { Task } from '@/lib/api'
import { toWan } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * TaskCard - 任务卡片组件（与VideoCard样式一致）
 * 
 * 显示单个监控任务的信息：
 * - 视频封面（aspect-video）
 * - 任务标题
 * - 播放量
 * - 状态标签
 * - 点击可展开详情图表
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-013
 */

export interface TaskCardProps {
  task: Task
  onClick?: () => void
  isActive?: boolean
}

export function TaskCard({ task, onClick, isActive }: TaskCardProps) {
  const statusColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-gray-500',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
  }

  const statusLabels: Record<string, string> = {
    running: '运行中',
    stopped: '已停止',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
  }

  const playCount = task.latest_sample?.play ?? 0
  const coverUrl = task.media?.cover_url || 'https://via.placeholder.com/320x180?text=Cover'

  return (
    <div 
      className={cn(
        'card card-hover overflow-hidden cursor-pointer relative',
        isActive && 'outline-primary'
      )} 
      onClick={onClick}
    >
      <div className="aspect-video bg-muted relative">
        <img src={coverUrl} alt={task.title || task.target_id} className="w-full h-full object-cover" />
        {/* 状态标签（右上角） */}
        <Badge 
          className={cn(
            'absolute top-2 right-2 text-white text-xs',
            statusColors[task.status] || 'bg-gray-500'
          )}
        >
          {statusLabels[task.status] || task.status}
        </Badge>
      </div>
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium line-clamp-2" title={task.title || task.target_id}>
          {task.title || task.target_id}
        </div>
        <div className="text-xs text-muted-foreground">
          {playCount > 0 ? toWan(playCount) : '暂无数据'}
        </div>
        {task.reason && (
          <div className="text-xs text-muted-foreground line-clamp-1" title={task.reason}>
            {task.reason}
          </div>
        )}
      </div>
    </div>
  )
}

