# ContentFlow — Frontend Requirements Document
**Product**: ContentFlow by Fetemi Marketing
**Document Date**: 2026-03-26
**Audience**: Frontend Engineer
**Status**: Authoritative — build directly from this doc

---

## Overview

ContentFlow is a content automation platform. Users submit a raw idea or a source URL; an n8n workflow generates 3 draft angles; the user selects one; n8n adapts it for LinkedIn, X/Twitter, and Email Newsletter; the user reviews, edits, and publishes.

**Tech stack confirmed in code:**
- React + React Router v6
- Supabase (auth + database)
- n8n webhooks (content pipeline)
- Tailwind CSS with design token classes (card, btn-primary, btn-ghost, input-field, etc.)

**Role hierarchy** (lowest to highest): `viewer` < `editor` < `admin`

---

## 1. User Flows

### 1.1 First-Time Login Flow

**Happy path:**
1. User navigates to any protected route.
2. `ProtectedRoute` detects no session; redirects to `/login`.
3. Login page renders with email field auto-focused.
4. User types email, submits form (Enter key or button click).
5. Button shows spinner + "Sending..." label; input is disabled.
6. Supabase sends magic link email.
7. UI transitions to "Check your inbox" success state — shows the email address the link was sent to.
8. User clicks magic link in email; Supabase redirects back to the app.
9. `AuthContext` picks up the session; user is redirected to `/`.

**Edge cases:**
- Empty email: submit button is disabled (already enforced by `!email.trim()` check). Do not submit.
- Invalid email format: rely on `type="email"` browser validation; do not add custom regex.
- Supabase error (rate-limited, domain not allowed, network down): show `alert-error` banner with `error.message`. Status returns to `idle` so user can retry.
- User already authenticated when landing on `/login`: immediately redirect to `/`.
- Auth loading state: render nothing (or a centered spinner) while `loading === true` in `AuthContext`.
- No profile record in `team_members` table after first login: user should see an error state explaining they need to be invited. Do not crash silently.

**"Use a different email" link:** resets status to `idle` and clears email field.

---

### 1.2 Content Submission — Raw Idea

**Precondition:** User has `editor` or `admin` role. Route `/submit` enforces `minRole="editor"`.

**Happy path:**
1. User navigates to `/submit` via nav link or "New Submission" button on Dashboard.
2. Page loads with "Raw Idea" tab active by default.
3. User types content idea into the textarea (up to 10,000 characters).
4. Character counter updates live: default `text-tertiary`, warning at 9,000+ chars (`text-warning`), error at 10,001+ (`text-error font-semibold`).
5. User optionally toggles "Publish immediately after adaptation" switch.
6. User clicks "Submit Content" or presses **Cmd+Enter** (keyboard shortcut — not yet implemented, see Section 3).
7. Client validates: non-empty, under limit. If invalid, show field-level error, do not submit.
8. Button shows spinner + "Submitting..." label; form is disabled.
9. Alert banner appears below submit button: "Processing your content. This typically takes 40-60 seconds."
10. `submitContent()` POSTs to `{N8N_BASE}/content-submit`.
11. On success: toast "Content submitted! Generating drafts..." and navigate to `/submission/{id}`.
12. On navigation, the detail page immediately starts polling because status is `generating`.

**Edge cases:**
- API 400: show "Validation error: {message}" in `ErrorDisplay` above the form.
- API 409: show "Duplicate submission: {message}".
- API 500+: show "Server error: {message}. Please try again later."
- Network failure (fetch throws): show generic error.
- Response missing submission ID: navigate to `/` (dashboard) as fallback.
- Cancel button: navigate back to `/` without confirmation (no unsaved-change guard needed — this is creation, not editing).

---

### 1.3 Content Submission — URL

**Precondition:** Same as 1.2.

**Happy path:**
1. User clicks "URL" tab on `/submit`.
2. Input mode switches to URL mode with slide-in animation (`animate-fade-in`).
3. User pastes or types a URL.
4. Validation on submit: non-empty + must match `/^https?:\/\/.+/`. Field-level error shown inline.
5. Submit flow identical to 1.2 from step 5 onward.

**Supported URL types (informational copy):**
- Blog posts / articles (HTTP/HTTPS)
- YouTube video URLs
- Instagram post URLs

**Edge cases:**
- URL without protocol: show "URL must start with http:// or https://"
- Switching between idea/URL tabs clears validation errors (`setValidationErrors({})`).

---

### 1.4 Waiting for Draft Generation (Loading State UX)

**Context:** User arrives at `/submission/{id}` with `status === 'generating'`.

**Behavior:**
1. Detail page loads; shows submission info card at top.
2. Below the info card, `GeneratingState` component renders — animated spinner + copy like "Generating drafts... this takes ~40-60 seconds."
3. Polling starts immediately: first poll at 5 seconds (`INITIAL_POLL_INTERVAL = 5000`).
4. Each subsequent poll: interval multiplied by 1.5x (`BACKOFF_MULTIPLIER`), capped at 30 seconds (`MAX_POLL_INTERVAL`).
5. When `status` transitions to `pending_review`: polling stops, drafts section renders.
6. If status transitions to `error`: polling stops, error banner renders.

