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

export function ModalHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
      <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

export function ModalFooter({ children }: PropsWithChildren) {
  return <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">{children}</div>
}

export function ModalBody({ children }: PropsWithChildren) {
  return <div className="py-4">{children}</div>
}

