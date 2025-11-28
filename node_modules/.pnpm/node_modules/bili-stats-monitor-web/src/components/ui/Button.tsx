import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'default', size = 'md', ...props }, ref
) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<NonNullable<Props['variant']>, string> = {
    default: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-300',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-900',
    ghost: 'hover:bg-gray-100 text-gray-800',
    destructive: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-300',
  }
  const sizes: Record<NonNullable<Props['size']>, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-6 text-base',
  }
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
})

