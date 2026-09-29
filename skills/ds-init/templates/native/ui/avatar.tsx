import { cx } from './cx.ts'
import styles from './avatar.module.css'

type AvatarProps = {
  name: string
  /** 0–359. Generated per user so avatars are distinct without uploads. */
  hue: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, hue, size = 'md', className }: AvatarProps) {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?'
  return (
    <span className={cx(styles.avatar, styles[size], className)} style={{ '--_hue': hue } as React.CSSProperties} aria-hidden="true">
      {initial}
    </span>
  )
}
