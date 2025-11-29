import { PropsWithChildren } from 'react'
import { cn } from '@/lib/cn'

export function Modal({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn('w-full max-w-xl rounded-lg bg-white shadow-lg border border-gray-200')}>{children}</div>
      </div>
    </div>
  )
}

export function ModalHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="text-sm text-gray-500 mt-1">{description}</p> : null}
    </div>
  )
}

export function ModalFooter({ children }: PropsWithChildren) {
  return <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">{children}</div>
}

export function ModalBody({ children }: PropsWithChildren) {
  return <div className="p-4">{children}</div>
}

