---
name: data-layer
description: Postgres data access for Heliostack apps with postgres.js tagged SQL (no ORM) and zod — schema and migrations, repository functions, transactions, counters via triggers, cursor/offset pagination, full-text search, batch hydration, seeding, and local Postgres without Docker (PGlite). Use when adding or changing tables, writing queries, fixing slow or wrong queries, paginating, searching, or seeding data.
---

# data-layer

## Connection

```ts
// src/server/sql.ts — the only place that constructs a client
import postgres from 'postgres'
export type Sql = postgres.Sql<{}>
export type Db = Sql | postgres.TransactionSql<{}>   // repos accept either

export function createSql(url: string, options: postgres.Options<{}> = {}): Sql {
  const pooled = /-pooler\./.test(url)               // Neon/PgBouncer transaction mode
  return postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: !pooled,
    transform: postgres.camel, onnotice: () => {}, ...options })
}

// src/server/db.ts — one pool per server instance, survives HMR and Fluid reuse
import 'server-only'
const g = globalThis as unknown as { appSql?: Sql }
export const sql: Sql = (g.appSql ??= createSql(env().DATABASE_URL))
```

- `transform: postgres.camel` maps `display_name` ↔ `displayName` in both directions (results and `sql(object)` inserts). Keys inside `json_build_object(...)` are **not** transformed — write them camelCase yourself.
- `bigint` comes back as a **string**. Ids are strings in TypeScript (`Id = z.string().regex(/^[1-9]\d{0,18}$/)`).
- Pooled URLs need `prepare: false`; `LISTEN` needs the **unpooled** URL (see `realtime`).

## Local Postgres without Docker

```ts
// scripts/dev-db.ts — `pnpm dev:db`; data persists in .data/pglite
const db = await PGlite.create('./.data/pglite')
const server = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1', maxConnections: 50 })
```

PGlite is real Postgres compiled to WASM, served over the wire protocol, so the app uses the same postgres.js driver locally and in production. Limits: single session (**cross-connection NOTIFY does not work** — use the memory realtime driver locally), no extensions unless loaded from `@electric-sql/pglite/contrib/*` (so avoid `pg_trgm`/`citext` in migrations; use `lower()` indexes). Set `maxConnections` > 1 or parallel queries get `ECONNRESET`.

## Migrations

Forward-only SQL files `db/migrations/NNNN_name.sql`, applied in order by `scripts/migrate.ts`, each in its own transaction, recorded in `schema_migrations`. Never edit an applied migration; add a new one.

Schema conventions (see Halo `0001_init.sql`):

- `bigint generated always as identity primary key` — monotonic ids double as time-ordered cursors.
- `timestamptz not null default now()`; `check` constraints for invariants (lengths, formats, "a repost has no body").
- Case-insensitive uniqueness: `create unique index … on users (lower(handle))`.
- **Every foreign key and every list query has an index** matching its `where … order by`.
- Denormalised counters (`like_count`, `followers_count`) are maintained by **triggers**, never by app code — the database enforces the invariant for every writer, including seeds and admin SQL.
- Full-text: `search tsvector generated always as (to_tsvector('simple', body)) stored` + GIN index; `'simple'` config works for mixed-language content (Korean, emoji, code).

## Repository functions

`src/features/<f>/server/repo.ts`: pure functions `(db: Db, ...args)`. No Next imports, no `server-only` (tests import them). Type rows with `db<Row[]>` generics.

```ts
export async function setLike(sql: Sql, viewerId: string, postId: string, on: boolean): Promise<Notify[]> {
  return sql.begin(async (tx) => {
    if (!on) { await tx`delete from likes where user_id = ${viewerId} and post_id = ${postId}`; return [] }
    const inserted = await tx`insert into likes (user_id, post_id) values (${viewerId}, ${postId})
                              on conflict do nothing returning post_id`
    if (!inserted.length) return []                                  // idempotent: second like is a no-op
    const [p] = await tx<{ authorId: string }[]>`select author_id::text from posts where id = ${postId}`
    return p ? notify(tx, viewerId, [{ recipientId: p.authorId, kind: 'like', postId }]) : []
  })
}
```

Rules:

- Mutations are **idempotent** (`on conflict do nothing`, upserts) so double-clicks and retries are safe.
- Authorisation predicates live **in the SQL** (`delete … where id = $1 and author_id = $viewer`), so a missing check can't be bypassed.
- Return discriminated results for expected failures (`'parent_missing' | 'handle_taken'`); throw only for bugs.
- Fragments: ``db`and p.id < ${cursor}` `` or ``db`` `` for optional clauses; `sql(rows)` for multi-row inserts; `db.unsafe()` only for trusted static SQL (never user input).

### Hydration: one query per list

Feeds first fetch **ids** (cheap index scans), then one `hydrate(db, viewerId, ids)` query builds every card with author JSON, viewer flags (`exists(...)` subqueries) and order preserved via `unnest(${ids}::bigint[]) with ordinality`. Secondary data (quoted posts) is a second batched query keyed by id — never N+1.

## Pagination

| Order | Cursor | Example |
|---|---|---|
| Chronological by id | last id: `where id < $cursor order by id desc limit $n+1` | timelines, profiles |
| By another timestamp | epoch-µs of that column: `where created_at < to_timestamp($c/1e6)` | likes, bookmarks, followers |
| Ranked (score) | offset: `offset $c limit $n+1` (accept small shifts; client dedupes by id) | "For you", replies by likes |

Fetch `limit + 1` rows to know if there's a next page; `nextCursor = null` at the end.

**Gotcha we hit:** in `select id::text from (…) order by id desc`, `order by id` refers to the *output* column — the text — and sorts `'9' > '12'`. Alias the inner column (`select p.id as item_id … order by item_id`) or order before casting.

`distinct on` for "one row per group" (e.g. a post reposted by several people appears once): `select distinct on (coalesce(repost_of_id, id)) id … order by coalesce(repost_of_id, id), id desc`, then re-order outside.

## Search

- Posts: `where search @@ websearch_to_tsquery('simple', $q)` (supports quotes, `-exclude`, `or`).
- People: prefix `like` on `lower(handle)` / `lower(display_name)` with `text_pattern_ops` index; escape `%`, `_`, `\` in the input.

## Seeding

`scripts/seed.ts` — deterministic PRNG (no faker), reuses repository functions (so triggers and notifications behave like production), refuses to run on a non-empty DB. Make timestamps **monotonic with ids** (ids order the UI; random timestamps produce "8h, 5h, 3h, 4h" lists).

## Testing

Every repo gets `repo.test.ts` with `useTestDb()` (fresh PGlite per file) — see `testing`.
