import { useEffect } from 'react'
import { IconX } from './Icons.jsx'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-display text-lg font-medium text-ink">{title}</p>
          <button onClick={onClose} className="text-ink/40 hover:text-ink" aria-label="Close">
            <IconX className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
