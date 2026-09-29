---
name: caching
description: Rendering and caching with Next.js 16 Cache Components in Heliostack apps — static shells and Partial Prerendering, where Suspense boundaries go, 'use cache' with cacheLife/cacheTag, per-user caching without leaking data, updateTag vs revalidateTag vs refresh, partial prefetching and instant navigation, and reading build output. Use when a route "blocks", the dev overlay shows blocking-route/instant-navigation insights, data is stale after a mutation, or deciding whether something should be cached.
---

# caching

Config: `cacheComponents: true`, `partialPrefetching: true`. Read `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` when unsure — this model is newer than most training data.

## The mental model

Every route renders into a **static shell** at build time (HTML + RSC payload served from the CDN) with **holes** that stream per request. For each async read decide:

| The data… | Do | Lands in |
|---|---|---|
| is the same for everyone and can be minutes stale (trends, a public profile header, hashtag counts) | `'use cache'` + `cacheLife(...)` + `cacheTag(...)` | static shell / shared cache |
| depends on the viewer or must be fresh (feeds with liked-state, unread counts, the composer) | leave uncached, wrap the component in `<Suspense>` **as deep as possible** | streamed hole |
| depends on the URL (`params`, `searchParams`) | pass the promise down; await inside a Suspense child | streamed hole (or per-link prefetch) |

The build output tells you what happened: `○` static, `◐` partial prerender (shell + holes), `ƒ` dynamic. In Halo every page is `◐` except the SSE route.

## Placing Suspense

- **Layouts never await request data.** Halo's app shell (sidebar, rail, header) has no top-level await, so it's in every page's static shell and navigations are instant. Per-user fragments (account menu, unread badges, "who to follow") each get their own `<Suspense>`.
- Pass `params` promises down instead of awaiting at the top:
  ```tsx
  export default function Page({ searchParams }: PageProps<'/login'>) {
    return <Suspense fallback={<LoginForm />}>{searchParams.then(({ next }) => <LoginForm next={next} />)}</Suspense>
  }
  ```
- Client components reading URL data (`usePathname`, `useSearchParams`) also need a Suspense boundary during prerender — Halo's `NavLink` renders an inactive fallback and lights up on the client.
- Fallbacks mirror the real geometry (`FeedSkeleton` rows = PostCard grid) so streaming doesn't shift layout.
- `notFound()` inside a streamed boundary renders the 404 UI but the status is already 200 (with `noindex`). If a correct 404 status matters (SEO for profiles), validate existence in a cached call *before* the first boundary.

## `'use cache'`

```ts
export async function getProfile(handle: string) {
  'use cache'
  cacheLife('minutes')                 // stale 5m · revalidate 1m · expire 1h
  cacheTag(tags.user(handle))          // invalidated by follow/profile/post actions
  const profile = await repo.findProfile(sql, handle)
  if (!profile) notFound()
  return profile
}
```

- Always pair with `cacheLife`; short-lived profiles (`seconds`, `expire` < 5 min) are excluded from prerender.
- Arguments and captured values form the cache key — **in plain text**. Key on stable public ids, never emails or tokens.
- Can't read `cookies()`/`headers()` inside. For viewer-specific caching: exported function resolves the viewer, then calls an **unexported** cached function with `viewer.id` — callers can't request someone else's data.
- `'use cache: private'` caches in the browser only (can read cookies) — useful for prefetching authenticated shells; keep `stale ≥ 30s`.
- In serverless, the default cache is per-instance memory; `'use cache: remote'` is durable but costs a round trip — only for high hit rates.
- Cached functions run at **build time** too: the build needs DB access (Vercel: the Neon integration provides it), or the read must be behind Suspense instead.

## Invalidation

All tags come from one module so writers and readers can't drift:

```ts
// server/cache-tags.ts
export const tags = { user: (h: string) => `user:${h.toLowerCase()}`, trends: () => 'trends' } as const
```

| API | Where | Semantics | Use |
|---|---|---|---|
| `updateTag(tag)` | Server Actions | expire now; the acting user sees fresh data | after the viewer's own writes |
| `revalidateTag(tag, 'max')` | Actions + Route Handlers | stale-while-revalidate | webhooks, background refresh |
| `refresh()` | Server Actions | re-render uncached server UI for this client | feeds after posting/deleting |
| `router.refresh()` | client | same, triggered by UI | "Show N new posts" pill, realtime events |

## Prefetching

With `partialPrefetching`, visible `<Link>`s prefetch each route's App Shell once. Add `prefetch={true}` only where URL-dependent cached content should be ready before the click (costs a server call per link). Don't put it on every item of a feed.

## Opting out

`export const instant = false` silences instant-navigation validation for a segment. Only with a comment explaining why the structural fix isn't worth it.

## Debug checklist

1. Dev overlay insight names the route and the fix — follow it.
2. `pnpm build` → any `ƒ` page you expected to be `◐`? Something awaits request data above the first Suspense.
3. Stale after mutation? The action is missing `updateTag` for that tag, or the data is uncached and needs `refresh()`.
4. Leak risk? Grep cached functions for arguments that aren't public ids.
