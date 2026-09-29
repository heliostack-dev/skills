# Visual quality bar

Users judge "is this real or AI slop?" in about two seconds. These numbers come from measuring product-grade apps (X, Linear, the Next.js 16 social demo) with `getComputedStyle`, and they are what the Heliostack tokens encode. When in doubt, **measure a reference with the browser tool instead of guessing**:

```js
// paste into evaluate_script on a reference page
(sel) => { const s = getComputedStyle(document.querySelector(sel)); return { fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, pad: s.padding, gap: s.gap, r: s.borderRadius } }
```

## The scale

| Role | Token | Value |
|---|---|---|
| Meta (handles, timestamps, counts) | `--text-xs` + `--font-mono`, `--muted-foreground` | 12/16 |
| Labels, names, buttons, tabs, menu items | `--text-sm`, weight 500–600 | 14/20 |
| Body, nav items, inputs | `--text-md` | 16/24 |
| Page title, composer input | `--text-lg`, weight 700 for titles | 18/28 |
| Section / display | `--text-xl` … `--text-3xl` | 20–30 |
| Row padding | `--space-4 --space-5` | 16 / 20 |
| Avatar column | `--size-avatar-md` + `column-gap: --space-3` | 40 + 12 |
| Controls | `--size-control-xs/sm/md/lg` | 28 / 32 / 36 / 44 |
| Page header / tabs | `--layout-header` / `--layout-tabs` | 60 / 48 |
| Card radius / pill | `--radius-lg` / `--radius-full` | 14 / 9999 |

Never more than **three** type sizes inside one component. Hierarchy comes from weight and colour first, size second.

## Checklist (walk it with screenshots, light + dark, 1360px + 390px)

**Alignment**
- [ ] Every row in a list shares one grid: avatar column + content column (`grid-template-columns: var(--size-avatar-md) minmax(0,1fr)`), so text starts at the same x everywhere.
- [ ] Icons and text are vertically centred (`align-items: center`), not baseline-drifting; icon sizes are 16/18/20/22 only.
- [ ] Page titles, tabs and first content row align to the same left padding (`--space-5`).
- [ ] Numbers use `font-variant-numeric: tabular-nums` so counts don't jitter.

**Interaction clarity**
- [ ] Every clickable thing has a hover state that changes background (`--accent` or a 12% tint of its tone) **and** `cursor: pointer`; transitions use `--duration-fast`.
- [ ] Toggle actions show state with colour + `aria-pressed` (liked = `--like`, reposted = `--success`), and animate once on activation.
- [ ] Hit targets ≥ 28px high inside dense rows, ≥ 36px elsewhere, ≥ 44px on mobile primary actions.
- [ ] Focus is visible (`:focus-visible` ring `--ring`), never removed without a replacement.
- [ ] Disabled looks disabled (opacity .5, `cursor: not-allowed`) but primary buttons keep their fill.
- [ ] Menus open anchored to their trigger, focus the first item, close on Esc / outside click / selection.
- [ ] Whole-row links use the stretched-overlay pattern; nested buttons stay independently clickable.

**Content**
- [ ] Long names/handles truncate with ellipsis (`min-width: 0` on the flex/grid child!) instead of wrapping or overflowing.
- [ ] Chips and badges never wrap (`white-space: nowrap; flex: none`).
- [ ] Every list has an empty state (title + one sentence + an action) and a skeleton that matches the real row geometry.
- [ ] Counts of 0 are shown in action pills (steady layout), hidden in badges.

**Surfaces**
- [ ] Dark mode is near-black and neutral; borders are one step lighter than cards; no warm/blue grey unless the theme asks for it.
- [ ] Sticky headers use `color-mix(in oklch, var(--background) 72%, transparent)` + `backdrop-filter: blur(12px)` and a bottom border.
- [ ] Shadows only on floating layers (menus, dialogs, toasts, FABs) — never on in-flow cards.

## Anti-patterns that read as "AI-made"

- Oversized nav text (20px+) and giant pill buttons for secondary actions.
- Evenly spaced action icons spread across the full width with no visible hover affordance.
- Several competing accent colours; gradients on text; emoji as icons.
- Rank labels and redundant meta ("1 · Trending", "Posted by … on …") that repeat what layout already says.
- Everything bold. Use 400/500/600 deliberately; 700 only for titles and the active nav item.