**What must NOT happen:**
- Do not show "Choose a Draft" section while still `generating`.
- Do not show an empty draft grid.
- Do not block the entire page with a full-screen spinner; the submission info card should remain visible.

**Edge cases:**
- User navigates away during generation: polling timer is cleared by the `useEffect` cleanup.
- Generation takes longer than expected: polling naturally backs off to 30s intervals. Consider adding a "still working..." message after 2 minutes (future P2).
- Page refreshed mid-generation: on mount, `loadData()` is called, status is still `generating`, polling resumes.

---

### 1.5 Reviewing 3 Drafts

**Context:** `status === 'pending_review'`, drafts array has 3 items.

**Layout:** Vertical stack of `DraftCard` components (1 column, full width).

**Each DraftCard must show:**
- Draft number (e.g., "Draft 1")
- Draft title/headline
- Full body text of the draft (not truncated — user needs to evaluate the full angle)
- "Select this draft" button

**Selection state:** Only one draft can be selected at a time. When a draft is being selected (`selectingDraftIdx === index`), that card's button shows spinner + "Selecting...". Other cards' buttons are not disabled (user can switch intent, though only one XHR fires at a time given the state).

**Edge cases:**
- Zero drafts in array despite `pending_review` status: show fallback message "No drafts available yet. They may still be loading." with a manual refresh option.
- Draft selection fails (API error): show `selectError` banner below the section header. Toast "Failed to select draft."

---

### 1.6 Selecting a Draft

**Happy path:**
1. User clicks "Select this draft" on a `DraftCard`.
2. Button shows spinner + "Selecting...".
3. `selectDraft()` POSTs to `{N8N_BASE}/draft-select` with `submission_id`, `selected_draft` (1-indexed), and `publishImmediately`.
4. On success: toast "Draft selected! Adapting content for platforms..."; `loadData()` called to refresh submission.
5. Status transitions from `pending_review` to `processing`.
6. Draft selection section disappears; "Adapting Content" spinner section appears.

**`publishImmediately` behavior:**
- If toggled ON at submission time (`submission.publish_immediately === true`): after adaptation completes, content is auto-published without user needing to click publish. The status will skip directly to `published`.
- If toggled OFF (default): user must manually publish.

**Edge cases:**
- Network failure during selection: show toast "Failed to select draft." and `selectError` message. Draft cards remain interactive so user can retry.
- If user re-enters the page after selecting a draft (status is `processing` or later): draft selection UI is not shown.

---

### 1.7 Reviewing Adapted Content Per Platform

**Context:** `showAdaptedContent` is true when `adaptedContent` exists AND status is one of `processing | scheduled | published` OR `selected_draft` is set.

**Layout:** Three cards stacked vertically:
1. LinkedIn card
2. X/Twitter card
3. Newsletter card

**Each card shows:**
- Platform icon + name in header
- Editable textarea (for `editor`/`admin` roles) or read-only pre-formatted block (for `viewer` role)
- Character/word counts below textarea
- "Publish" button in card header (for `admin` role only, hidden when status is `published`)

**Character limits:**
- LinkedIn: 3,000 characters. Counter shows warning at 2,700+, error at 3,001+.
- X/Twitter: 280 characters. Counter shows warning at 252+, error at 281+. Textarea border turns red when over 280.
- Newsletter: word count only (no hard limit). Subject line is a separate text input above the content textarea.

**Auto-expand behavior (P1 UX improvement, not yet implemented):**
- On first load of adapted content, auto-scroll to the adapted content section.
- All three platform cards should be expanded (visible) by default — no accordion collapse needed.

---

### 1.8 Editing Adapted Content

**Precondition:** User has `editor` or `admin` role (`canEdit === true`).

**Behavior:**
- All three platform textareas are live-editable.
- `hasUnsavedChanges` computed by comparing current edit state vs saved `adaptedContent` values.
- "Unsaved changes" badge shown in the section header when dirty.
- "Save Changes" button is disabled when `!hasUnsavedChanges || saving`.
- "Discard changes" button appears next to Save only when `hasUnsavedChanges === true`.

**Keyboard shortcut (P1, not yet implemented):** Cmd+S should trigger `handleSave()` when the adapted content section is visible and there are unsaved changes.

**Edge cases:**
- Saving with no changes: button is disabled, no action.
- Save succeeds: local `adaptedContent` state updated to match edits. `hasUnsavedChanges` set to false. Toast "Changes saved successfully!"
- Save fails: toast "Failed to save changes." State not reset — user edits preserved so they can retry.
- Viewer role: textareas not rendered; read-only `div` blocks shown instead. No save button shown.

---

### 1.9 Saving Edits

**API call:** Supabase `UPDATE` on `adapted_content` table, filtered by `submission_id`.

