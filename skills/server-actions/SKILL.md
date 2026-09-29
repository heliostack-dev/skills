---
name: server-actions
description: Mutations in Heliostack apps with React 19.3 + Next.js 16 Server Actions — the validate→authorize→mutate→invalidate→publish pipeline, the ActionState result shape, useActionState forms with field errors, useOptimistic toggles with rollback, updateTag/refresh after writes, and when a Server Function may be used for reads. Use for any form, button that changes data, optimistic UI, or "the UI didn't update after saving".
---

# server-actions

## The pipeline (every action, in this order)

```ts
'use server'
export async function createPostAction(_prev: ActionState<Created>, formData: FormData): Promise<ActionState<Created>> {
  const viewer = await requireViewer()                                   // 1 authenticate
  const parsed = CreatePostInput.safeParse({ body: formData.get('body'), replyToId: formData.get('replyToId') || undefined })
  if (!parsed.success) return invalid(parsed.error, formData)            // 2 validate (zod) → field errors
  const created = await repo.createPost(sql, viewer.id, parsed.data)     // 3 mutate (authorisation inside SQL)
  if (created === 'parent_missing') return failure('That post is no longer available.')
  updateTag(tags.user(viewer.handle))                                    // 4 invalidate cached reads you changed
  await publish({ type: 'post', authorId: viewer.id, postId: created.id }) // 5 notify other sessions
  refresh()                                                              // 6 re-render uncached server UI on this client
  return success({ id: created.id, handle: viewer.handle }, 'Your post was sent.')
}
```

- `updateTag(tag)` — read-your-own-writes for `'use cache'` data (Server Actions only). `revalidateTag(tag, 'max')` for background refresh (also in Route Handlers). Prefer tags over `revalidatePath`.
- `refresh()` (from `next/cache`) re-renders the current route's uncached Server Components for this client — use it when the changed data is streamed, not cached (feeds).
- `redirect()` throws; call it last and outside `try/catch`.

## ActionState — one result shape

```ts
export type ActionState<T = undefined> =
  | { status: 'idle' }
  | { status: 'success'; data: T; message?: string }
  | { status: 'error'; formError?: string; fieldErrors?: Record<string, string[] | undefined>; values?: Record<string, string> }
```

`invalid(zodError, formData)` flattens errors (`z.flattenError`) and echoes non-password values so inputs keep what the user typed. Serialisable only — no Error objects.

## Forms

```tsx
'use client'
const [state, action, pending] = useActionState(signupAction, idle)
const errors = state.status === 'error' ? state : undefined
<form action={action} noValidate>
  <TextField name="handle" label="Handle" defaultValue={errors?.values?.handle} errors={errors?.fieldErrors?.handle} />
  <Button type="submit" pending={pending}>Create account</Button>
</form>
```

- Uncontrolled inputs + `name`; React resets the form after a successful action. To reset a textarea only on success, key it: `key={state.status === 'success' ? state.data.id : 'draft'}`.
- React to a *new* result once (toast, close dialog) by comparing against a ref of the last handled state inside `useEffect`.
- ⌘/Ctrl+Enter → `e.currentTarget.form?.requestSubmit()`. For chat, skip Enter while `e.nativeEvent.isComposing` (Korean/Japanese IME).

## Optimistic toggles (like, follow, bookmark)

```tsx
const [confirmed, setConfirmed] = useState({ liked: post.viewer.liked, likeCount: post.likeCount })
const [shown, setShown] = useOptimistic(confirmed, (_cur, next: typeof confirmed) => next)

function toggle() {
  const next = { liked: !shown.liked, likeCount: shown.likeCount + (shown.liked ? -1 : 1) }
  startTransition(async () => {
    setShown(next)                                   // instant
    const result = await setLikeAction(post.id, next.liked)
    if (result.status === 'success') startTransition(() => setConfirmed(next))  // commit
    else toast('Something went wrong', { tone: 'danger' })                       // auto-rollback to confirmed
  })
}
```

`useOptimistic` falls back to its base when the transition ends — so the base must be *local confirmed state*, not props (props don't change without a refresh). Updates after `await` need their own `startTransition`.

## Actions as reads (the one exception)

Infinite scroll may call a Server Function (`loadFeedPageAction(key, cursor)`) because pages load strictly one after another. Server Functions queue per client — never use them for parallel reads; use a Route Handler or Server Components for that. Validate the feed key with zod and authorise private feeds inside.

## Checklist

- [ ] `requireViewer()` first line; zod parse of every input (including ids passed as arguments).
- [ ] Idempotent repo call; expected failures return `failure(...)`, not throw.
- [ ] Every cached read it affects is `updateTag`ged (tags built by `server/cache-tags.ts`).
- [ ] Realtime `publish` for other viewers; `refresh()` if the current page shows uncached data it changed.
- [ ] UI shows pending (`Button pending`), success (toast or navigation) and error (inline/toast).
