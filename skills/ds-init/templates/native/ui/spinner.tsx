import { cx } from './cx.ts'
import styles from './spinner.module.css'

export function Spinner({ size = 'md', label = 'Loading', className }: { size?: 'sm' | 'md' | 'lg'; label?: string; className?: string }) {
  return <span role="status" aria-label={label} className={cx(styles.spinner, styles[size], className)} />
}
