import type { ComponentProps } from 'react'
import { cx } from './cx.ts'
import { Icon, type IconName } from './icon.tsx'
import styles from './icon-button.module.css'

type Size = 'sm' | 'md' | 'lg'

type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName
  /** Required: icon-only buttons need an accessible name. Also used as the native tooltip. */
  label: string
  size?: Size
  variant?: 'ghost' | 'outline'
}

const ICON_SIZE = { sm: 16, md: 18, lg: 20 } as const

/** Circular icon-only button for chrome: close, back, overflow menus, toolbar actions. */
export function iconButtonStyles({ size = 'md', variant = 'ghost', className }: { size?: Size; variant?: 'ghost' | 'outline'; className?: string } = {}) {
  return cx(styles.root, styles[size], styles[variant], className)
}

export function IconButton({ icon, label, size = 'md', variant = 'ghost', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={iconButtonStyles({ size, variant, className })} {...rest}>
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  )
}
