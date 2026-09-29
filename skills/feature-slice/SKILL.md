---
name: feature-slice
description: End-to-end workflow for building a complete feature in a Heliostack app — migration, repository with PGlite tests, server queries with caching decisions, Server Actions, realtime events, UI inside the design system, routes with Suspense, and visual verification — including how to split the work across parallel agents. Use when asked to build a feature ("add DMs", "add bookmarks", "build the profile page"), a whole app section, or when coordinating multiple agents on one codebase.
---

# feature-slice

The driver skill. Each step names the specialised skill to consult. Don't skip steps; do them in order — each one makes the next cheaper and safer.

## 0. Frame it (2 minutes)

Write down, in the task or a PR description: user-visible behaviour, routes, who can see/do what, which lists need pagination, what must update live, and what "done" looks like (screens + tests). Read `design-system.json` and `src/ui/CATALOG.md`.

## 1. Schema — `data-layer`

New migration `db/migrations/NNNN_feature.sql`: tables, `check` constraints, indexes for every list query and FK, triggers for counters. Run `pnpm db:migrate` locally.

## 2. Repository + tests — `data-layer`, `testing`

`src/features/<f>/server/repo.ts` — pure `(db, …)` functions: reads return ids or rows, mutations are idempotent and encode authorisation in SQL. `repo.test.ts` with `useTestDb()`: happy path, idempotency, authorisation, pagination end, ordering. **`pnpm test` green before writing any UI.**

## 3. Types and inputs

`src/features/<f>/types.ts` — view types shared with the client (narrow: no secrets) and zod input schemas.

## 4. Server reads — `caching`, `auth`

`server/queries.ts` (`'server-only'`): resolve the viewer, authorise, call repo, hydrate. For each read decide cached (`'use cache'` + `cacheLife` + `cacheTag` from `server/cache-tags.ts`) vs streamed (uncached + Suspense). Personalised → streamed.

## 5. Mutations — `server-actions`, `realtime`

`actions.ts` (`'use server'`): requireViewer → zod → repo → `updateTag`/`refresh` → `publish` → `ActionState`. Add new event types to `server/realtime/events.ts` and routing in `/api/events` if others must see it live.

## 6. UI — `ds-component`, `native-ui-primitives`, `feeds-and-lists`

`components/*`: server components by default; client leaves for interaction (optimistic toggles, forms). Compose catalog components; tokens only; every CSS file starts with the layer-order line. Lists use a `FeedKey`-style union, skeleton fallbacks and empty states.

## 7. Routes — `app-architecture`, `caching`

Thin `page.tsx`/`layout.tsx`: `PageHeader`, Suspense boundaries as deep as possible, params promises passed down. `typedRoutes` makes every missing link a type error — `pnpm typecheck` is your TODO list.

## 8. Verify

```bash
node design/check-tokens.mjs && pnpm test && pnpm typecheck && pnpm build
```

Then run the app and screenshot every new screen (desktop/mobile × dark/light), walk `ds-component/references/visual-quality.md`, exercise the interactions (optimistic toggle, form error, empty state, realtime with two sessions). Report with screenshots and test output — never "should work".

## Parallel agents on one repo

Large builds go faster split by feature, but only after a shared foundation exists:

1. **Lead builds the foundation first**: schema for all features, auth, design system + catalog, app shell, one complete reference slice (e.g. posts). Agents copy patterns; a weak reference multiplies into every slice.
2. **Give each agent disjoint file ownership** (`src/features/<f>/**`, `src/app/(app)/<route>/**`) and forbid edits elsewhere; they *report* needed shared changes instead. List the routes other agents own so they ignore those type errors.
3. **One dev server, owned by the lead.** Two `next dev` processes on one `.next` directory fight; agents run `pnpm test`/`typecheck` and may `curl` the lead's server.
4. **Agents don't commit.** The lead integrates, fixes shared files, runs the full verify + visual pass, then commits.
5. Put the non-negotiables in every agent prompt verbatim (layer-order line, tokens only, Suspense placement, `.ts` imports, `requireViewer` first) — agents don't infer house rules from a few files reliably.

In Halo, three agents built profiles/threads/bookmarks, notifications/messages and explore/settings in parallel in ~4 minutes each; integration surfaced three shared issues (a client hook outside Suspense, an icon size type, dynamic `Route` casts), all fixed centrally.
