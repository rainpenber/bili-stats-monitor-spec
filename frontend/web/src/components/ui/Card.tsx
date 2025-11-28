import { PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm', className)}>{children}</div>
}
export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-4 border-b border-gray-100', className)}>{children}</div>
}
export function CardContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-4', className)}>{children}</div>
}
export function CardFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-4 border-t border-gray-100', className)}>{children}</div>
}

