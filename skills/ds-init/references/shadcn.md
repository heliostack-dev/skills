# shadcn strategy

Verified against `shadcn@4.21` (Sept 2026). The CLI evolves quickly — **run `pnpm dlx shadcn@latest <cmd> --help` before relying on a flag below** and prefer what `--help` says.

## 1. Initialise

```bash
pnpm dlx shadcn@latest init --template next --base radix --css-variables --pointer
```

- `--base` picks the primitive library: `radix` (most examples online), `base` (Base UI), `aria` (React Aria). Ask the user if they have a preference; default `radix`.
- The CLI installs Tailwind v4, writes `components.json`, `src/lib/utils.ts` (`cn`) and a `globals.css` with `@import "tailwindcss"` and default `:root` / `.dark` colour blocks.

Record in `docs/decisions/0001-shadcn.md` which packages were added (read the diff of `package.json`) — this is the sanctioned dependency exception, but it still gets written down.

## 2. Replace the colour blocks with Heliostack themes

```bash
node design/theme.mjs generate      # strategy "shadcn" → writes paths.tokens (e.g. src/app/themes.css)
```

The generated file contains, per selected theme, `:root`/`[data-theme=x]` light values, `.dark`/`[data-theme=x].dark` dark values, and an `@theme inline` block mapping every token to Tailwind colours (`bg-primary`, `text-muted-foreground`, `border-border`, `text-like`, …) plus radius scale.

In `globals.css`:

1. Keep `@import "tailwindcss";` (and any `@import` the CLI added, e.g. animation utilities) at the top.
2. `@import "./themes.css";` right after them.
3. **Delete** the CLI's own `:root { … }`, `.dark { … }` and colour entries in its `@theme inline` block — the generated file owns them. Keep non-colour rules the CLI added (e.g. `@layer base { * { @apply border-border } }`).

Dark mode: shadcn uses the `.dark` class. Use the same boot script as native (see `native.md` §3) but toggle `document.documentElement.classList.toggle('dark', …)` instead of `data-color-scheme`, and keep `data-theme` for multi-theme.

## 3. Components

Add only what the app needs, then read each generated file once — you own it now.

```bash
pnpm dlx shadcn@latest add button dialog dropdown-menu tooltip tabs avatar input textarea sonner skeleton badge
pnpm dlx shadcn@latest add dialog --dry-run      # preview before writing
pnpm dlx shadcn@latest docs dialog                # usage/API for a component
```

### Mapping to the Heliostack catalog

| Heliostack native (`src/ui`) | shadcn (`src/components/ui`) |
|---|---|
| `Button`, `buttonStyles()` | `Button`, `buttonVariants()` |
| `IconButton` | `Button size="icon" variant="ghost"` + `aria-label` |
| `ActionButton` | `Button variant="ghost" size="sm"` + per-tone `hover:text-*` classes — wrap it once as `components/action-button.tsx` |
| `Dialog` | `Dialog` / `DialogContent` / `DialogTitle` |
| `Menu`, `MenuItem`, `MenuLink` | `DropdownMenu`, `DropdownMenuItem`, `DropdownMenuItem asChild` + `Link` |
| `TabNav` (route tabs) | keep a small `Link`-based tab bar; shadcn `Tabs` is for in-page state |
| `TextField`, `TextArea` | `Input`/`Textarea` + `Label` (+ `Field` if present in the registry) |
| `Toast` / `useToast` | `sonner` (`toast()`) |
| `Avatar` | `Avatar` + `AvatarFallback` |
| `Skeleton`, `Badge` | `Skeleton`, `Badge` |
| `Icon` (sprite) | `lucide-react` icons |

Server Components can render shadcn components that have no `'use client'`; interactive ones (Dialog, DropdownMenu) are client components — keep them at the leaves exactly as with native.

## 4. Your own registry (optional)

Teams can publish their customised components as a registry so every app pulls the same code:

```bash
pnpm dlx shadcn@latest registry add @acme=https://ui.acme.dev/r/{name}.json
pnpm dlx shadcn@latest add @acme/post-card
pnpm dlx shadcn@latest search @acme            # list what the registry offers
pnpm dlx shadcn@latest build                     # build a registry from ./registry.json
pnpm dlx shadcn@latest registry validate         # check it
```

Heliostack itself may publish `@heliostack` items (post card, action button, composer) — check `https://github.com/heliostack` before re-creating them.

## 5. Rules that still apply

- Tokens only: use semantic classes (`bg-background`, `text-muted-foreground`), never `bg-[#123]` or arbitrary spacing like `p-[13px]`. Grep for `-\[` in className strings during review.
- The visual checklist in `../../ds-component/references/visual-quality.md` applies unchanged.
- `check-tokens.mjs` skips CSS scanning for this strategy; run `pnpm lint`-style grep instead:
  ```bash
  grep -rnE "className=.*-\[[^]]+\]" src | grep -v "ds-allow" || echo "no arbitrary values"
  ```
