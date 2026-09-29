---
name: testing
description: Testing strategy for Heliostack apps with zero test-framework dependencies — node:test running TypeScript directly, real Postgres per test file via PGlite, repository and pure-function tests, what not to unit test, visual verification with a browser tool, and Playwright-style E2E. Use when adding tests, when tests are slow/flaky, setting up CI, or deciding how to verify a change.
---

# testing

## Layers

| Layer | Tool | What | Speed |
|---|---|---|---|
| Pure logic (`lib/*`, grouping, text parsing, time) | `node:test` | inputs → outputs, edge cases | ms |
| Repositories (`features/*/server/repo.ts`) | `node:test` + PGlite via `useTestDb()` | real SQL, constraints, triggers, pagination, authorisation predicates | ~10 ms/test after a ~1 s boot per file |
| Screens | browser tool (screenshots) | layout, states, dark/light, mobile | manual/agent |
| Critical journeys | Playwright (dev dependency) against `next start` | sign up → post → like → notification | seconds |

Don't unit-test Server Actions or components with mocks of Next internals — that tests the mocks. Actions are thin (validate → repo → invalidate); the repo tests cover the logic, E2E covers the wiring.

## Running TypeScript without a toolchain

`pnpm test` = `node --test "src/**/*.test.ts"`. Works because:
- Node 24+ strips types (`erasableSyntaxOnly` in tsconfig keeps code strippable).
- Relative imports use `.ts` extensions; `#/*` resolves through `package.json#imports`.
- Tested modules don't import `server-only` or `next/*` (repos are pure by design).

## Real Postgres per file

```ts
// src/server/testing.ts
export function useTestDb(): { readonly sql: Sql } {
  const ctx = {} as { sql: Sql }
  before(async () => {
    pglite = await PGlite.create()                                         // in-memory Postgres (WASM)
    server = new PGLiteSocketServer({ db: pglite, port: 0, host: '127.0.0.1', maxConnections: 20 })
    await server.start()
    ctx.sql = createSql(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`, { max: 4 })  // same driver as prod
    await migrate(ctx.sql, { log: () => {} })                               // same migrations as prod
  })
  after(async () => { await ctx.sql.end(); await server.stop(); await pglite.close() })
  return ctx
}
export async function makeUser(sql, overrides = {}) { /* unique handle per call */ }
```

```ts
const db = useTestDb()
test('only the author can delete', async () => {
  const ada = await makeUser(db.sql); const bob = await makeUser(db.sql)
  const p = await post(ada.id, 'mine')
  assert.equal(await deletePost(db.sql, bob.id, p.id), false)
  assert.equal(await deletePost(db.sql, ada.id, p.id), true)
})
```

- Tests in a file share one DB; create fresh users per test (`makeUser`) instead of truncating.
- Assert behaviour users see: counts after toggles, pagination boundaries (`nextCursor === null` at the end), ordering, idempotency ("second like is a no-op"), authorisation ("non-member can't read").
- When an assertion fails on data, print the actual pages (`assert.equal(x, y, JSON.stringify({ first, second }))`) — that's how the `::text` ordering bug was found in minutes.

## Visual verification (required for UI changes)

1. Run the app (`pnpm dev`, seeded DB), sign in as the demo user.
2. Screenshot changed screens at 1360px and 390px, dark and light.
3. Check against `ds-component/references/visual-quality.md`.
4. Use `evaluate_script` + `getComputedStyle` to confirm suspicious styles — e.g. we caught the cascade-layer inversion by listing which `@layer` each stylesheet declared first.

Beware stale servers: make sure the port isn't held by an old `next start` (`lsof -ti tcp:3100`) before trusting what you see.

## CI

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm typecheck        # next typegen && tsc --noEmit — typedRoutes catches dead links
- run: pnpm ds:check         # contrast + token lint (+ layer-order rule)
- run: pnpm test             # node:test + PGlite, no services needed
- run: pnpm build            # Cache Components prerender validation; needs DATABASE_URL (Neon branch)
```
