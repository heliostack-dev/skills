---
name: feeds-and-lists
description: Long, paginated, interactive lists in Heliostack apps — a single FeedKey union for every list, server-rendered first page with client infinite scroll, IntersectionObserver sentinels, dedupe across pages, content-visibility instead of virtualization libraries, stretched-link cards with nested actions, skeletons and empty states. Use for timelines, search results, notifications, comments, follower lists, or any "load more" UI.
---

# feeds-and-lists

## One key for every list

```ts
// features/posts/feed-key.ts
export const FeedKey = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('following') }),
  z.object({ kind: z.literal('for-you') }),
  z.object({ kind: z.literal('user'), userId: Id, mode: z.enum(['posts', 'replies']) }),
  z.object({ kind: z.literal('bookmarks') }),
  z.object({ kind: z.literal('search'), q: z.string().min(1).max(100) }),
  // …
])
```

One server function `getFeedPage(key, cursor)` switches on `kind` → repo returns `{ items: ids, nextCursor }` → one `hydrate()` query → `Page<PostView>`. Adding a new list = one union member + one repo query. Private kinds (`bookmarks`, `following`) resolve the viewer inside; the client can never ask for someone else's.

## Server first page, client pages after

```tsx
// server
export async function FeedSection({ feedKey, empty }) {
  const [viewer, initial] = await Promise.all([getViewer(), getFeedPage(feedKey)])
  return <Feed feedKey={feedKey} initial={initial} signedIn={viewer !== null} empty={empty} />
}
// page
<Suspense fallback={<FeedSkeleton />}><FeedSection feedKey={{ kind: 'for-you' }} empty={<EmptyState … />} /></Suspense>
```

```tsx
// client <Feed>
const [pages, setPages] = useState([initial])
const [seen, setSeen] = useState(initial)
if (seen !== initial) { setSeen(initial); setPages([initial]) }   // refresh() / navigation replaces appended pages

useEffect(() => {                                                   // sentinel 1200px ahead of the viewport
  const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && loadMore(), { rootMargin: '1200px 0px' })
  io.observe(sentinel.current!); return () => io.disconnect()
})

const seenIds = new Set<string>()                                   // pages can overlap: dedupe by entity id
const posts = pages.flatMap((p) => p.items).filter((p) => !seenIds.has(p.id) && seenIds.add(p.id))
```

- `loadMore` guards on `pending` and on the cursor still being the last one (no double-appends).
- Failed page → inline "Retry" button in place of the spinner; never an infinite spinner.
- End of list → quiet "You're all caught up".
- The card component is **shared** (no `'use client'`, no server imports) so it renders on the server for page 1 and on the client for later pages; its interactive parts (`PostActions`, `PostMenu`) are client leaves.

## Performance without a virtualization library

```css
.card { content-visibility: auto; contain-intrinsic-size: auto 8.5rem; }
```

Off-screen cards skip layout/paint; `auto` remembers each card's real size once rendered, so scrollbars stay stable. Good to a few thousand rows. Beyond that (chat logs with 10k+ items), window the list — but measure first.

## Cards with a whole-row link and nested actions

```css
.overlay { position: absolute; inset: 0; z-index: 0; }                       /* <Link className={overlay} tabIndex={-1} aria-hidden /> */
.card :is(a, button):not(.overlay) { position: relative; z-index: 1; }      /* real controls above it */
```

Valid HTML (no buttons inside links), middle-click/cmd-click open in new tab, text stays selectable, keyboard users use the explicit links (time, author).

## Grouping and ordering

- Chronological lists: id cursors. Ranked lists: offset cursors + client dedupe.
- Show a post once even if several followees reposted it (`distinct on` in SQL, dedupe by `post.id` on the client).
- Notifications: group `like/repost/follow` by `(kind, post)` in a pure, tested function (`groupNotifications`) — "Ada and 4 others liked your post".

## States every list needs

| State | Component |
|---|---|
| Loading first page | Suspense fallback of skeleton rows with the card's exact grid |
| Empty | `EmptyState` with title, one sentence, one action ("Find people to follow") |
| Loading more | spinner in the sentinel |
| Error loading more | "Retry" button |
| New items available | pill at the top (realtime), refresh on click |
| End | "You're all caught up" |
