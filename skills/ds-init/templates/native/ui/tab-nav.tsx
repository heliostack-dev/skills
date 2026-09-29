'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { cx } from './cx.ts'
import styles from './tab-nav.module.css'

export type TabNavItem = { href: Route; label: string; /** Match nested paths too. */ prefix?: boolean }

/** Route-driven tabs: each tab is a link, the URL is the state. */
export function TabNav({ items, label, sticky }: { items: TabNavItem[]; label: string; sticky?: boolean }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className={cx(styles.nav, sticky && styles.sticky)}>
      {items.map((item) => {
        const current = item.prefix ? pathname.startsWith(item.href) : pathname === item.href
        return (
          <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined} className={styles.tab} scroll={false}>
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
