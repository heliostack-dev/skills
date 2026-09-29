---
name: ds-init
description: Interactive design-system setup for a Heliostack (Next.js 16 + React 19.3) app — choose colour themes (6 presets or a custom theme from a brand colour), colour scheme, radius, density and fonts, then choose the implementation strategy (native zero-dependency components vs shadcn/ui registry), and generate tokens, base styles and starter components. Use when starting a new app's UI, when the user says "set up the design system", "DS init", "pick a theme/palette", "switch to shadcn", "change our brand colour", or when `design-system.json` is missing before UI work.
---

# ds-init — design system initialiser

Produces one file of decisions (`design-system.json`) and everything derived from it. Every later UI task reads that file, so **the user makes the choices; you make them easy to compare.** Never pick a theme or strategy on the user's behalf unless they say "you choose".

`<skill>` below means this skill's directory (the folder containing this SKILL.md).

## Step 0 — Inspect the project

1. If `design-system.json` exists, read it and ask what to change (themes, strategy, or both). Re-running is safe: generation is idempotent and never touches component code.
2. Note: package manager (lockfile), `src/` or not, existing Tailwind (`@import "tailwindcss"` / `tailwind.config.*`), existing `components.json` (shadcn). Existing Tailwind/shadcn → recommend the shadcn strategy; otherwise recommend native.

## Step 1 — Themes (colour palettes)

Presets live in `<skill>/themes/*.json`. Each is **parametric** (neutral hue/chroma + primary hue/chroma/lightness); every semantic colour is derived in OKLCH and contrast-checked, so presets never drift apart.

| id | Look |
|---|---|
| `halo` | Electric blue, true-neutral greys, pure-black dark mode (product default) |
| `tidal` | Social blue on crisp grey |
| `nocturne` | Indigo on cool slate |
| `verdant` | Green on stone — media/music |
| `ember` | Rose-red on warm charcoal |
| `helios` | Solar amber on warm sand |
| `graphite` | Monochrome, true-black, OLED |

1. Render a preview and show it — don't describe colours in words:
   ```bash
   node <skill>/scripts/theme.mjs preview --out /tmp/hs-themes.html   # all presets, light + dark
   ```
   Open it for the user (browser tool screenshot, or tell them the path). Preview includes buttons, a post card, badges and swatches in both schemes.
2. Ask (multi-select) which themes to ship. The **first selected is the default**; extra themes become runtime-switchable (`<html data-theme="…">`, e.g. a Display settings page).
3. Offer **"Custom from a brand colour"**. Ask for a hex, then:
   ```bash
   node <skill>/scripts/theme.mjs from-color '#1d9bf0' --id brand --label "Brand" --dir design/themes
   node <skill>/scripts/theme.mjs check --themes brand       # WCAG report; must be all ✓
   ```
   If `check` fails, adjust `primary.light`/`primary.dark` in the generated JSON by ±0.03 and re-check. Never ship a failing theme.

## Step 2 — Shape and type

Ask in one question round (defaults in bold):

- Colour scheme: **system** · light · dark
- Radius: none · sm · **md** · lg · xl (scales every `--radius-*`)
- Density: compact · **comfortable** · spacious (scales `--space-*`)
- Fonts: **Geist + Geist Mono** (via `next/font/google`, no dependency) · system stack · other Google font

## Step 3 — Implementation strategy

Present this table, recommend per Step 0, and let the user choose:

| | **native** (Heliostack default) | **shadcn** |
|---|---|---|
| Runtime deps added | 0 | Tailwind v4 + Radix primitives + `class-variance-authority` + `lucide-react` … (~10–30 packages) |
| Styling | CSS Modules + CSS variables, `@layer` cascade | Tailwind utility classes |
| Behaviour | Platform: `<dialog>`, Popover API, CSS anchor positioning, `<ViewTransition>` | Radix (battle-tested on old browsers) |
| Components | ~20 starters copied from `<skill>/templates/native`, extended with `ds-component` | Pulled from the shadcn registry (or your own registry) with the CLI |
| Best when | Greenfield, minimal deps, you want full ownership | Team already knows Tailwind/shadcn, need many complex widgets fast (data tables, command palette, calendars) |

Both strategies use **the same semantic colour contract** (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, …, shadcn-compatible names), so switching later is a regeneration plus component swap, not a redesign.

## Step 4 — Write the config and vendor the engine

Write `design-system.json` at the project root:

```json
{
  "version": 1,
  "strategy": "native",
  "themes": ["halo", "graphite"],
  "colorScheme": "system",
  "radius": "md",
  "density": "comfortable",
  "font": { "sans": "Geist", "mono": "Geist_Mono" },
  "icons": "sprite",
  "themeDirs": ["design/themes"],
  "paths": { "tokens": "src/ui/tokens.css", "base": "src/ui/base.css", "components": "src/ui", "catalog": "src/ui/CATALOG.md" }
}
```

For shadcn use `"strategy": "shadcn"`, `"icons": "lucide"`, `"paths": { "tokens": "src/app/themes.css", "components": "src/components/ui" }`.

Vendor the engine so the project never depends on this skill being installed:

```bash
mkdir -p design/themes
cp <skill>/scripts/theme.mjs design/theme.mjs
cp <skill>/themes/*.json design/themes/
cp <skill>/../ds-component/scripts/check-tokens.mjs design/check-tokens.mjs
node design/theme.mjs generate          # writes paths.tokens
```

Add scripts: `"ds:generate": "node design/theme.mjs generate"`, `"ds:check": "node design/theme.mjs check && node design/check-tokens.mjs"`.

## Step 5a — native strategy

Follow `references/native.md`. In short:

1. Copy `<skill>/templates/native/ui/*` → `src/ui/` and `<skill>/templates/native/public/icons.svg` → `public/icons.svg`.
2. Wire the root layout (fonts, `data-theme`, the no-flash boot script, `ToastProvider`, CSS imports) exactly as in `references/native.md`.
3. `node design/check-tokens.mjs` must print `ok`.

## Step 5b — shadcn strategy

Follow `references/shadcn.md` (Tailwind v4 install, `shadcn init`, replacing the CLI's colour blocks with the generated theme file, the component mapping, and custom registries).

## Step 6 — Verify visually (mandatory)

Numbers passing is not enough — users judge by eye.

1. `pnpm ds:check` → all ✓ and `ok`.
2. Start the app and screenshot a page that uses Button, a card list, a menu and a dialog, in **light and dark**, at **1360px and 390px** wide.
3. Walk the checklist in `../ds-component/references/visual-quality.md` (alignment grid, hit targets, hover/focus/pressed states, truncation). Fix before reporting done.

## Step 7 — Record the decision

Append to `AGENTS.md` (create if missing):

```md
## Design system
Decisions live in `design-system.json` (strategy: native|shadcn, themes, radius, density).
Regenerate tokens with `pnpm ds:generate`; never edit the generated tokens file.
Before any UI work read `src/ui/CATALOG.md` and use the `ds-component` skill.
```

## Changing things later

- New brand colour → Step 1.3 + `pnpm ds:generate`. No component changes.
- Add/remove a theme → edit `themes` and regenerate.
- native → shadcn: run Step 5b, then replace imports component-by-component using the mapping table in `references/shadcn.md`; delete `src/ui/*` only when nothing imports it.
- shadcn → native: Step 5a, then the same mapping in reverse.
