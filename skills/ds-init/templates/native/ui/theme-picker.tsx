'use client'

import { useSyncExternalStore } from 'react'
import { Icon, type IconName } from './icon.tsx'
import { COLOR_SCHEMES, DEFAULT_THEME, SCHEME_STORAGE_KEY, THEMES, THEME_STORAGE_KEY, type ColorScheme } from './theme.ts'
import styles from './theme-picker.module.css'

const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn))
const read = () => {
  const d = document.documentElement
  return `${d.dataset.theme ?? DEFAULT_THEME}|${d.dataset.colorScheme ?? 'system'}`
}

function apply(theme: string, scheme: ColorScheme) {
  const d = document.documentElement
  d.dataset.theme = theme
  if (scheme === 'system') delete d.dataset.colorScheme
  else d.dataset.colorScheme = scheme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    localStorage.setItem(SCHEME_STORAGE_KEY, scheme)
  } catch {}
  listeners.forEach((fn) => fn())
}

const SCHEME_ICON: Record<ColorScheme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/** Theme + colour-scheme switcher. State lives on <html>; localStorage persists it. */
export function ThemePicker() {
  const [theme, scheme] = useSyncExternalStore(subscribe, read, () => `${DEFAULT_THEME}|system`).split('|') as [string, ColorScheme]
  return (
    <div className={styles.root}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Colour</legend>
        <div className={styles.swatches}>
          {THEMES.map((t) => (
            <label key={t} className={styles.swatch} data-theme={t} title={t}>
              <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => apply(t, scheme)} className="visually-hidden" />
              <span className={styles.dot} />
              <span className={styles.name}>{t}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Appearance</legend>
        <div className={styles.schemes}>
          {COLOR_SCHEMES.map((s) => (
            <label key={s} className={styles.scheme}>
              <input type="radio" name="scheme" value={s} checked={scheme === s} onChange={() => apply(theme, s)} className="visually-hidden" />
              <Icon name={SCHEME_ICON[s]} size={18} />
              <span>{s[0]!.toUpperCase() + s.slice(1)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
