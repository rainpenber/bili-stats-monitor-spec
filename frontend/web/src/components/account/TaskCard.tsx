import { Badge } from '@/components/ui/Badge'
import type { Task } from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * TaskCard - 任务卡片组件
 * 
 * 显示单个监控任务的信息：
 * - 任务标题/封面
 * - 任务状态
 * - 最新数据
 * - 点击可查看详情
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-013
 */

export interface TaskCardProps {
  task: Task
  onClick?: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
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

  return (
    <div
      className="p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* 封面（如果是视频任务） */}
        {task.type === 'video' && task.media?.cover_url && (
          <div className="w-32 h-18 flex-shrink-0 rounded overflow-hidden bg-muted">
            <img
              src={task.media.cover_url}
              alt={task.title || task.target_id}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 任务信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium truncate flex-1">
              {task.title || task.target_id}
            </h4>
            <Badge className={`${statusColors[task.status]} text-white text-xs`}>
              {statusLabels[task.status] || task.status}
            </Badge>
          </div>

          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <div>
              目标ID: <span className="font-mono">{task.target_id}</span>
            </div>
            
            {task.latest_sample && (
              <div className="flex gap-4">
                {task.latest_sample.play !== undefined && (
                  <div>播放: {task.latest_sample.play.toLocaleString()}</div>
                )}
                {task.latest_sample.fans !== undefined && (
                  <div>粉丝: {task.latest_sample.fans.toLocaleString()}</div>
                )}
              </div>
            )}

            {task.latest_sample?.last_collected_at && (
              <div className="text-xs">
                最后采集: {dayjs(task.latest_sample.last_collected_at).fromNow()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 原因说明（如果有） */}
      {task.reason && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
          {task.reason}
        </div>
      )}
    </div>
  )
}

