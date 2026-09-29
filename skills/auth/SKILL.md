---
name: auth
description: Dependency-free authentication and authorization for Heliostack apps on Next.js 16 — scrypt password hashing, random session tokens stored as HMAC hashes, httpOnly cookies, getViewer/requireViewer data-access layer, proxy.ts optimistic redirects, and how auth interacts with Cache Components and Suspense. Use for sign-up/login/logout, protecting pages or actions, session bugs, "who is the current user", or adding roles/permissions.
---

# auth

No auth SaaS or library by default: Node ships `crypto.scrypt`, Web Crypto ships HMAC, and a sessions table is ~40 lines. (If the user asks for OAuth/SSO, add a provider flow on top of the same session layer.)

## Pieces

| File | Role |
|---|---|
| `server/auth/password.ts` | `hashPassword` / `verifyPassword` — scrypt N=2^15, r=8, p=1, 16-byte salt, format `scrypt$N$r$p$salt$hash` (upgradeable), `timingSafeEqual`, NFKC-normalised input, `DUMMY_HASH` for unknown users |
| `server/auth/token.ts` | `newToken()` 32 random bytes base64url; `hashToken(token, SESSION_SECRET)` HMAC-SHA256 via `crypto.subtle` |
| `server/auth/repo.ts` | users/sessions SQL (pure, tested) |
| `server/auth/session.ts` | `'server-only'`: `createSession`, `readSession` (sliding renewal), `destroySession`, cookie flags |
| `server/auth/viewer.ts` | `getViewer()` (React `cache`, per request) and `requireViewer()` (redirects to /login) |
| `proxy.ts` | optimistic redirects based on cookie **presence** only |

The DB stores only `HMAC(secret, token)`: a leaked sessions table can't be replayed without the secret. Cookie: `httpOnly`, `sameSite: 'lax'`, `secure` in production, 30-day expiry renewed when < 15 days remain.

## Authorization: next to the data

```ts
export async function deletePostAction(postId: string) {
  const viewer = await requireViewer()                        // 1. who
  const id = Id.parse(postId)                                 // 2. validate
  if (!(await repo.deletePost(sql, viewer.id, id)))           // 3. SQL enforces ownership
    return failure('You can only delete your own posts.')
  …
}
```

- **Every Server Action and Route Handler calls `requireViewer()`/`getViewer()` itself.** Actions are public HTTP endpoints; hiding a button is not protection.
- Private data queries take the viewer from the session, never from arguments. Unexported cached helpers keyed by user id are fine as long as the exported entry point resolves the viewer (see `caching`).
- Return narrow viewer objects (`{ id, handle, displayName, avatarHue, verified }`) — never the password hash or email to client components.

## Login and signup

- Validate with zod; on signup check handle/email uniqueness case-insensitively and return field errors.
- Login: look up by email **or** `@handle`, **always run scrypt** (against `DUMMY_HASH` when the user doesn't exist) so timing doesn't leak which accounts exist; one generic error message.
- After `createSession`, `redirect()` — to a sanitised `next` param (`/^\/(?!\/)/`, no protocol-relative URLs).
- Rate limiting: add a `login_attempts` table keyed by IP+identifier with a sliding window before shipping publicly.

## Cache Components rules

- `getViewer()` reads `cookies()` → any component calling it must sit **inside `<Suspense>`**. Keep it out of layouts' top level; put `<Suspense>` around the smallest viewer-dependent piece (account menu, unread badge, composer).
- Never call it inside `'use cache'`. To cache per-user data, resolve the viewer outside and pass `viewer.id` into an unexported cached function.
- Cookies can only be *written* in Server Actions/Route Handlers. `readSession` swallows renewal failures during render.
- Signed-out realtime: return **204** from the SSE endpoint so `EventSource` stops reconnecting (no need to know auth state on the client).

## proxy.ts (Next 16's middleware)

```ts
// Public by default: the timeline, profiles, posts and search are readable signed-out.
const PRIVATE = ['/home/following', '/notifications', '/messages', '/bookmarks', '/settings', '/compose']
export function proxy(request: NextRequest) {
  const has = request.cookies.has(SESSION_COOKIE)
  if (!has && PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) → redirect `/login?next=…`
  if (has && ['/login', '/signup'].includes(pathname)) → redirect '/home'
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|icons.svg|favicon.ico).*)'] }
```

Presence check only — no DB, no crypto. It's a UX shortcut; the page/action still authorises.

**Prefer public-by-default over a landing page.** A marketing splash in front of the product reads as filler; let visitors land on real content (`redirects: [{ source: '/', destination: '/home', permanent: false }]` in `next.config.ts`) and invite them with a slim signup bar (streamed in its own Suspense boundary, rendered only when `getViewer()` is null). Components that need a viewer must degrade: hide the composer, send interaction attempts to `/login`.

## Tests

`auth.test.ts`: hash/verify round trip, HMAC determinism per secret, case-insensitive duplicate detection, expired sessions not found. Use `useTestDb()`.
