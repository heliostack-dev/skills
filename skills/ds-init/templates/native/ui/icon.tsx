import type { SVGProps } from 'react'
import { cx } from './cx.ts'
import styles from './icon.module.css'

// Keep in sync with public/icons.svg (ds-component adds both at once).
export const ICON_NAMES = [
  'logo', 'home', 'search', 'bell', 'mail', 'bookmark', 'user', 'users', 'settings', 'heart', 'repeat',
  'reply', 'quote', 'share', 'more', 'close', 'arrow-left', 'arrow-up', 'plus', 'check', 'image', 'logout',
  'sun', 'moon', 'monitor', 'trending', 'calendar', 'map-pin', 'link', 'trash', 'send', 'palette',
  'sparkles', 'verified',
] as const

export type IconName = (typeof ICON_NAMES)[number]

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: 16 | 18 | 20 | 22 | 24 | 28
  /** Accessible name. Omit for decorative icons next to visible text. */
  label?: string
  /** Fill the shape (e.g. a liked heart). */
  filled?: boolean
}

export function Icon({ name, size = 20, label, filled, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cx(styles.icon, filled && styles.filled, className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  )
}
