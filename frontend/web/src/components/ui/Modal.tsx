import { PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export function Modal({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ 
  title, 
  description, 
  onClose 
}: { 
  title: string
  description?: string
  onClose?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="关闭"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

export function ModalFooter({ children }: PropsWithChildren) {
  return <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">{children}</div>
}

export function ModalBody({ children }: PropsWithChildren) {
  return <div className="py-4">{children}</div>
}

