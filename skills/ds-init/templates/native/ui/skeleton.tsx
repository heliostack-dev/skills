import { cx } from './cx.ts'
import styles from './skeleton.module.css'

export function Skeleton({ width, height, round, className }: { width?: string; height?: string; round?: boolean; className?: string }) {
  return <span aria-hidden="true" className={cx(styles.skeleton, round && styles.round, className)} style={{ width, height }} />
}
