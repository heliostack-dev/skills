# Heliostack skills

**AI-native skills for building large, product-grade web apps on Next.js 16 + React 19.3 — with five runtime dependencies.**

Heliostack is one coherent set of decisions, written as [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills), so that an AI agent can build an app the size of X or Spotify where every generated file fits every other one. The reference app, [**Halo**](https://github.com/heliostack/halo) — a realtime social network — was built with these skills, and the skills were corrected by what building it taught us.

```
runtime dependencies:  next · react · react-dom · postgres · zod
```

## Why

Libraries mostly save typing. An agent types for free, so the benefit shrinks while the costs stay: half-remembered version-specific APIs, transitive vulnerabilities, upgrade breakage. The platform — Web APIs, `node:*`, React 19.3, Next.js 16 (which ships its own docs in `node_modules/next/dist/docs`) — is stable, documented and already installed. Heliostack leans on it and narrows every choice into a closed vocabulary: fixed tokens, a fixed component catalog, one folder layout, one action result shape.

## Install (Claude Code)

```bash
/plugin marketplace add heliostack/skills
/plugin install heliostack@heliostack
```

Other agents: point them at `AGENTS.md`, which indexes the skills.

## Skills

| Skill | Use it to… |
|---|---|
| [`heliostack`](skills/heliostack/SKILL.md) | Start here: the pinned stack, rules, and which skill to use |
| [`app-architecture`](skills/app-architecture/SKILL.md) | Bootstrap a project, decide where files go, keep boundaries |
| [`ds-init`](skills/ds-init/SKILL.md) | **Set up the design system interactively**: pick themes (7 presets or one brand colour → full OKLCH palette, WCAG-checked), scheme, radius, density, fonts, then **native vs shadcn registry** |
| [`ds-component`](skills/ds-component/SKILL.md) | Build UI inside the system: component contract, token linter, icons, visual quality bar |
| [`native-ui-primitives`](skills/native-ui-primitives/SKILL.md) | Dialogs, menus, popovers, tabs, transitions with `<dialog>`, Popover API, anchor positioning |
| [`data-layer`](skills/data-layer/SKILL.md) | Postgres with postgres.js + zod, migrations, triggers, pagination, search, local PGlite |
| [`auth`](skills/auth/SKILL.md) | Sessions with scrypt + HMAC tokens, `requireViewer`, `proxy.ts` |
| [`server-actions`](skills/server-actions/SKILL.md) | Mutations, `useActionState`, `useOptimistic`, `updateTag`/`refresh` |
| [`caching`](skills/caching/SKILL.md) | Cache Components: static shells, Suspense placement, `use cache`, invalidation |
| [`realtime`](skills/realtime/SKILL.md) | SSE + Postgres LISTEN/NOTIFY, per-viewer routing, reconnects on serverless |
| [`feeds-and-lists`](skills/feeds-and-lists/SKILL.md) | Infinite lists, dedupe, `content-visibility`, stretched-link cards |
| [`feature-slice`](skills/feature-slice/SKILL.md) | Drive a whole feature end-to-end; split work across parallel agents |
| [`testing`](skills/testing/SKILL.md) | `node:test` + real Postgres per file (PGlite), visual verification, CI |
| [`deploy-vercel`](skills/deploy-vercel/SKILL.md) | Vercel + Neon, env vars, migrations, previews |

## The design system flow

```
ds-init
 ├─ 1. themes     node scripts/theme.mjs preview → pick presets (multi) or from-color '#1d9bf0'
 ├─ 2. shape      scheme · radius · density · fonts
 ├─ 3. strategy   native (0 deps, <dialog>/popover/anchor, CSS Modules)  |  shadcn (Tailwind v4 + registry)
 ├─ 4. generate   design-system.json → tokens (light-dark() OKLCH, one semantic contract for both strategies)
 ├─ 5. install    native templates  |  shadcn init + add + optional custom registry
 └─ 6. verify     WCAG check · token lint · screenshots against the visual quality bar
```

## Lessons baked in (things that broke while building Halo)

- **Cascade layer order is set by whichever stylesheet loads first** — and bundlers may load a component chunk before `base.css`. Every CSS file now starts with `@layer reset, tokens, base, components, utilities;` and the token linter enforces it.
- Two CSS Modules setting the same property on one element have **no guaranteed order**; override other modules' classes with a parent-scoped selector.
- `order by id` after `select id::text` sorts strings; alias before casting.
- React's `autoFocus` doesn't render the HTML attribute, so `<dialog>.showModal()` focuses "Close" — use `data-autofocus`.
- Client components reading `usePathname()` need a Suspense boundary under Cache Components.
- PGlite is single-session: cross-connection `NOTIFY` never fires locally → a memory realtime driver for dev.
- A stale `.tsbuildinfo` hid route-type changes → `incremental: false` (TypeScript 7 is fast enough).

## Maintaining

`scripts/sync-templates.sh` refreshes the native component templates and theme engine from the Halo app, where they are exercised by a real product.

## License

MIT
