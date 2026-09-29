# native strategy

Zero added dependencies. Styling = CSS Modules + CSS custom properties inside cascade layers. Behaviour = the platform.

## 1. Files

```
design-system.json          decisions
design/theme.mjs            vendored theme engine (generate / check / preview / from-color)
design/check-tokens.mjs     vendored token linter
design/themes/*.json        presets + custom themes
public/icons.svg            icon sprite (24×24 stroke symbols)
src/ui/
  tokens.css                GENERATED — never edit
  base.css                  reset, base typography, focus, reduced motion, utilities
  cx.ts                     class joiner (the only styling helper)
  theme.ts                  theme ids, storage keys, no-flash boot script
  inline-script.tsx         runs a script before first paint on full loads
  icon.tsx                  <Icon name> over the sprite (typed names)
  button.tsx               Button + buttonStyles() for links
  icon-button.tsx           circular icon-only chrome button
  action-button.tsx         per-item pill (icon + count) with semantic tone
  avatar.tsx, badge.tsx, spinner.tsx, skeleton.tsx, empty-state.tsx
  dialog.tsx                native <dialog> modal
  menu.tsx                  Popover API + anchor positioning dropdown
  tab-nav.tsx               route-driven tabs
  text-field.tsx, textarea.tsx, field.module.css
  toast.tsx                 top-layer toasts (manual popover)
  theme-picker.tsx          runtime theme + scheme switcher
  CATALOG.md                what exists and when to use it
```

## 2. Cascade layers (read this — it bit us)

`base.css`, `tokens.css` **and every `*.module.css`** start with the same first line:

```css
@layer reset, tokens, base, components, utilities;
```

The first stylesheet that mentions any layer fixes the layer order for the whole page, and bundlers (Turbopack included) may load a component's CSS chunk before `base.css`. Without the statement in every file, `components` can end up *below* `reset`, and e.g. `button { background: none; padding: 0 }` silently wins over your Button styles. `check-tokens.mjs` fails any CSS file missing the line.

Component rules go inside `@layer components { … }`. Page-specific CSS modules use the same layer.

## 3. Root layout wiring

```tsx
// src/app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google'
import { InlineScript } from '#/ui/inline-script.tsx'
import { themeBootScript, DEFAULT_THEME } from '#/ui/theme.ts'
import { ToastProvider } from '#/ui/toast.tsx'
import '#/ui/base.css'
import '#/ui/tokens.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-loaded', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <InlineScript html={themeBootScript} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
```

- Fonts feed `--font-sans-loaded` / `--font-mono-loaded`; tokens fall back to system stacks.
- The boot script reads `localStorage` and sets `data-theme` / `data-color-scheme` on `<html>` before paint — no flash, no cookie read, so the root layout stays static (Cache Components friendly).
- Colours use `light-dark()`: `color-scheme` on `:root` follows the OS unless `data-color-scheme` forces one.

## 4. Platform behaviours used instead of libraries

| Need | Primitive | Notes |
|---|---|---|
| Modal | `<dialog>.showModal()` | focus trap, inert page, Esc, top layer; backdrop click = `event.target === dialog` |
| Enter/exit animation | `@starting-style` + `transition-behavior: allow-discrete` on `display`/`overlay` | no JS animation lib |
| Dropdown / popover | `popover="auto"` + `popoverTarget` | light dismiss + Esc native |
| Positioning | `anchor-name` / `position-anchor` / `position-area` + `position-try-fallbacks` | `@supports not (anchor-name: --a)` → bottom sheet fallback |
| Toasts above dialogs | `popover="manual"` re-shown on change | stays in the top layer |
| Route transitions | React `<ViewTransition>` | needs no config in Next 16 |
| Long lists | `content-visibility: auto` + `contain-intrinsic-size` | virtualise only past ~2k DOM rows |
| Auto-growing textarea | `field-sizing: content` | |

See the `native-ui-primitives` skill for full patterns and browser caveats.

## 5. Verify

```bash
pnpm ds:check        # contrast ✓ + token lint ok
```

Then the visual pass in `../../ds-component/references/visual-quality.md`.