**Fields updated:**
- `linkedin_content` (string)
- `twitter_content` (string)
- `twitter_char_count` (computed: `editTwitter.length`)
- `newsletter_subject` (string)
- `newsletter_content` (string)
- `newsletter_word_count` (computed: word count of `editNewsletterContent`)

**Optimistic update:** After successful save, update `adaptedContent` local state immediately — do NOT re-fetch from Supabase. This prevents a flash of stale data.

---

### 1.10 Publishing to Individual Platforms

**Precondition:** User has `admin` role (`canPublish === true`). Submission status is NOT `published`.

**Happy path:**
1. Admin clicks "Publish" button in a platform card header.
2. That platform's button shows "Publishing..." and is disabled. `publishingAll` also disables the button.
3. `publishContent()` POSTs to `{N8N_BASE}/publish-content` with `{ submission_id, platforms: ['linkedin'] }` (or 'twitter' or 'newsletter').
4. On success: toast "{Platform} publishing started!"
5. After 3 seconds, `loadData()` is called to check if status updated.

**Edge cases:**
- Publish fails: toast "Failed to publish to {platform}: {message}". Button re-enables.
- If user has unsaved changes, individual platform publish buttons are NOT blocked (only "Publish All" is blocked by `hasUnsavedChanges`). This is the current behavior — maintain it.
- Status already `published`: platform-level publish buttons are hidden.

---

### 1.11 Publishing to All Platforms

**Precondition:** Admin role. Status not `published`. No unsaved changes.

**Happy path:**
1. "Publish to All Platforms" button is visible in the accent-bordered card (only to admins via `RoleGate`).
2. If `hasUnsavedChanges`: button is disabled; warning banner "You have unsaved changes. Save them before publishing." shown above the button.
3. Admin clicks "Publish to All Platforms".
4. Button shows spinner + "Publishing..."; `publishingAll = true`.
5. `publishContent()` POSTs with `{ submission_id, platforms: ['linkedin', 'twitter', 'newsletter'] }`.
6. On success: toast "Publishing to all platforms started!"
7. Polling interval starts: check `loadData()` every 3 seconds. When `status === 'published'`, clear poll and set `publishingAll = false`.
8. Safety timeout: after 60 seconds, clear poll and set `publishingAll = false` regardless (to prevent stuck state).
9. When status becomes `published`: green success banner replaces "Ready to Publish" card. All platform publish buttons are hidden.

**Edge cases:**
- Publish fails: toast "Publishing failed: {message}". `publishingAll` set to false. User can retry.
- Navigating away mid-publish: polling is not cleaned up in current code (this is a bug — see Section 6 Priority Matrix). The 60s safety timeout is the only guard.

---

### 1.12 Managing Platform Connections

**Route:** `/settings` — requires `admin` role.

**Page structure:** Grid of 3 platform cards (LinkedIn, X/Twitter, Newsletter). Each card shows platform icon, name, description, connection status, and a Connect/Disconnect action.

**Connection statuses:**
- No connection row: "Not connected" — show "Connect" button.
- `status === 'active'`: "Connected" — show account name/email if stored, show "Disconnect" button.
- `status === 'expired'`: "Token expired" warning — show "Reconnect" button.
- `status === 'revoked'`: treated as no connection (filtered out by `fetchConnections` query).

**Connect flows per platform:**

**LinkedIn:**
- Opens `LinkedInConnect` modal.
- Initiates OAuth flow (redirect to LinkedIn auth, callback at `/settings/callback/linkedin` handled by `OAuthCallback` page).
- After OAuth callback: save token to `platform_connections`, redirect back to `/settings`.

**X/Twitter:**
- Opens `TwitterConnect` modal.
- Same OAuth redirect pattern as LinkedIn. Callback at `/settings/callback/twitter`.

**Newsletter:**
- Opens `NewsletterConnect` modal.
- This is a form-based flow (no OAuth redirect) — user provides API key / ESP configuration.
- On success: `saveConnection()` called directly from modal. `connections` state updated optimistically. Toast "Newsletter connected!"

**Disconnect flow:**
1. Admin clicks "Disconnect".
2. Confirmation dialog (browser `confirm()` or modal — implement a proper confirmation UI, not `window.confirm()`).
3. `disconnectPlatform(connectionId)` calls Supabase UPDATE setting `status = 'revoked'`.
4. Remove from local `connections` array optimistically.
5. Toast "Platform disconnected."

**Edge cases:**
- OAuth popup/redirect blocked by browser: show inline error explaining they need to allow popups.
- Disconnect fails: toast error; do not remove from local state.
- Page load error fetching connections: show `alert-error` banner with dismiss.
- Loading state: 3 skeleton cards (same layout as loaded cards).

---

### 1.13 Inviting Team Members

**Route:** `/team` — requires `admin` role. "Invite Member" button visible only to admins via `RoleGate`.

