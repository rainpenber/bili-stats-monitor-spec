import { PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>{children}</div>
}
export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)}>{children}</div>
}
export function CardContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>
}
export function CardFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('flex items-center p-6 pt-0', className)}>{children}</div>
}

