// src/components/ui/ToastContainer.tsx

'use client'

import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type ToastType } from '@/stores/toast.store'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast__icon">{icons[t.type]}</span>
          <span className="toast__message">{t.message}</span>
          <button className="toast__close" onClick={() => remove(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}