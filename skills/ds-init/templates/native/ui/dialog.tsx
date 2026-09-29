'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from './cx.ts'
import { IconButton } from './icon-button.tsx'
import styles from './dialog.module.css'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Visually hide the title (it still names the dialog for screen readers). */
  hideTitle?: boolean
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Allow Escape / backdrop click to close. */
  dismissible?: boolean
  headerAction?: ReactNode
}

/**
 * Modal built on the native <dialog>: focus trap, inert background, Escape and top-layer
 * stacking come from the browser. We only add light-dismiss and enter/exit transitions.
 */
export function Dialog({ open, onOpenChange, title, hideTitle, children, size = 'md', dismissible = true, headerAction }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first focusable element (usually Close). React's autoFocus doesn't
      // render the HTML attribute, so content opts in with data-autofocus instead.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={titleId}
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault()
      }}
      onClick={(event) => {
        // A click whose target is the <dialog> itself landed on the backdrop.
        if (dismissible && event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          {dismissible ? <IconButton icon="close" label="Close" onClick={() => onOpenChange(false)} /> : null}
          <h2 id={titleId} className={cx(styles.title, hideTitle && 'visually-hidden')}>
            {title}
          </h2>
          {headerAction ? <div className={styles.action}>{headerAction}</div> : null}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  )
}