**Happy path:**
1. Admin clicks "Invite Member".
2. `InviteModal` opens.
3. Admin enters invitee's email and selects a role (`viewer`, `editor`, `admin`).
4. Modal submits: inserts a row into `team_members` with `status = 'invited'`, `invite_token = <uuid>`, and `role`.
5. Invite link is generated: `{window.location.origin}/invite/{invite_token}`.
6. Link is auto-copied to clipboard with toast "Invite link copied to clipboard!"
7. Modal closes. `loadMembers()` is called to refresh the table.
8. New member row appears in table with "Invited" status badge.

**Edge cases:**
- Email already exists in team: show inline error "This email is already a team member."
- Clipboard API unavailable: toast `info` with the full invite link so admin can copy manually.
- Admin cannot set invitee role higher than their own (frontend validation — if the inviting user is `admin`, they can invite up to `admin`).

---

### 1.14 Accepting an Invite

**Route:** `/invite/:token` — public route (no auth required to land here).

**Happy path:**
1. Invitee clicks the invite link from their email or clipboard.
2. App loads at `/invite/:token`.
3. `AcceptInvite` page queries `team_members` where `invite_token = :token` and `status = 'invited'`.
4. If valid token: show invitation details (role, inviter name if available).
5. Invitee enters their name (display_name) if not already set.
6. Invitee clicks "Accept Invite" — this signs them in or prompts them to sign in via Supabase magic link.
7. On auth: update `team_members` row — set `status = 'active'`, `user_id = auth.user.id`, clear `invite_token`.
8. Redirect to `/` (dashboard).

**Edge cases:**
- Invalid or expired token: show error "This invite link is invalid or has already been used." with a link to contact the team admin.
- Token already accepted (`status !== 'invited'`): same error message.
- User already authenticated when accepting invite: skip the auth step, go straight to updating the record.
- Token lookup fails (Supabase error): show generic error with retry.

---

## 2. Page Requirements

### 2.1 Dashboard (`/`)

**Data required:**
- `submissions` table: all columns, ordered by `created_at DESC`.

**Actions:**
- Navigate to `/submit` (New Submission button, visible to editors/admins).
- Filter by status: `all | generating | pending_review | processing | scheduled | published | error`.
- Search by text (client-side filter on `raw_input + content_base + id`).
- Click a submission row to navigate to `/submission/{id}`.
- Clear filters button when filtered view is empty.

**Feedback:**
- Total submission count shown in subtitle.
- Filter buttons show count per status; filters with 0 count are hidden.
- Active filter highlighted with `bg-accent text-white shadow-glow-sm`.

**Loading state:**
- 4 skeleton cards while `loading === true`.
- Skeletons should match the shape of real submission rows.

**Empty states:**
- Zero submissions ever: `EmptyState` component (custom illustration + CTA to create first submission).
- Submissions exist but none match filters: dashed card with "No submissions match your filters." and "Clear filters" button.

**Error state:**
- `ErrorDisplay` with `onDismiss` and `onRetry` (calls `loadSubmissions`).

**Polling:**
- Every 15 seconds, `loadSubmissions()` is called. This is a simple interval, not backoff. Dashboard polling is intentionally simpler than the detail page.
- This keeps statuses like `generating` fresh without requiring user action.

**Performance note:** Filter and search are computed with `useMemo` — do not move these to useEffect or break memoization.

---

### 2.2 New Submission (`/submit`)

**Data required:**
- None on load. Form is entirely local state.

**Actions:**
- Toggle input mode: "Raw Idea" | "URL"
- Enter content (textarea or URL input)
- Toggle "Publish immediately" switch
- Submit form (POST to n8n)
- Cancel (navigate to `/`)

**Feedback:**
- Character counter updates live.
- Field-level validation errors shown inline.
- Submit button disabled + spinner during submission.
- Processing info banner shown during submission.
- Toast on success or failure.
- `ErrorDisplay` for API errors above the form.

**Loading state:** None (form is local state only).

**Error states:**
- Validation (client): field-level inline errors.
- API errors: `ErrorDisplay` at top of form with specific messages per HTTP status.

**Empty state:** N/A (page is a form).

**Keyboard shortcut (P1):** Cmd+Enter submits the form when focus is inside any form field.

---

### 2.3 Submission Detail (`/submission/:id`)

**Data required:**
- `submissions` table: single row by `id` (all columns).
- `submissions.drafts` JSONB column (fetched separately if not embedded).
- `adapted_content` table: row(s) where `submission_id = :id`.

**Actions:**
- Back navigation to `/`.
- Select a draft (editor/admin only, only when `status === 'pending_review'`).
- Edit LinkedIn content (editor/admin only).
- Edit X/Twitter content (editor/admin only).
- Edit newsletter subject + content (editor/admin only).
- Save edits (editor/admin only).
- Discard edits (editor/admin only).
- Publish to individual platform (admin only, status not `published`).
- Publish to all platforms (admin only, status not `published`, no unsaved changes).

