'use client'

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from './cx.ts'
import styles from './toast.module.css'

type Toast = { id: number; message: ReactNode; tone: 'default' | 'danger'; action?: { label: string; onClick: () => void } }
type ShowToast = (message: ReactNode, options?: Partial<Omit<Toast, 'id' | 'message'>>) => void

const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const show = use(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}

/** Toasts live in a manual popover so they render in the top layer, above open dialogs. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const region = useRef<HTMLDivElement>(null)
  const next = useRef(0)

  const show = useCallback<ShowToast>((message, options) => {
    const id = ++next.current
    setToasts((list) => [...list.slice(-2), { id, message, tone: 'default', ...options }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    const el = region.current
    if (!el) return
    // Re-show on every change so the region stays above any dialog opened after it.
    if (el.matches(':popover-open')) el.hidePopover()
    if (toasts.length) el.showPopover()
  }, [toasts])

  return (
    <ToastContext value={show}>
      {children}
      <div ref={region} popover="manual" className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cx(styles.toast, toast.tone === 'danger' && styles.danger)}>
            <span>{toast.message}</span>
            {toast.action ? (
              <button type="button" className={styles.action} onClick={toast.action.onClick}>
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
