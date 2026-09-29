---
name: ds-component
description: Add, change or review UI components and styles in a Heliostack app so they stay inside the design system — tokens only, the component contract, icons via the sprite, the visual quality checklist, and screenshot verification. Use for any UI work after ds-init: "add a component", "build this screen", "style this", "make it look better", "fix alignment", "add an icon", reviewing UI diffs, or when the UI "looks AI-generated".
---

# ds-component — building inside the design system

Read `design-system.json` first. `strategy` decides the toolbox:

- `native` → this skill's rules below, components in `src/ui/`.
- `shadcn` → `../ds-init/references/shadcn.md` §3–5 (same visual rules, Tailwind vocabulary).

Then read `src/ui/CATALOG.md` (native) and **reuse before you create**.

## Decide: reuse, compose, or create

1. A catalog component does it → use it. Don't restyle it locally; if it's wrong everywhere, fix it in `src/ui`.
2. It's a composition of catalog parts specific to one feature (a post card, a notification row) → build it in `src/features/<feature>/components/`, styled with tokens, *not* in `src/ui`.
3. It's generic and needed by ≥2 features (a segmented control, a popover card) → create it in `src/ui` with the contract below and add it to `CATALOG.md`.

## The component contract (native)

```tsx
// src/ui/segmented.tsx
import type { ComponentProps } from 'react'
import { cx } from './cx.ts'
import styles from './segmented.module.css'

type Size = 'sm' | 'md'

/** One-line purpose. When to use it, when not to. */
export function segmentedStyles({ size = 'md', className }: { size?: Size; className?: string } = {}) {
  return cx(styles.root, styles[size], className)
}

export function Segmented({ size, className, ...rest }: ComponentProps<'div'> & { size?: Size }) {
  return <div role="radiogroup" className={segmentedStyles({ size, className })} {...rest} />
}
```

- **Server-safe by default.** Add `'use client'` only if the component itself needs state/effects/handlers; prefer native behaviour (details/summary, popover, dialog, `:has()`, `:checked`) over JS.
- **Variants are props that map to class names**, exposed also as a `xxxStyles()` function so links and menu triggers can look identical (`buttonStyles`, `iconButtonStyles`, `actionButtonStyles`).
- **Spread the native element's props** (`ComponentProps<'button'>`) and pass `ref` through props (React 19 — no `forwardRef`).
- Icon-only controls **require** `label` (becomes `aria-label` + `title`).
- Toggleable controls take `active` → `aria-pressed`.
- One `.tsx` + one `.module.css` per component, < 150 lines each.

## CSS rules

Every CSS file:

```css
@layer reset, tokens, base, components, utilities;   /* line 1, always — see ds-init/references/native.md §2 */

@layer components {
  .root { … }
}
```

- Values come from tokens: `--space-*`, `--text-*`/`--leading-*`, `--weight-*`, `--radius-*`, `--size-*`, `--duration-*`, `--ease-*`, `--z-*`, and semantic colours. Tints: `color-mix(in oklch, var(--primary) 12%, transparent)`.
- Private per-component variables start with `--_` (`--_tone`, `--_bg`) and are set by variant classes.
- A deliberate exception gets `/* ds-allow: reason */` on the same line. Expect reviewers to question every one.
- Layout: grid for 2-D alignment (avatar column + content), flex for one axis; `min-width: 0` on every shrinking child.

Run after every change:

```bash
node design/check-tokens.mjs    # must print "ds check-tokens: ok"
```

## Icons

`public/icons.svg` holds `<symbol id="name" viewBox="0 0 24 24">` stroke icons (2px, round caps; fill/stroke come from `<Icon>`). To add one: append a symbol (draw on the 24px grid, stroke-only, reuse Lucide geometry where licences allow), add its id to `ICON_NAMES` in `src/ui/icon.tsx` (keeps names typed), use `<Icon name="…" size={16|18|20|22} />`. Decorative icons next to text get no label; standalone icons get `label`.

## Tokens and themes

Need a new semantic colour (like `--like`)? Add it to `COLOR_TOKENS` and both palettes in `design/theme.mjs` (and upstream in the ds-init skill), regenerate, re-run `node design/theme.mjs check`. Never hard-code a colour to "just get it done".

## Verify like a designer

1. Screenshot the screen you touched (light + dark, desktop + 390px) with the browser tool.
2. Compare against `references/visual-quality.md` — alignment grid, hover/focus/pressed states, truncation, empty and loading states.
3. If the user gave a reference product, measure it (`getComputedStyle`) and match numbers, not vibes.
4. Only then report done, with the screenshot.

## Updating the catalog

`src/ui/CATALOG.md` has one entry per component: name, file, one-line purpose, props, "use for / don't use for". Keep it current — it is what the next agent reads first.
