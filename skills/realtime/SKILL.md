---
name: realtime
description: Realtime features in Heliostack apps without websocket services — Server-Sent Events from a Next.js Route Handler, Postgres LISTEN/NOTIFY fan-out across serverless instances, an in-memory driver for local dev, per-viewer event routing, a shared EventSource client with useEffectEvent, and serverless duration limits. Use for live notifications, chat/DMs, "new posts" indicators, presence-like updates, or when realtime events don't arrive.
---

# realtime

## Architecture

```
Server Action ──publish(event)──▶ bus ──▶ every SSE stream on every instance ──route(event, viewer)──▶ browser
                                  │
            postgres driver: pg_notify on publish, one LISTEN connection per instance
            memory driver:   in-process EventTarget (local PGlite, single-node hosting)
```

- **Events carry ids, never content** (`{ type: 'message', conversationId, memberIds, messageId }`). The browser refetches what it's allowed to see via normal authorised server paths. No data leaks through the channel, payloads stay far below NOTIFY's 8 KB limit.
- Events are validated with a zod discriminated union on both publish and receive.

## Server

```ts
// server/realtime/bus.ts (essentials)
const driver = () => (env().DATABASE_URL_UNPOOLED ? 'postgres' : 'memory')
export async function publish(e: RealtimeEvent) {
  if (driver() === 'memory') return emitLocal(e)
  await sql`select pg_notify(${CHANNEL}, ${JSON.stringify(e)})`
}
export function subscribe(listener) { /* local EventTarget; lazily starts one LISTEN connection (max: 1, idle_timeout: 0) on the UNPOOLED url */ }
```

- `LISTEN` requires a **direct** connection: PgBouncer transaction pooling (Neon `-pooler` hosts) drops it. Neon's Vercel integration sets `DATABASE_URL_UNPOOLED`.
- PGlite is single-session → cross-connection NOTIFY never fires locally; that's why the memory driver exists.

```ts
// app/api/events/route.ts
export const maxDuration = 300
export async function GET(request: Request) {
  const viewer = await getViewer()
  if (!viewer) return new Response(null, { status: 204 })   // 204 = EventSource stops reconnecting
  const following = new Set(await followeeIds(viewer.id))   // routing state, kept fresh by 'follow' events
  const stream = new ReadableStream({ start(controller) {
    send('retry: 2000\n\n')                                  // reconnect delay
    const off = subscribe((e) => { const out = route(e); if (out) send(`event: ${out.type}\ndata: ${JSON.stringify(out)}\n\n`) })
    const ping = setInterval(() => send(': ping\n\n'), 20_000)          // keep proxies from idling out
    const end = setTimeout(() => controller.close(), 270_000)          // end before the platform kills us
    request.signal.addEventListener('abort', cleanup)
  }})
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } })
}
```

`route(event)` decides per viewer: posts only from followed authors, notifications only for the recipient, messages only for members, read-receipts only for the same user.

## Client

```tsx
// features/realtime/realtime.tsx
export function RealtimeProvider({ children }) {          // mounted once in the app layout — static, no auth knowledge
  useEffect(() => {
    const source = new EventSource('/api/events')
    for (const t of TYPES) source.addEventListener(t, (e) => target.dispatchEvent(new CustomEvent(t, { detail: JSON.parse(e.data) })))
    return () => source.close()
  }, [])
  …
}
export function useRealtime(type, handler) {
  const onEvent = useEffectEvent(handler)                 // always sees latest state, never resubscribes
  useEffect(() => registry.on(type, (e) => onEvent(e)), [registry, type])
}
```

Patterns built on it:

- **"Show N new posts"**: count `post` events, `router.refresh()` only when the user clicks (never yank the feed under their thumb).
- **Unread badge**: initial count from the server (inside Suspense), `+1` on events unless the user is on that page, reset on `read` events (which the page publishes after marking read — so other tabs clear too).
- **Chat**: on `message` for the open conversation → `router.refresh()`; optimistic send with `useOptimistic`; mark read on open.

## Limits and scaling notes

- Vercel functions have a max duration — the stream closes itself (~4.5 min) and `EventSource` reconnects after `retry`. Events published during the ~2 s gap are missed: treat realtime as a hint and let pages refetch on focus/navigation for correctness.
- Each open tab holds one function invocation (Fluid compute shares instances across concurrent requests, which keeps this affordable). For very large audiences move fan-out to a dedicated service behind the same `publish/subscribe` interface.
- Don't send realtime updates for your own actions back to yourself as the only UI update — optimistic UI already did that.
