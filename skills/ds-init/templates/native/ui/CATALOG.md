# UI catalog (native strategy)

Read before building UI. Reuse first; extend here only for components needed by 2+ features. Rules: `ds-component` skill.

| Component | File | Client? | Use for | Don't use for |
|---|---|---|---|---|
| `Button`, `buttonStyles()` | `button.tsx` | no | Primary/secondary actions; `buttonStyles()` on `<Link>` for navigation that looks like a button. Variants `primary · secondary · outline · ghost · danger · inverted`, sizes `sm 32 · md 36 · lg 44`, `pending` shows a spinner | Icon-only actions (→ IconButton) |
| `IconButton`, `iconButtonStyles()` | `icon-button.tsx` | no | Circular chrome: close, back, overflow, toolbar. `label` required | Per-item actions with counts (→ ActionButton) |
| `ActionButton`, `ActionButtonContent`, `actionButtonStyles()` | `action-button.tsx` | no | Compact pill with icon + count and a semantic tone (`reply · repost · like · bookmark · share`), `active` → aria-pressed | Standalone buttons |
| `Icon` | `icon.tsx` + `public/icons.svg` | no | Every icon. Sizes 16/18/20/22/24; `label` for standalone meaning; `filled` for toggled shapes | Inline SVG copies |
| `Avatar` | `avatar.tsx` | no | User avatars from name + hue. Sizes `xs 24 · sm 32 · md 40 · lg 64 · xl 128` | Images of content |
| `Badge` | `badge.tsx` | no | Unread counts (hidden at 0), tiny labels | Status text in sentences |
| `Spinner`, `Skeleton` | `spinner.tsx`, `skeleton.tsx` | no | Pending buttons / sentinels; loading placeholders matching real geometry | Whole-page loading (use Suspense fallbacks built from Skeleton) |
| `EmptyState` | `empty-state.tsx` | no | Empty lists: title + one sentence + optional action | Errors |
| `Dialog` | `dialog.tsx` | yes | Modals on native `<dialog>`; `open`/`onOpenChange`; full-screen under 640px | Menus, toasts |
| `Menu`, `MenuItem`, `MenuLink`, `MenuSeparator` | `menu.tsx` | yes | Dropdowns on Popover API + anchor positioning; custom `trigger` + `triggerClassName` | Navigation bars |
| `TabNav` | `tab-nav.tsx` | yes | Route-driven tabs (URL is the state), usually inside `PageHeader tabs` | In-page state toggles |
| `TextField`, `TextArea`, `FieldMessage` | `text-field.tsx`, `textarea.tsx` | TextArea only | Labelled inputs with hint/error from `ActionState.fieldErrors`; TextArea has a counter | Search boxes in chrome |
| `ToastProvider`, `useToast()` | `toast.tsx` | yes | Short confirmations/errors after actions (top layer, above dialogs) | Validation errors (show inline) |
| `ThemePicker` | `theme-picker.tsx` | yes | Display settings: theme + light/dark/system | — |
| `InlineScript` | `inline-script.tsx` | no | Pre-paint DOM fixes on full loads (theme boot) | Anything that can wait for hydration |
| `cx()` | `cx.ts` | — | Joining class names | Conditional style objects |

App chrome that is feature-level, not generic, lives in `src/features/shell/`: `PageHeader` (60px title bar + optional tabs, sticky, blurred), `Sidebar`, `Rail`, `BackButton`.