**Feedback:**
- Status badge on submission info card.
- "Unsaved changes" badge when dirty.
- "You have unsaved changes. Save them before publishing." warning when trying to publish all while dirty.
- Published success banner when `status === 'published'`.
- Error banner when `status === 'error'` with `submission.error_details`.
- Toasts for every action outcome.

**Loading states:**
- Initial load: skeleton layout (breadcrumb skeleton + card skeleton + 3 draft card skeletons).
- Generating: `GeneratingState` component with animated spinner.
- Processing (adaptation): spinner card "Adapting Content — 15-30 seconds."
- Individual platform publish: button-level spinner.
- Publish all: button-level spinner.
- Save: button-level spinner.
- Draft select: card button-level spinner.

**Error states:**
- Full page error (can't load submission): `ErrorDisplay` with retry. No content rendered.
- Partial error (loaded but polling fail): `ErrorDisplay` dismissible.
- Draft select error: `selectError` banner below draft section header.

**Empty states:**
- `pending_review` but no drafts array: "No drafts available yet." fallback with note they may still be loading.

**Polling:**
- Triggered when `submission.status` is `generating` or `processing`.
- Starts at 5s, backs off by 1.5x multiplier, caps at 30s.
- Stops when status exits those two values.

**Role-gated sections:**
- Draft selection: visible to all authenticated users (for viewing), but "Select" button requires `editor+`.
- Content editing: textareas shown to `editor+`; read-only blocks shown to `viewer`.
- Platform publish buttons: `admin` only.
- "Publish to All" card: `admin` only, wrapped in `<RoleGate minRole="admin">`.

---

### 2.4 Settings (`/settings`)

**Data required:**
- `platform_connections` table: all rows where `status IN ('active', 'expired')`, ordered by `created_at DESC`.

**Actions:**
- Connect LinkedIn (open `LinkedInConnect` modal).
- Connect X/Twitter (open `TwitterConnect` modal).
- Connect Newsletter (open `NewsletterConnect` modal).
- Disconnect a platform (call Supabase UPDATE + remove from local state).

**Feedback:**
- Per-platform connection status display.
- Toast on disconnect success/failure.
- Newsletter connect: `onConnected` callback updates local state and shows toast.

**Loading state:** 3 skeleton cards (grid layout matching loaded state).

**Error state:** `alert-error` banner with dismiss if `fetchConnections` fails.

**Empty state:** N/A — grid always shows all 3 platform cards regardless of connection status.

---

### 2.5 Team (`/team`)

**Data required:**
- `team_members` table: all rows (likely filtered to current organization by RLS policy).

**Actions:**
- Invite member (admin only) — opens `InviteModal`.
- Change member role (admin only, cannot change own role).
- Toggle member status: `active` / `deactivated` (admin only).
- Resend invite link (copies link to clipboard for `status === 'invited'` members).

**Feedback:**
- Active member count in subtitle.
- Pending invite count shown if > 0.
- Toast for every action.
- Role change applied optimistically to local state.
- Status toggle applied optimistically to local state.

**Loading state:** Full-card spinner with "Loading team members..." text.

**Error state:** `alert-error` banner with dismiss.

**Empty state:** Dashed card with icon and "Invite your first team member" CTA.

---

### 2.6 Login (`/login`)

**Data required:** None.

**Actions:**
- Enter email.
- Submit form (sends magic link).
- "Use a different email" reset link.

**Feedback:**
- Spinner during sending.
- "Check your inbox" success state shows the target email.
- Error banner for failed sends.

**Loading state:** While `AuthContext.loading === true`, do not redirect and do not flash the form. Show nothing or a centered spinner.

**Empty state:** N/A.

---

### 2.7 Accept Invite (`/invite/:token`)

**Data required:**
- `team_members` table: single row where `invite_token = :token`.

**Actions:**
- Accept invite (sign in + update team_members row).

**Feedback:**
- Valid invite: show role and inviter details.
- Invalid/expired: error state with contact admin message.

---

### 2.8 OAuth Callback (`/settings/callback/:platform`)

**Data required:** Query params from OAuth redirect (`code`, `state`, etc.).

**Actions:**
- Exchange code for token (via Supabase or direct API).
- Save connection to `platform_connections`.
- Redirect to `/settings`.

**Feedback:**
- Loading spinner while exchanging token.
- Error state if exchange fails with link back to `/settings`.

---

## 3. UX Priorities

### 3.1 Instant Feedback on Every Action
- Every button that triggers an async operation must show a spinner and disabled state immediately on click.
- Never leave the user waiting with no visual feedback.
- Toasts appear within 100ms of success/failure (they fire synchronously before or immediately after the async operation resolves).

### 3.2 Clear Status Communication at Every Step
The status lifecycle must always be legible:

| Status | What user sees |
|---|---|
| `generating` | `GeneratingState` component: animated spinner + copy |
| `pending_review` | Draft selection grid |
| `processing` | "Adapting Content" spinner card |
| `scheduled` | Adapted content visible, not yet published |
| `published` | Green success banner; publish buttons hidden |
| `error` | Red error card with `error_details` + link to create new submission |

Status badge in the submission info card must always reflect current status.

### 3.3 Smooth Transitions Between States
- Each major state section uses `animate-fade-in` to prevent jarring content pops.
- When status changes from `generating` → `pending_review`, the `GeneratingState` unmounts and the draft grid mounts with animation.
- When status changes from `processing` → adapted content visible, the spinner card unmounts and content cards mount with animation.

### 3.4 Smart Defaults
- **Auto-select first draft for preview (P1):** When the draft grid first renders, visually highlight/expand the first draft card so the user has immediate content to evaluate without any click. This is a display affordance only — it does not call `selectDraft`.
- **Auto-scroll to adapted content (P1):** When `showAdaptedContent` becomes true for the first time (i.e., `adaptedContent` arrives while user is on the page), smooth-scroll to the adapted content section.
- **Auto-expand all platform cards:** All 3 are fully visible by default. No accordion.
- **Preserve input mode between navigations:** This is a low-priority nicety — do not pursue if it adds complexity.

### 3.5 Keyboard Shortcuts
These are not implemented yet. Priority P1:

| Shortcut | Context | Action |
|---|---|---|
| Cmd+Enter | `/submit` page, focus anywhere in form | Submit form |
| Cmd+S | `/submission/:id`, adapted content visible and dirty | Save changes |

Implementation:
- Add `keydown` event listener in `useEffect` on the relevant page.
- Check `(e.metaKey || e.ctrlKey) && e.key === ...`.
- Call the same handler function as the button click.
- Clean up listener on unmount.

### 3.6 Optimistic Updates
Applied in the current code:
- Role change in Team page: local state updated before confirmation from server.
- Status toggle in Team page: same.
- Newsletter connect: connection added to local state immediately.
- Disconnect: connection removed from local state immediately.
- Save adapted content: local `adaptedContent` updated immediately without re-fetch.

Optimistic updates are NOT used for:
- Draft selection (wait for server confirmation because status changes).
- Publishing (wait for server confirmation).
- New submission (wait for ID from server to navigate).

---

## 4. Data Contracts

### 4.1 n8n Webhook: Submit Content

**Endpoint:** `POST {VITE_N8N_WEBHOOK_BASE}/content-submit`

**Request body:**
```json
{
  "rawIdea": "string (optional, if input mode is 'idea')",
  "url": "string (optional, if input mode is 'url')",
  "publishImmediately": false
}
```
Exactly one of `rawIdea` or `url` will be present per request.

**Expected response (success 200/201):**
```json
{
  "submissionId": "uuid",
  "id": "uuid",
  "submission_id": "uuid"
}
```
The frontend checks `result.submissionId || result.id || result.submission_id` to be resilient to n8n response key naming.

**Error responses:**
- `400`: validation error — `{ "message": "..." }` or `{ "error": "..." }`
- `409`: duplicate — `{ "message": "..." }`
- `5xx`: server error — `{ "message": "..." }`

---

### 4.2 n8n Webhook: Select Draft

**Endpoint:** `POST {VITE_N8N_WEBHOOK_BASE}/draft-select`

**Request body:**
```json
{
  "submission_id": "uuid",
  "selected_draft": 1,
  "publishImmediately": false
}
```
`selected_draft` is 1-indexed (1, 2, or 3).

**Expected response (success):** Any 2xx. Response body not consumed.

**Effect:** n8n workflow sets `submissions.status = 'processing'` and begins platform adaptation. After adaptation, sets `status = 'scheduled'` (or `'published'` if `publishImmediately`).

---

### 4.3 n8n Webhook: Publish Content

**Endpoint:** `POST {VITE_N8N_WEBHOOK_BASE}/publish-content`

**Request body:**
```json
{
  "submission_id": "uuid",
  "platforms": ["linkedin", "twitter", "newsletter"]
}
```
`platforms` can be a subset for per-platform publish.

**Expected response (success):** Any 2xx. Frontend returns `{ success: true, message: '...' }` regardless of response body.

**Effect:** n8n publishes to specified platforms and sets `submissions.status = 'published'`.

---

### 4.4 Supabase Queries

#### `submissions` table

| Operation | Query |
|---|---|
| Fetch all | `SELECT * FROM submissions ORDER BY created_at DESC` |
| Fetch one | `SELECT * FROM submissions WHERE id = :id LIMIT 1` |
| Fetch drafts | `SELECT drafts FROM submissions WHERE id = :id LIMIT 1` |

Expected columns on `submissions`:
- `id` UUID
- `status` text: `generating | pending_review | processing | scheduled | published | error`
- `input_type` text: `idea | url`
- `raw_input` text (the idea text or the URL)
- `content_base` text (extracted content from URL if applicable)
- `drafts` JSONB array of draft objects: `[{ title, body, angle }, ...]` (structure inferred)
- `selected_draft` integer (1-indexed)
- `publish_immediately` boolean
- `error_details` text (nullable)
- `created_at` timestamp
- `updated_at` timestamp

#### `adapted_content` table

| Operation | Query |
|---|---|
| Fetch by submission | `SELECT * FROM adapted_content WHERE submission_id = :id` |
| Update by submission | `UPDATE adapted_content SET ... WHERE submission_id = :id RETURNING *` |
| Update by row id | `UPDATE adapted_content SET ... WHERE id = :id RETURNING *` |

Expected columns:
- `id` UUID
- `submission_id` UUID (FK to submissions)
- `linkedin_content` text
- `twitter_content` text
- `twitter_char_count` integer
- `newsletter_subject` text
- `newsletter_content` text
- `newsletter_word_count` integer
- `published_at` timestamp (nullable)
- `created_at` timestamp
- `updated_at` timestamp

#### `platform_connections` table

| Operation | Query |
|---|---|
| Fetch all (active/expired) | `SELECT * FROM platform_connections WHERE status IN ('active','expired') ORDER BY created_at DESC` |
| Disconnect | `UPDATE platform_connections SET status='revoked' WHERE id = :id RETURNING *` |
| Insert (newsletter) | `INSERT INTO platform_connections (...) RETURNING *` |

Expected columns:
- `id` UUID
- `platform` text: `linkedin | twitter | newsletter`
- `status` text: `active | expired | revoked`
- `account_name` text (nullable — display name of connected account)
- `access_token` text (nullable — stored encrypted in Supabase if applicable)
- `created_at` timestamp
- `updated_at` timestamp

#### `team_members` table

| Operation | Query |
|---|---|
| Fetch all | `SELECT * FROM team_members ORDER BY created_at DESC` (RLS restricts to org) |
| Update role | `UPDATE team_members SET role = :role WHERE id = :id` |
| Toggle status | `UPDATE team_members SET status = :status WHERE id = :id` |
| Invite (insert) | `INSERT INTO team_members (email, role, status, invite_token) VALUES (...)` |
| Accept invite | `UPDATE team_members SET status='active', user_id=:uid WHERE invite_token=:token` |

Expected columns:
- `id` UUID
- `user_id` UUID (FK to `auth.users`, nullable until invite accepted)
- `email` text
- `display_name` text (nullable)
- `role` text: `viewer | editor | admin`
- `status` text: `invited | active | deactivated`
- `invite_token` UUID (nullable, cleared after acceptance)
- `created_at` timestamp

---

### 4.5 Real-Time Subscriptions

**Currently implemented:** None. All live updates use polling.

**Recommended addition (P1):** Supabase Realtime subscription on `submissions` WHERE `id = :id` in `SubmissionDetail`. This would replace the exponential backoff polling and give instant status updates. Implementation:

```js
const channel = supabase
  .channel(`submission-${id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'submissions',
    filter: `id=eq.${id}`
  }, (payload) => {
    setSubmission(payload.new)
    // also fetch adapted_content if status changed to processing/scheduled/published
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```

**Recommended addition (P2):** Realtime on `adapted_content` WHERE `submission_id = :id` to catch when adaptation completes.

---

## 5. State Management

### 5.1 Local State vs Supabase

| Data | Where it lives | Notes |
|---|---|---|
| `submissions` list | Local state (Dashboard) | Refreshed every 15s |
| `submission` (detail) | Local state (SubmissionDetail) | Polled on generating/processing |
| `drafts` | Local state | Loaded on mount if status qualifies |
| `adaptedContent` | Local state | Loaded on mount if status qualifies |
| Edit fields (linkedin, twitter, newsletter) | Local state | Derived from `adaptedContent` on load |
| `hasUnsavedChanges` | Computed (useEffect comparing edit state vs adaptedContent) | Not stored |
| `connections` | Local state (Settings) | Refreshed on mount only |
| `members` | Local state (Team) | Refreshed on mount + after invite |
| Auth session | Supabase client (AuthContext) | Persisted by Supabase SDK |
| User profile | AuthContext local state | Loaded from `team_members` on session init |

### 5.2 Polling Intervals

| Location | Interval | Strategy |
|---|---|---|
| Dashboard | 15,000ms (15s) | Fixed interval |
| SubmissionDetail (generating/processing) | 5,000ms → 30,000ms max | Exponential backoff (1.5x) |
| SubmissionDetail (publishingAll) | 3,000ms | Fixed interval, cleared on `published` or 60s timeout |
| SubmissionDetail (post-publish refresh) | One-shot after 3,000ms | Single `setTimeout(loadData, 3000)` |

### 5.3 Optimistic Updates Required

| Action | Optimistic update |
|---|---|
| Change member role | Update `members` array in local state immediately |
| Toggle member status | Update `members` array in local state immediately |
| Disconnect platform | Remove from `connections` array immediately |
| Connect newsletter | Add to `connections` array immediately |
| Save adapted content | Update `adaptedContent` local state immediately, skip re-fetch |

### 5.4 State Resets

- Switching input mode (idea/url) on `/submit`: clear validation errors.
- Discard changes on SubmissionDetail: reset all 4 edit fields back to `adaptedContent` values.
- Successful draft save: `setHasUnsavedChanges(false)`, merge saved values into `adaptedContent`.

---

## 6. Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---|---|---|---|
| Content submission (raw idea + URL) | Critical | Low | P0 |
| Draft generation + polling (generating state) | Critical | Low | P0 |
| Draft review + selection | Critical | Low | P0 |
| Adapted content display (all 3 platforms) | Critical | Low | P0 |
| Save adapted content edits | Critical | Low | P0 |
| Publish all platforms | Critical | Low | P0 |
| Role-based access control (viewer/editor/admin) | Critical | Low | P0 |
| Magic link authentication | Critical | Low | P0 |
| Dashboard list with status filtering | High | Low | P0 |
| Error states on all pages | High | Low | P0 |
| Toast notifications (all actions) | High | Low | P0 |
| Loading skeletons (dashboard + detail) | High | Low | P0 |
| Character limits enforced (Twitter 280, LinkedIn 3000) | High | Low | P0 |
| Publish to individual platform | High | Low | P0 |
| Platform connections UI (Settings) | High | Medium | P0 |
| Team management (invite, role change, status toggle) | High | Medium | P0 |
| Accept invite flow | High | Medium | P0 |
| OAuth callback for LinkedIn + Twitter | High | High | P0 |
| Newsletter connect (API key form) | High | Medium | P0 |
| Exponential backoff polling (SubmissionDetail) | High | Low | P0 |
| Keyboard shortcut: Cmd+Enter to submit | Medium | Low | P1 |
| Keyboard shortcut: Cmd+S to save edits | Medium | Low | P1 |
| Auto-scroll to adapted content on arrival | Medium | Low | P1 |
| Smart default: highlight first draft card | Medium | Low | P1 |
| Supabase Realtime for SubmissionDetail | Medium | Medium | P1 |
| Disconnect confirmation modal (replace window.confirm) | Medium | Low | P1 |
| Publish "stuck" prevention: clean up publishAll poll on unmount | Medium | Low | P1 |
| Dashboard: search by submission title | Medium | Low | P1 |
| SubmissionDetail: show published_at date when published | Low | Low | P1 |
| "Still working..." message after 2min of generating | Low | Low | P2 |
| Supabase Realtime for adapted_content | Low | Medium | P2 |
| Per-platform publish status indicators (published to X but not LinkedIn) | Medium | High | P2 |
| Pagination or infinite scroll on dashboard | Low | Medium | P2 |
| Submission deletion / archiving | Low | Medium | P2 |
| Content history / version tracking | Low | High | P2 |
| Activity feed / audit log | Low | High | P2 |

---

## 7. Known Gaps and Bugs to Address

These are specific issues observed in the existing code that the engineer should fix:

### 7.1 Publishing Poll Leak (Bug — P1)
In `handlePublishAll()`, the `setInterval` poll is stored in a local variable `poll` that is not accessible in cleanup. If the user navigates away from `SubmissionDetail` while `publishingAll` is true, the interval continues running and calls `loadData()` (a stale closure).

**Fix:** Store the interval ID in a `useRef`, and clear it in a `useEffect` cleanup that runs on unmount.

### 7.2 No `published_at` Display (P1)
The code checks `adaptedContent?.published_at` in the published banner but the `adapted_content` table query (`SELECT *`) should return this column. Verify the column exists. If not, add it.

### 7.3 Profile Null on First Login (P1)
If a user authenticates via magic link but has no corresponding row in `team_members`, `profile` will be `null`. The app will render but role checks will fail silently (defaulting to no access). Implement a clear error state in `AuthContext` or on the dashboard: "Your account has not been set up. Please contact your admin."

### 7.4 `window.confirm()` for Disconnect (P1)
Disconnect currently has no confirmation UI visible in Settings. The `PlatformCard` component likely uses `window.confirm()` or calls `onDisconnect` directly. Replace with a proper inline confirmation state or modal.

### 7.5 Dashboard Polling Does Not Back Off (P2)
The dashboard polls every 15 seconds unconditionally, even when no submissions are in `generating` or `processing` status. This is wasteful. Consider skipping the poll interval when no submissions are in a live status.

### 7.6 AcceptInvite and OAuthCallback Pages Exist in Routes but Are Not in the Read Scope
The code imports and routes `AcceptInvite` and `OAuthCallback` but their implementation was not provided for review. Ensure these pages:
- Handle all edge cases documented in sections 1.14 and 2.8.
- Redirect properly on success.
- Have error states.

---

## 8. Environment Variables

| Variable | Used in | Purpose |
|---|---|---|
| `VITE_N8N_WEBHOOK_BASE` | `src/lib/api.js` | Base URL for n8n webhooks (e.g., `http://localhost:5678/webhook`) |
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | Supabase anon/public key |

All three are required. If any is missing, the app will fail silently (empty string passed to clients). Add startup validation that logs a warning if any is undefined.

---

*End of requirements document. All sections are complete and buildable without further clarification.*
