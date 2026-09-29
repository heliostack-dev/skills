---
name: native-ui-primitives
description: Build interactive UI with browser primitives instead of libraries in React 19.3 — native dialog modals, Popover API menus, CSS anchor positioning with fallbacks, @starting-style enter/exit animations, route-driven tabs, intercepted-route modals, ViewTransition, field-sizing, and hydration-safe client values (useSyncExternalStore, inline scripts). Use when building modals, dropdowns, menus, tooltips, tabs, toasts, animations, or fixing focus/positioning/hydration issues in the native strategy.
---

# native-ui-primitives

Rule of thumb: if the browser has an element or attribute for it, use it; add JS only for what the platform can't express.

## Modal — `<dialog>`

```tsx
useEffect(() => {
  const d = ref.current!
  if (open && !d.open) { d.showModal(); d.querySelector<HTMLElement>('[data-autofocus]')?.focus() }
  if (!open && d.open) d.close()
}, [open])

<dialog ref={ref} aria-labelledby={titleId}
  onClose={() => onOpenChange(false)}                                   // Esc, form[method=dialog], .close()
  onCancel={(e) => { if (!dismissible) e.preventDefault() }}
  onClick={(e) => { if (dismissible && e.target === e.currentTarget) onOpenChange(false) }}>  {/* backdrop click */}
```

Free from the platform: top layer, inert background, focus trap, Esc. Gotchas:
- `showModal()` focuses the first focusable element (often "Close"). React's `autoFocus` doesn't render the HTML attribute, so opt content in with `data-autofocus`.
- Backdrop clicks target the `<dialog>` itself only if the content is wrapped in an inner panel element.
- Full-screen on phones: `@media (width < 40rem) { .dialog { width: 100%; height: 100dvh; margin: 0; border-radius: 0 } }`.

### Enter/exit without an animation library

```css
.dialog { opacity: 0; translate: 0 var(--space-4);
  transition: opacity var(--duration-normal), translate var(--duration-normal),
              overlay var(--duration-normal) allow-discrete, display var(--duration-normal) allow-discrete; }
.dialog[open] { opacity: 1; translate: 0 0; }
@starting-style { .dialog[open] { opacity: 0; translate: 0 var(--space-4); } }
```

Same recipe for `::backdrop` and `:popover-open`.

### Modals as routes

`app/(app)/@modal/(.)compose/post/page.tsx` intercepts client navigations to `/compose/post` and renders a dialog over the current page; a direct visit renders `app/(app)/compose/post/page.tsx` (dialog over a placeholder). `@modal/default.tsx` returns `null`. Close = `router.back()`. The URL is shareable and Back closes the modal.

## Menu — Popover API + anchor positioning

```tsx
<button popoverTarget={id} aria-haspopup="menu" style={{ anchorName: `--menu-${safeId}` }}>…</button>
<div id={id} popover="auto" role="menu" style={{ positionAnchor: `--menu-${safeId}` }}
  onToggle={(e) => e.newState === 'open' && firstItem()?.focus()}
  onKeyDown={arrowKeyNavigation}
  onClick={(e) => (e.target as HTMLElement).closest('[role=menuitem]') && popover.current?.hidePopover()}>
```

```css
@supports (anchor-name: --a) {
  .menu { margin: var(--space-1) 0; position-try-fallbacks: flip-block, flip-inline; }
  .end   { position-area: block-end span-inline-start; }
  .start { position-area: block-end span-inline-end; }
}
@supports not (anchor-name: --a) {             /* graceful fallback: bottom sheet */
  .menu { inset: auto 0 0 0; width: 100%; margin: 0; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
}
```

- `useId()` output contains characters invalid in dashed idents — strip to `[a-zA-Z0-9]`.
- `popover="auto"` gives light dismiss + Esc and closes other auto popovers. Toasts use `popover="manual"` and re-`showPopover()` on change to stay above newly opened dialogs.
- Menu items are real `<button role="menuitem">` / `<Link role="menuitem">`; form submission from a menu item: `type="submit" form="logout-form"`.
- Inside a card with an overlay link, `stopPropagation()` on the trigger and popover click handlers.

## Tabs — the URL is the state

Route tabs (`/home`, `/home/following`) are `<Link aria-current="page">` in a `<nav>`, active state from `usePathname()` (inside Suspense). Search-param tabs (`?tab=people`) are links too. In-page state tabs are rare; prefer routes (shareable, back button works, server-rendered).

## Transitions

- Route/content transitions: React `<ViewTransition>` (works in Next 16 App Router without config); name shared elements with the same `name` on both pages.
- Respect `prefers-reduced-motion` (base.css disables animations and view-transition animations globally).
- One-shot feedback (like "pop"): a CSS `@keyframes` on the `.active` class — no JS.

## Forms

- `field-sizing: content` for auto-growing textareas.
- Floating vs top labels: Halo uses top labels (12px) + 44px inputs; errors via `aria-invalid` + `aria-describedby` → message with `role="alert"`.
- `:has(:checked)` / `:has(:focus-visible)` styles custom radio cards (theme picker) with visually-hidden native inputs.

## Hydration-safe client-only values

| Value | Pattern |
|---|---|
| Relative time ("5m") | `useSyncExternalStore(subscribe, () => roundedNow, () => null)` — server snapshot renders an absolute date, the client swaps after hydration, one shared timer ticks every 30 s |
| Theme from localStorage | inline boot script in `<body>` before content (`InlineScript`) sets `data-theme` pre-paint; the switcher uses `useSyncExternalStore` over `<html>` attributes |
| Locale-formatted dates | server renders UTC with an explicit `timeZone`; see Next's "preventing flash before hydration" guide for per-element inline scripts |

Never read `window`, `localStorage` or `Date.now()` during render of a component that also renders on the server.

## Browser support stance

Target evergreen browsers. Anchor positioning and `@starting-style` degrade gracefully (fallback layout / no animation). Before relying on a newer feature, wrap it in `@supports` and describe the fallback in a comment.
