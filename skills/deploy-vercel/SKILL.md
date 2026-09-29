---
name: deploy-vercel
description: Ship a Heliostack app to Vercel with Neon Postgres — project setup, environment variables (pooled vs unpooled URLs, SESSION_SECRET), running migrations, preview branches, build-time database access for cached prerenders, function duration for SSE, and a production checklist. Use when deploying, configuring env vars, setting up preview databases, or debugging production-only failures.
---

# deploy-vercel

## 1. Database

1. Vercel dashboard → Storage → **Neon** (Marketplace) → create and connect to the project. It injects `DATABASE_URL` (pooled, `-pooler` host) and `DATABASE_URL_UNPOOLED` (direct) for Production and Preview.
2. Enable Neon **branching for previews** so every preview deployment gets its own copy-on-write database.

The app uses them as:
- `DATABASE_URL` → the query pool (`prepare: false` is set automatically for `-pooler` hosts).
- `DATABASE_URL_UNPOOLED` → presence switches realtime to the Postgres driver; used only for the single `LISTEN` connection per instance (and for migrations).

## 2. Secrets

```bash
node -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
vercel env add SESSION_SECRET production    # and preview; different values per environment
```

Rotating `SESSION_SECRET` signs everyone out (stored session hashes no longer match) — that's the intended kill switch.

## 3. Migrations

Run against the **unpooled** URL before the new code serves traffic:

```jsonc
// package.json
"vercel-build": "DATABASE_URL=$DATABASE_URL_UNPOOLED node scripts/migrate.ts && next build"
```

Migrations are forward-only and must be backwards compatible with the previous deployment for a few minutes (add columns nullable → backfill → constrain in a later migration; never rename in one step).

## 4. Build-time data

With Cache Components, `'use cache'` functions (trends, profiles) execute during `next build` to fill static shells, so the build needs database access — the Neon integration provides it. A read that must not run at build time belongs behind `<Suspense>` uncached instead.

## 5. Functions

- Node.js runtime (default) with Fluid compute. postgres.js needs Node APIs — don't mark routes `runtime = 'edge'`.
- SSE route: `export const maxDuration = 300` and the stream ends itself before that; clients reconnect. Check your plan's max duration.
- One pool per instance (global singleton), `max: 5`. Neon's pooler absorbs the fan-in.

## 6. Production checklist

- [ ] `pnpm verify` green locally (typecheck, ds:check, test, build).
- [ ] Env vars set for Production and Preview: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`.
- [ ] Migrations ran; `schema_migrations` matches `db/migrations/`.
- [ ] Seed **not** run in production (seed refuses non-empty DBs, but don't rely on it).
- [ ] Cookies `secure` (automatic when `NODE_ENV=production`).
- [ ] Login rate limiting in place before public launch.
- [ ] Open two browsers as two users: post, like, follow, DM — realtime badges update across instances.
- [ ] `/api/events` returns 204 when signed out; function logs show streams closing at ~270 s and reconnecting.
