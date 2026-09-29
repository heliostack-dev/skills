import { cx } from './cx.ts'
import styles from './badge.module.css'

/** Unread counts and small status labels. Renders nothing for 0. */
export function Badge({ count, label, className }: { count?: number; label?: string; className?: string }) {
  if (count !== undefined && count <= 0) return null
  const text = count === undefined ? label : count > 99 ? '99+' : String(count)
  return <span className={cx(styles.badge, className)}>{text}</span>
}
