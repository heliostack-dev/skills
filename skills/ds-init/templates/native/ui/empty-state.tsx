import type { ReactNode } from 'react'
import styles from './empty-state.module.css'

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      {children ? <p className={styles.body}>{children}</p> : null}
      {action}
    </div>
  )
}
