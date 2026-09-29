import type { ComponentProps } from 'react'
import { cx } from './cx.ts'
import { Icon, type IconName } from './icon.tsx'
import styles from './action-button.module.css'

export type ActionTone = 'reply' | 'repost' | 'like' | 'bookmark' | 'share'

type ActionButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName
  label: string
  tone: ActionTone
  /** Current on/off state, e.g. liked. Rendered as aria-pressed and the tone colour. */
  active?: boolean
  count?: string
}

/** Compact pill for per-item actions (like, repost, reply). Icon + optional tabular count. */
export function actionButtonStyles({ tone, active, className }: { tone: ActionTone; active?: boolean; className?: string }) {
  return cx(styles.root, styles[tone], active && styles.active, className)
}

export function ActionButton({ icon, label, tone, active, count, className, type = 'button', ...rest }: ActionButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      className={actionButtonStyles({ tone, active, className })}
      {...rest}
    >
      <ActionButtonContent icon={icon} active={active} count={count} />
    </button>
  )
}

/** Inner markup, for links or menu triggers that must look like an ActionButton. */
export function ActionButtonContent({ icon, active, count }: { icon: IconName; active?: boolean; count?: string }) {
  return (
    <>
      <Icon name={icon} size={18} filled={active && icon !== 'repeat'} className={styles.icon} />
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </>
  )
}
