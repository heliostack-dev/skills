---
name: heliostack
description: Entry point and ground rules for building or changing a Heliostack app (Next.js 16 + React 19.3, Cache Components, postgres.js + zod, native-first UI, near-zero dependencies). Use at the start of any task in a repo that has `heliostack.json` or `design-system.json`, when the user asks to start a new Heliostack app, or when unsure which Heliostack skill applies. Routes to the specialised skills.
---

# Heliostack

Heliostack is a way of building large, product-grade web apps (think X, Spotify, Linear) where **an AI agent writes most of the code** and the platform does most of the work. The skills in this plugin encode one coherent set of decisions so that every generated file fits every other one.

## The stack (pinned decisions)

| Concern | Decision | Never add instead |
|---|---|---|
| Framework | `next@16.3` App Router, `cacheComponents: true`, `partialPrefetching: true`, Turbopack | pages router, custom servers |
| UI runtime | `react@19.3` — Server Components, Actions, `use`, `useOptimistic`, `useActionState`, `useEffectEvent`, `<Activity>`, `<ViewTransition>` | state libraries, data-fetching libraries |
| Data | Postgres (Neon via Vercel Marketplace) + `postgres` (postgres.js) with raw tagged SQL | ORMs, query builders |
| Validation | `zod@4` at every trust boundary | hand-rolled validators, a second schema lib |
| Auth | Own sessions: Web Crypto HMAC cookies + `node:crypto` scrypt, sessions table | auth SaaS SDKs (unless the user asks) |
| Realtime | Server-Sent Events + Postgres `LISTEN/NOTIFY`, client auto-reconnect | websocket SaaS, socket.io |
| UI system | Decided per project by `ds-init` (native or shadcn) | mixing both |
| Tests | `node:test` + PGlite (real Postgres in WASM) + Playwright for E2E | jest, vitest, docker in unit tests |
| Types | TypeScript strict, `tsc --noEmit` in CI | `any`, `@ts-ignore` without a reason comment |

**Runtime dependency budget:** `next`, `react`, `react-dom`, `postgres`, `zod`. Five. Anything else needs a written justification in `docs/decisions/` (see "Adding a dependency" below). The shadcn strategy from `ds-init` is the one sanctioned exception, and it is recorded in `design-system.json`.

## Why "AI native" changes the calculus

- Libraries mostly save *typing*. An agent types for free, so the benefit shrinks while the costs stay: version-specific APIs the model half-remembers, transitive vulnerabilities, upgrade breakage.
- Platform primitives (Web APIs, `node:*`, React, Next) are documented, stable, and shipped with the framework. **Next.js ships its docs at `node_modules/next/dist/docs/`.** Read the relevant page before using an API you are not certain about — this version of Next.js differs from most training data (e.g. `proxy.ts` replaced `middleware.ts`, `updateTag`, `refresh`, `catchError`, `instant`).
- A *closed vocabulary* (fixed tokens, fixed component catalog, fixed folder layout, fixed error shape) makes generated code predictable and reviewable. Every skill here narrows choices on purpose.

## Which skill to use

| Task | Skill |
|---|---|
| New repo, folder layout, where does this file go, server/client boundaries | `app-architecture` |
| First-time design system setup, change themes/palette, switch native ↔ shadcn | `ds-init` |
| Add or change a UI component, tokens, icons | `ds-component` |
| Dialogs, menus, popovers, tooltips, tabs, transitions without libraries | `native-ui-primitives` |
| Tables, migrations, queries, pagination, search, seeding | `data-layer` |
| Sign-up/login, sessions, authorization, `proxy.ts` | `auth` |
| Forms, mutations, optimistic UI, validation errors | `server-actions` |
| `use cache`, tags, Suspense placement, instant navigation, prefetch | `caching` |
| Live updates, notifications, chat, presence | `realtime` |
| Long feeds, infinite scroll, virtualization | `feeds-and-lists` |
| Build a whole feature end-to-end (schema → UI → tests) | `feature-slice` |
| Unit, integration, E2E tests | `testing` |
| Shipping to Vercel, env vars, Neon branches, CI | `deploy-vercel` |

When a task spans several (it usually does), use `feature-slice` as the driver; it calls out when to consult the others.

## Non-negotiable rules

1. **Server by default.** A file gets `'use client'` only when it needs state, effects, event handlers, or browser APIs. Push the boundary to the leaves.
2. **All data access goes through `src/server/**` or `src/features/*/server/**`**, which import `'server-only'`. Components never import `postgres` directly.
3. **Validate at the boundary, trust inside.** `zod` parses every `FormData`, route param, search param, request body, env var, and DB row that crosses into typed code.
4. **Authorize next to the data.** Every query/mutation that touches user data takes a `viewer` from `requireViewer()`/`getViewer()` and checks it. UI checks are cosmetic.
5. **Every async read has a home:** either `'use cache'` + `cacheLife` + `cacheTag`, or a `<Suspense>` boundary placed as deep as possible. Never set `instant = false` to silence a warning without writing why.
6. **Tokens, not values.** No raw colours, px spacing, or font sizes in component CSS. Use design tokens (`ds-component` has a checker).
7. **Accessible by construction.** Real `<button>`, `<a>`, `<dialog>`, labels on inputs, visible focus, `prefers-reduced-motion` respected.
8. **Small files, one concept each.** Target < 200 lines. Split by concept, not by type.
9. **Leave the repo verifiable:** `pnpm typecheck && pnpm test` must pass before you say you're done. If you changed UI, run the app and look at it.

## Project markers

A Heliostack project has at its root:

- `heliostack.json` — stack version and enabled features (created by `app-architecture`).
- `design-system.json` — design-system decisions (created by `ds-init`). **Read it before any UI work.**
- `AGENTS.md` — project-specific notes for agents; `CLAUDE.md` contains `@AGENTS.md`.

## Adding a dependency

Before `pnpm add`, write `docs/decisions/NNNN-<name>.md` with: problem, the platform-only alternative you tried or rejected and why, bundle/runtime cost, maintenance signal (last release, open issues), exit plan. Ask the user before adding any runtime dependency. Dev-only tools (types, test runners, linters) need only a one-line note in the PR.

## Versions this plugin was verified against

next 16.3.6 · react 19.3.0 · postgres 3.4.9 · zod 4.6.5 · typescript 7.0 · @electric-sql/pglite 0.5 · node 24+. If the project is on newer majors, read `node_modules/next/dist/docs/` and the package changelogs before trusting any snippet here.
