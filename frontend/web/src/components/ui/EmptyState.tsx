import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title = '暂无数据', description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {action && (
            <div className="pt-4">
              {action}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

