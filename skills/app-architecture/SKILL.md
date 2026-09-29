---
name: app-architecture
description: Folder layout, module boundaries and project bootstrap for a Heliostack app (Next.js 16 App Router, src/, feature slices, `#/` subpath imports, runnable-TypeScript scripts). Use when creating a new Heliostack project, deciding where a file belongs, splitting a growing file, setting up tsconfig/package.json/next.config, or reviewing imports that cross boundaries.
---

# app-architecture

## Layout

```
src/
  app/                          routes only — thin: compose features, read params, set metadata
    (auth)/login, signup        route groups share layouts without affecting URLs
    (app)/layout.tsx            app shell (static!) + parallel @modal slot
    (app)/@modal/(.)compose/…   intercepted routes render as dialogs over the current page
    api/<name>/route.ts         only for non-React consumers (SSE, webhooks, OG images)
  features/<feature>/           vertical slice — everything a feature needs
    types.ts                    shared (server + client) types and zod input schemas
    server/repo.ts              pure SQL: (db, ...args) → data. No Next imports. Tested with PGlite
    server/queries.ts           'server-only': viewer resolution, authorisation, caching, hydration
    actions.ts                  'use server': validate → authorise → mutate → invalidate → publish
    components/*.tsx            feature UI (server by default, client leaves)
  server/                       cross-feature server infrastructure ('server-only' where it touches Next)
    env.ts sql.ts db.ts auth/ realtime/ cache-tags.ts testing.ts
  lib/                          pure, isomorphic utilities (text parsing, time, ids, ActionState)
  ui/                           design system (see ds-init / ds-component)
db/migrations/NNNN_name.sql     schema, forward-only
scripts/*.ts                    migrate, seed, dev-db — run directly with `node`
design/                         vendored design-system engine + themes
proxy.ts                        optimistic redirects only (Next 16 renamed middleware → proxy)
```

### Dependency direction

`app → features → (server | lib | ui)`; `features/a` may import `features/b`'s **components, types and server/queries** but never its `repo.ts` directly from UI. `lib` and `ui` import nothing from `features` or `server`. `repo.ts` imports only `server/sql.ts` types and `lib`. Client components import server code only as Server Actions (`actions.ts`) or `import type`.

Review heuristic: a `'use client'` file with a non-type import from `#/server/**` or `**/server/**` is a bug.

## Bootstrap

```jsonc
// package.json (essentials)
{
  "type": "module",
  "engines": { "node": ">=24" },
  "imports": { "#/*": "./src/*" },          // subpath imports: work in Node, TS and Turbopack
  "scripts": {
    "dev": "next dev", "dev:db": "node scripts/dev-db.ts", "build": "next build",
    "db:migrate": "node --env-file-if-exists=.env.local scripts/migrate.ts",
    "db:seed": "node --env-file-if-exists=.env.local scripts/seed.ts",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "node --test \"src/**/*.test.ts\"",
    "verify": "pnpm typecheck && pnpm ds:check && pnpm test && pnpm build"
  },
  "dependencies": { "next": "^16.3", "react": "^19.3", "react-dom": "^19.3", "postgres": "^3.4", "zod": "^4.6" },
  "devDependencies": { "typescript": "^7", "@types/node": "*", "@types/react": "*", "@types/react-dom": "*", "@electric-sql/pglite": "*", "@electric-sql/pglite-socket": "*" }
}
```

```jsonc
// tsconfig.json (compilerOptions highlights)
{
  "strict": true, "noUncheckedIndexedAccess": true, "noEmit": true,
  "module": "esnext", "moduleResolution": "bundler",
  "allowImportingTsExtensions": true,   // import './x.ts' — same file runs in Node and Next
  "verbatimModuleSyntax": true, "erasableSyntaxOnly": true, // Node's type stripping can run it
  "incremental": false,                 // stale .tsbuildinfo hid route-type changes; TS7 is fast enough
  "jsx": "react-jsx", "plugins": [{ "name": "next" }]
}
```

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true, partialPrefetching: true, typedRoutes: true, poweredByHeader: false }
```

Why these choices:

- **Imports with `.ts` extensions + `#/` subpath imports** let `node --test` and `node scripts/seed.ts` execute the same source files Next compiles — no tsx, ts-node, vitest or bundler for tests.
- **`erasableSyntaxOnly`**: no enums/namespaces/parameter properties, so Node can strip types.
- **`typedRoutes`**: a link to a page that doesn't exist yet is a type error. During a build-out, `pnpm typecheck` doubles as the list of missing pages.
- **TypeScript 7** (native compiler): `next build` runs the project-local `tsc` CLI by default in Next 16.3.

Next 16 writes `AGENTS.md`/`CLAUDE.md` on first `next dev` pointing agents at `node_modules/next/dist/docs/`. Keep that block and add project rules below it.

## File-size and naming rules

- One concept per file; split at ~200 lines by concept (`post-card.tsx`, `post-actions.tsx`, `post-menu.tsx`), not by type (`components/`, `hooks/`, `utils/` dumping grounds).
- kebab-case files, PascalCase components, camelCase functions; actions end with `Action`; repo functions are verbs (`createPost`, `setLike`, `followingTimeline`).
- Route files stay under ~40 lines: they wire `Suspense` boundaries and feature components together.

## Checklist for a new feature slice

Use `feature-slice` — it walks migration → repo + tests → queries → actions → components → routes → verification.
