'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx.ts'
import { Icon, type IconName } from './icon.tsx'
import { iconButtonStyles } from './icon-button.tsx'
import styles from './menu.module.css'

type MenuProps = {
  /** Accessible name of the trigger. */
  label: string
  icon?: IconName
  /** Custom trigger content; defaults to an icon button. */
  trigger?: ReactNode
  triggerClassName?: string
  align?: 'start' | 'end'
  children: ReactNode
}

/**
 * Dropdown menu on the Popover API: top layer, light dismiss and Escape are native.
 * Positioned with CSS anchor positioning; falls back to a bottom sheet where unsupported.
 */
export function Menu({ label, icon = 'more', trigger, triggerClassName, align = 'end', children }: MenuProps) {
  const id = useId()
  const anchor = `--menu-${id.replace(/[^a-zA-Z0-9]/g, '')}`
  const popover = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(popover.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    const move = { ArrowDown: 1, ArrowUp: -1 }[event.key]
    if (move) {
      event.preventDefault()
      items.at((index + move) % items.length)?.focus()
    } else if (event.key === 'Home') items[0]?.focus()
    else if (event.key === 'End') items.at(-1)?.focus()
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        aria-haspopup="menu"
        title={trigger ? undefined : label}
        className={trigger ? cx(styles.trigger, triggerClassName) : iconButtonStyles({ size: 'sm', className: cx(styles.more, triggerClassName) })}
        style={{ anchorName: anchor } as React.CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        {trigger ?? <Icon name={icon} size={18} />}
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        className={cx(styles.menu, styles[align])}
        style={{ positionAnchor: anchor } as React.CSSProperties}
        onKeyDown={onKeyDown}
        onToggle={(event) => {
          if (event.newState === 'open') popover.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
        }}
        onClick={(event) => {
          event.stopPropagation()
          if ((event.target as HTMLElement).closest('[role="menuitem"]')) popover.current?.hidePopover()
        }}
      >
        {children}
      </div>
    </>
  )
}

type ItemBase = { icon?: IconName; children: ReactNode; tone?: 'default' | 'danger' }

export function MenuItem({ icon, children, tone = 'default', onSelect, disabled, type = 'button', form, formAction }: ItemBase & {
  onSelect?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  form?: string
  formAction?: (formData: FormData) => void | Promise<void>
}) {
  return (
    <button
      type={type}
      role="menuitem"
      form={form}
      formAction={formAction}
      className={cx(styles.item, tone === 'danger' && styles.danger)}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (event) => event.preventDefault() : onSelect}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  )
}

export function MenuLink({ icon, children, href, tone = 'default' }: ItemBase & { href: Route }) {
  return (
    <Link role="menuitem" href={href} className={cx(styles.item, tone === 'danger' && styles.danger)}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </Link>
  )
}

export function MenuSeparator() {
  return <hr className={styles.separator} />
}
