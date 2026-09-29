import type { ComponentProps } from 'react'
import { cx } from './cx.ts'
import { Spinner } from './spinner.tsx'
import styles from './button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverted'
export type ButtonSize = 'sm' | 'md' | 'lg'

type StyleOptions = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string }

/** Class names for anything that should look like a button — use with <Link> for navigation. */
export function buttonStyles({ variant = 'primary', size = 'md', block, className }: StyleOptions = {}) {
  return cx(styles.button, styles[variant], styles[size], block && styles.block, className)
}

type ButtonProps = ComponentProps<'button'> & StyleOptions & {
  /** Shows a spinner, sets aria-busy and blocks further clicks. */
  pending?: boolean
}

export function Button({ variant, size, block, pending, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, block, className })}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? <Spinner size="sm" label="Working" /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  )
}
