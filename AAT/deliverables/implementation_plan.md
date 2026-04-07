# Implementation Plan

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-26

---

## Workflow Architecture

### Two-workflow design (implemented)

The system uses two n8n workflows sharing a Supabase database:

**Workflow 1 — Content Pipeline** (107 nodes, `workflow_merged.json`)

This workflow handles the complete content lifecycle from submission through publishing. It contains multiple webhook entry points within one unified workflow, making the entire content journey traceable in a single execution log.

```
[Entry: POST /content-submit]
  → Input Validation (Code node)
  → Duplicate Check (Supabase lookup by content hash)
  → IF: URL provided?
    → YES: HTTP Request (fetch URL) → Code node (extract/summarize)
    → NO: pass raw idea through
  → Merge extracted content or raw idea
  → Save submission record to Supabase (status: "generating")
  → Generate Draft 1 (HTTP Request to OpenAI)
  → Validate Draft 1 (Code node: length, format, structure)
  → Generate Draft 2 (with Draft 1 angle context)
  → Validate Draft 2
  → Generate Draft 3 (with Draft 1+2 angle context)
  → Validate Draft 3
  → Update Supabase record (drafts + status: "pending_review")
  → Return 200 with submission ID + draft previews

[Entry: POST /draft-select]
  → Input Validation (submission_id, selected_draft index)
  → Fetch submission from Supabase
  → IF: submission exists AND status == "pending_review"?
    → NO: Return error (expired/already processed/not found)
    → YES: Continue
  → Lock submission (update status: "processing")
  → Get selected draft text
  → Adapt for LinkedIn (HTTP Request to AI + Code node validation)
  → Adapt for X/Twitter (HTTP Request to AI + Code node: enforce 280 chars)
  → Adapt for Email Newsletter (HTTP Request to AI + Code node validation)
  → Save all adapted content to Supabase

[Entry: POST /publish-content]
  → Fetch adapted content and platform credentials from Supabase
  → Check token expiry, refresh if needed
  → Post to LinkedIn API (idempotency key)
  → Post to Twitter API (idempotency key)
  → Send via Resend API (idempotency key)
  → Update submission status + timestamps
  → Return 200 with per-platform results
```

**Workflow 2 — Operations**

Handles infrastructure-level concerns that run independently from content processing.

```
[Entry: POST /oauth-callback]
  → Validate code and state parameters
  → Decode state (platform, user_id, optional code_verifier for PKCE)
  → IF: LinkedIn → exchange code for tokens via LinkedIn OAuth endpoint
  → IF: Twitter → exchange code + code_verifier for tokens via Twitter OAuth endpoint
  → Save tokens to platform_connections in Supabase
  → Redirect to /settings with success or error param

[Scheduled: Stale Submission Cleanup]
  → Find submissions stuck in "generating" > 10 minutes
  → Update status to "error" with cleanup note
  → Prevents orphaned loading states
```

### Data Flow Diagram

```
Frontend (React)
    │
    ├── Supabase Auth (magic link login + invite token flow)
    │       │
    │       ▼
    │   AuthProvider → ProtectedRoute → RoleGate
    │
    ├── POST /content-submit ──→ [Content Pipeline] ──→ Supabase (drafts stored)
    │                                                          │
    │   ← 200 {submission_id, draft_previews} ────────────────┘
    │
    │   (Manager reviews drafts in UI)
    │
    ├── POST /draft-select ────→ [Content Pipeline] ──→ Supabase (adapted content)
    │
    ├── POST /publish-content ─→ [Content Pipeline] ──→ LinkedIn API (live)
    │                                │                → Twitter API (built, credits depleted)
    │                                └────────────────→ Resend API (live)
    │
    ├── POST /oauth-callback ──→ [Operations] ──→ Supabase (platform_connections)
    │
    ├── GET /submissions ──────→ Supabase (direct query, RLS-enforced)
    │
    ├── /settings ─────────────→ Supabase (platform_connections_safe view)
    │
    └── /team ─────────────────→ Supabase (team_members, RLS-enforced)
```

### Node Naming Convention

All nodes use descriptive names:
- `Validate Input Payload` (not "Code1")
- `Check Duplicate Submission` (not "IF")
- `Fetch URL Content` (not "HTTP Request")
- `Generate Draft 1 — Contrarian Angle` (not "HTTP Request1")
- `Validate Draft Length and Structure` (not "Code2")
- `Adapt Content for LinkedIn (PAS Format)` (not "HTTP Request3")

### Sticky Note Sections

Each logical section gets a sticky note:
1. **Input Handling** — validation, dedup, URL extraction
2. **Draft Generation** — sequential AI calls with angle diversification
3. **State Management** — Supabase reads/writes
4. **Platform Adaptation** — LinkedIn, X, newsletter formatting
5. **Publishing** — API calls with idempotency
6. **Error Handling** — catch-all patterns and error reporting

---

## Edge Cases — Handling Strategy

### Input Edge Cases

| Edge Case | Strategy |
|---|---|
| Empty/null payload | Validation node returns 400 immediately |
| Malformed JSON | n8n webhook node rejects with 400 by default; add explicit check |
| Missing required fields | Check for `rawIdea` or `url` presence; return 400 naming missing field |
| Wrong data types | Type coercion in validation node; reject if non-string |
| Payload >1MB | Code node checks `$input.first().json` size; reject with 413 |
| Unicode/injection in strings | Sanitize via Code node; strip HTML tags, escape special chars |
| Duplicate requests | Content hash + 10-min time window dedup in Supabase |
| Invalid/expired auth | Validate auth token (if used) before any processing |

### External Service Edge Cases

| Edge Case | Strategy |
|---|---|
| AI API 429 (rate limit) | HTTP Request node: 3 retries, exponential backoff (1s, 2s, 4s) |
| AI API 500/502/503 | Same retry config; after 3 fails, mark submission as "error" |
| API 200 with error body | Code node checks response for `error` field or missing `content` |
| API timeout | HTTP Request timeout set to 30s; retry on timeout |
| Unexpected response schema | Validation node checks for required fields before using response |
| Paginated results | Not expected for AI calls; URL extraction handles single-page |
| Credentials expired | Error trigger workflow catches auth errors; logs for manual fix |

### Processing Edge Cases

| Edge Case | Strategy |
|---|---|
| Concurrent executions | Each submission has unique ID; no shared mutable state |
| Partial failure (draft 2 of 3 fails) | Abort all; don't show partial drafts; return error with which draft failed |
| NaN/undefined in transforms | Code nodes use defensive defaults (`value || ''`, `parseInt(x) || 0`) |
| Empty arrays | Check `.length` before iteration; return appropriate empty state |
| Division by zero | Not applicable to this workflow (no numeric calculations) |
| String ops on null | Null-coalesce all string inputs before operations |

### Output Edge Cases

| Edge Case | Strategy |
|---|---|
| Platform API unavailable | Queue for retry; update status to "publish_pending" |
| X post exceeds 280 chars | Code node truncates to last sentence under 280; fallback: 277 + "..." |
| LinkedIn exceeds 3000 chars | Truncate with "Read more" link |
| Newsletter too long | Soft cap at 600 words (per formatting rules) |
| Notification delivery failure | Log failure; don't block main workflow |

---

## Implementation Sequence

### Step 1: Supabase Schema
- Create `submissions` table with all needed columns
- Create `adapted_content` table for platform-specific outputs
- Set up RLS policies
- Write seed data for dev/demo

### Step 2: Workflow 1 — Content Intake
Build node by node, testing each:
1. Webhook trigger node
2. Input validation Code node
3. Duplicate check (Supabase query)
4. URL extraction branch (IF node + HTTP Request + extraction Code node)
5. Raw idea passthrough branch
6. Merge node
7. Save submission to Supabase
8. Return response to frontend

### Step 3: Workflow 1 — Draft Generation
Continue Workflow 1:
9. Generate Draft 1 (HTTP Request to AI API with SEO prompt)
10. Validate Draft 1 (Code node)
11. Generate Draft 2 (with Draft 1 context in prompt)
12. Validate Draft 2
13. Generate Draft 3 (with Draft 1+2 context)
14. Validate Draft 3
15. Update Supabase with all 3 drafts, status → "pending_review"
16. Update webhook response with draft data

### Step 4: Workflow 2 — Selection & Adaptation
1. Webhook trigger (POST /draft-select)
2. Input validation (submission_id, selected_draft required)
3. Fetch submission from Supabase
4. Validate submission state (exists, status = pending_review)
5. Lock submission (status → "processing")
6. Adapt for LinkedIn (AI call + PAS format validation)
7. Adapt for X (AI call + 280-char enforcement)
8. Adapt for email newsletter (AI call + structure validation)
9. Save adapted content to Supabase

### Step 5: Workflow 2 — Publishing
10. IF publish_immediately
11. Publish to LinkedIn (HTTP Request with idempotency key)
12. Publish to X (HTTP Request with idempotency key)
13. Send newsletter (HTTP Request to ESP with idempotency key)
14. Update submission status → "published" or "scheduled"
15. Return response

### Step 6: Error Handling
1. Error trigger/catch logic within Content Pipeline
2. Error formatting Code node
3. Supabase status update to "error" with details
4. Optional notification (Slack/email)

### Step 7: Workflow Consolidation
- Merge Workflows 1, 2, 3, and 4 into a single Content Pipeline workflow
- Move OAuth exchange and cleanup into a separate Operations workflow
- Add all sticky notes and section dividers
- Color-code node groups by function
- Verify all credentials use n8n credential stores

### Step 8: Workflow Hygiene
- Descriptive node names throughout
- Disable any test/debug nodes
- Verify webhook URLs match frontend calls
- Test complete end-to-end execution in n8n UI

---

## Testing Strategy Overview

### Unit-level testing
- Each node tested individually with pinned test data
- Validation nodes tested with valid, invalid, and boundary inputs
- AI generation prompts tested for output quality and format compliance

### Integration testing
- Full Workflow 1 execution: submit → validate → generate → store
- Full Workflow 2 execution: select → adapt → publish
- Cross-workflow: submit → generate → (manual select) → adapt → publish

### Edge case testing
- Every edge case from the table above gets a dedicated test payload
- Test payloads stored as JSON files in `deliverables/test_payloads/`

### Pressure testing
- Burst: 20 concurrent requests via curl script
- Sustained: 100 requests over 60 seconds
- Poison: deeply nested JSON, huge strings, unicode edge cases
- Cascading: simulate one platform API failing while others succeed

### Regression
- After any fix, rerun ALL test cases, not just the one that broke
- Track pass/fail across iterations in test_results.md

---

## Credential Requirements

| Credential | Purpose | Storage |
|---|---|---|
| OpenAI or Anthropic API key | AI content generation | n8n credential store |
| Supabase URL + anon key | State management database | n8n credential store |
| Supabase service role key | RLS bypass for backend ops | n8n credential store |
| LinkedIn API OAuth | Publishing to LinkedIn | n8n credential store |
| X/Twitter API OAuth | Publishing to X | n8n credential store |
| Email ESP API key (e.g. Resend) | Newsletter sending | n8n credential store |
| Supabase Auth config | Magic link authentication | Supabase dashboard |
| LinkedIn OAuth client_id + client_secret | Platform onboarding OAuth flow | n8n credential store + environment variables |
| Twitter/X OAuth client_id + client_secret | Platform onboarding OAuth flow (PKCE) | n8n credential store + environment variables |
| User-provided LinkedIn OAuth tokens | Real publishing to LinkedIn | Supabase platform_connections table (encrypted at rest) |
| User-provided Twitter/X OAuth tokens | Real publishing to X | Supabase platform_connections table (encrypted at rest) |
| User-provided ESP API key | Real newsletter sending | Supabase platform_connections table (encrypted at rest) |

---

## Cost Awareness

- Sequential draft generation avoids wasted tokens on partial failures
- URL extraction result cached in Supabase — retries don't re-fetch
- Duplicate submission check prevents redundant AI calls
- SEO rules and formatting rules embedded in prompts (not fetched per-call) with periodic manual updates
- Token usage logged per submission for cost tracking
- Frontend validation prevents obviously invalid submissions from reaching n8n

---

## Role-Based Access Control (RBAC)

### Architecture

Authentication uses Supabase Auth with magic link login (no passwords). When a user clicks "Sign in," they enter their email, receive a magic link, and are authenticated upon clicking it. The frontend wraps the entire app in an `AuthProvider` that manages session state.

Authorization uses a four-role hierarchy enforced at every layer:

```
owner > admin > editor > viewer
```

| Role | Permissions |
|---|---|
| owner | Everything — team management, content, publishing, settings, platform connections, role assignment |
| admin | Team management, content operations, publishing, platform connections. Cannot delete workspace or demote owner. |
| editor | Submit content, review drafts, select drafts for adaptation. Cannot manage team, settings, or platform connections. |
| viewer | Read-only access to all content and status. Cannot submit, select, publish, or manage anything. |

### Database Layer

A `team_members` table in Supabase stores role assignments:

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References auth.users |
| email | text | Member email |
| role | text | owner, admin, editor, or viewer |
| status | text | invited, active, deactivated |
| invite_token | text | Unique token for invite flow |
| invited_by | uuid | Who sent the invite |
| created_at | timestamptz | When added |
| updated_at | timestamptz | Last status/role change |

RLS policies on all tables use a `get_user_role()` PostgreSQL function that looks up the current authenticated user's role from `team_members`. Each table's RLS policy checks the role against the required permission level for the operation (SELECT, INSERT, UPDATE, DELETE).

### Frontend Enforcement

- **AuthProvider** — wraps the app, manages Supabase Auth session, exposes user + role context
- **ProtectedRoute** — route-level guard that checks authentication and minimum required role before rendering the page
- **RoleGate** — inline component for conditional rendering based on role (e.g., hide the "Publish" button from viewers)
- **Login page** — email input + magic link flow, no password fields
- **Nav bar** — role-gated: editors and viewers do not see Team or Settings links
- **Header** — shows user profile info and sign-out button

### Implementation Steps

1. Enable Supabase Auth with magic link provider
2. Create `team_members` table with RLS policies
3. Write `get_user_role()` PostgreSQL function
4. Seed owner record for the initial admin user
5. Build AuthProvider and ProtectedRoute in the React frontend
6. Build RoleGate component for inline permission checks
7. Build Login page with magic link flow
8. Update Nav bar and header with role-gated elements
9. Test all four roles end-to-end (owner, admin, editor, viewer)

---

## Platform Onboarding

### Overview

Platform onboarding allows the team to connect their LinkedIn, Twitter/X, and newsletter ESP accounts so that Workflow 4 can publish with real credentials instead of placeholders.

### Connection Flows

**LinkedIn — OAuth 2.0:**
1. User clicks "Connect LinkedIn" on the Settings page
2. Frontend redirects to LinkedIn's OAuth authorization URL with client_id, redirect_uri, scope, state
3. User authorizes the app on LinkedIn
4. LinkedIn redirects back with authorization code
5. n8n Workflow 3 exchanges the code for access + refresh tokens
6. Tokens saved to `platform_connections` table in Supabase

**Twitter/X — OAuth 2.0 with PKCE:**
1. User clicks "Connect X" on the Settings page
2. Frontend generates a PKCE code_verifier and code_challenge
3. Frontend redirects to Twitter's OAuth authorization URL with code_challenge, state
4. User authorizes the app on Twitter
5. Twitter redirects back with authorization code
6. n8n Workflow 3 exchanges the code + code_verifier for access + refresh tokens
7. Tokens saved to `platform_connections` table

**Newsletter ESP — API Key:**
1. User clicks "Connect Newsletter" on the Settings page
2. User enters their ESP API key (Resend, SendGrid, or Mailchimp)
3. Frontend sends the key to Supabase (stored in `platform_connections`)
4. System validates the key by making a test API call

### Database Layer

A `platform_connections` table stores credentials:

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| platform | text | linkedin, twitter, newsletter |
| access_token | text | OAuth access token or API key |
| refresh_token | text | OAuth refresh token (null for API keys) |
| token_expires_at | timestamptz | Token expiration time |
| platform_user_id | text | User ID on the platform |
| platform_metadata | jsonb | Platform-specific data (ESP provider name, scopes, etc.) |
| created_at | timestamptz | Connection time |
| updated_at | timestamptz | Last token refresh |

A `platform_connections_safe` database view masks sensitive tokens:

```sql
CREATE VIEW platform_connections_safe AS
SELECT id, platform, platform_user_id, platform_metadata,
       token_expires_at, created_at, updated_at,
       CASE WHEN access_token IS NOT NULL THEN '••••••••' ELSE NULL END AS access_token_masked
FROM platform_connections;
```

The frontend Settings page at `/settings` reads from `platform_connections_safe` to show connection status without exposing raw tokens.

### Implementation Steps

1. Create `platform_connections` table with RLS policies (owner + admin only)
2. Create `platform_connections_safe` view
3. Register OAuth apps on LinkedIn Developer Portal and Twitter Developer Portal
4. Build Settings page in the React frontend
5. Implement OAuth redirect flows in the frontend
6. Build n8n Workflow 3 for OAuth token exchange
7. Test connection flow for each platform end-to-end

---

## Team Management

### Overview

Owners and admins can invite team members by email and assign them a role. The invite flow uses magic links so invited members never set a password.

### Invite Flow

```
Admin clicks "Invite Member"
  → Enters email + selects role
  → Frontend creates team_members row (status: "invited", invite_token generated)
  → System sends invite email with magic link
  → Recipient clicks link
  → Supabase Auth sends magic link email
  → Recipient clicks magic link → authenticated
  → Frontend checks invite_token → activates team_members row (status: "active")
```

### Team Page Features

- Table of all team members showing: name/email, role (badge), status (badge), actions
- Admins can change a member's role (except cannot demote the owner)
- Admins can deactivate or reactivate members
- Owner cannot be demoted by anyone (including other owners)
- Deactivated members cannot log in — the AuthProvider checks status on session restore

### Implementation Steps

1. Build invite API logic (create team_members row, generate invite_token)
2. Integrate with Supabase Auth magic link for invite emails
3. Build Team page with member table and role/status badges
4. Implement role change, deactivate, and reactivate actions
5. Add owner-demotion prevention guard
6. Test full invite flow: invite → email → magic link → activation

---

## Updated Implementation Sequence

The original Steps 1-7 remain. The following steps are added:

### Step 8: Authentication & RBAC

1. Enable Supabase Auth magic link provider
2. Create `team_members` table with columns: id, user_id, email, role, status, invite_token, invited_by, created_at, updated_at
3. Write `get_user_role()` PostgreSQL function
4. Create RLS policies on submissions, adapted_content, team_members, and platform_connections using `get_user_role()`
5. Seed owner record for the initial workspace admin
6. Build AuthProvider component (session management, role context)
7. Build ProtectedRoute component (auth + minimum role guard)
8. Build RoleGate component (inline role checks)
9. Build Login page (email input → magic link)
10. Update Nav bar with role-gated links
11. Add user profile + sign-out to header

### Step 9: Platform Onboarding

1. Create `platform_connections` table
2. Create `platform_connections_safe` view
3. Register OAuth apps (LinkedIn, Twitter)
4. Build Settings page (`/settings`) showing connection status
5. Implement LinkedIn OAuth redirect + callback handling
6. Implement Twitter/X OAuth + PKCE redirect + callback handling
7. Implement newsletter ESP API key input + validation
8. Build n8n Workflow 3: OAuth Token Exchange

### Step 10: Team Management

1. Build invite member form (email + role selection)
2. Create invite logic (team_members row + invite_token + magic link email)
3. Build Team page with member table
4. Implement role change action (with owner-demotion guard)
5. Implement deactivate/reactivate actions
6. Test full invite → activate → role change → deactivate cycle

### Step 11: Workflow 3 — OAuth Token Exchange

Build node by node:
1. Webhook trigger (POST /oauth-callback)
2. Input validation (code, state, platform required)
3. Decode and verify state parameter
4. IF: platform == linkedin → LinkedIn token exchange branch
5. IF: platform == twitter → Twitter token exchange branch (includes code_verifier from state)
6. Save tokens to platform_connections in Supabase
7. Return success redirect URL to frontend

### Step 12: Workflow 4 — Real Publishing

Build node by node:
1. Webhook trigger (POST /publish-content)
2. Input validation (submission_id, platforms array)
3. Fetch adapted content from Supabase
4. Fetch platform credentials from platform_connections in Supabase
5. IF: linkedin in platforms → Post to LinkedIn API with real access_token
6. IF: twitter in platforms → Post to Twitter API with real access_token
7. IF: newsletter in platforms → Send via Resend/SendGrid/Mailchimp API with real API key
8. Update submission status and published_at timestamps
9. Return success response with published URLs

---

## Updated Data Flow Diagram

```
Frontend (React)
    │
    ├── Supabase Auth (magic link login)
    │       │
    │       ▼
    │   AuthProvider → ProtectedRoute → RoleGate
    │
    ├── POST /content-submit ──→ [Workflow 1] ──→ Supabase (drafts stored)
    │                                                    │
    │   ← 200 {submission_id, draft_previews} ──────────┘
    │
    │   (Manager reviews drafts in UI)
    │
    ├── POST /draft-select ────→ [Workflow 2] ──→ Supabase (adapted content)
    │
    ├── POST /oauth-callback ──→ [Workflow 3] ──→ Supabase (platform_connections)
    │                                │
    │                                ├──→ LinkedIn OAuth token exchange
    │                                └──→ Twitter OAuth token exchange
    │
    ├── POST /publish-content ─→ [Workflow 4] ──→ Supabase (publish status)
    │                                │
    │                                ├──→ LinkedIn API (real token)
    │                                ├──→ X/Twitter API (real token)
    │                                └──→ Newsletter ESP API (real key)
    │
    ├── GET /submissions ──────→ Supabase (direct query, RLS-enforced)
    │
    ├── /settings ─────────────→ Supabase (platform_connections_safe view)
    │
    └── /team ─────────────────→ Supabase (team_members, RLS-enforced)
```

---

## Process Split: n8n vs Frontend Code

This section documents exactly what runs where in the system. The boundary is clean: n8n handles all backend processing and external API calls, while React handles all user-facing interaction and direct Supabase reads.

### What runs in n8n (backend workflows)

All business logic, data transformation, and external service integration runs inside n8n workflows. The frontend never calls OpenAI, LinkedIn, Twitter, or Resend directly.

| Responsibility | Workflow | Details |
|---|---|---|
| **Content validation** | Workflow 1 | Checks that `rawIdea` or `url` is present, validates data types, enforces the 1MB payload size limit, strips HTML tags, and rejects literal "null"/"undefined" strings. All validation runs in Code nodes before any processing begins. |
| **Deduplication** | Workflow 1 | Generates a SHA-256 hash of the input content, queries Supabase for matching hashes within a 10-minute window, and returns a 409 if a duplicate is found. This prevents wasted AI calls from accidental double-clicks. |
| **URL content extraction** | Workflow 1 | Fetches the URL via HTTP Request (15s timeout, 3 retries), strips HTML/scripts/styles in a Code node, extracts plain text, and truncates to 5000 characters. Returns a 422 if the extracted content is too thin (<50 chars of meaningful text). |
| **AI draft generation** | Workflow 1 | Three sequential HTTP Request calls to OpenAI's gpt-4o model. Each draft uses a different angle prompt (contrarian, practical how-to, data and trends). Drafts 2 and 3 include summaries of previous draft angles to force editorial diversity. Each call has a 60s timeout. |
| **Draft validation** | Workflow 1 | After each AI generation call, a Code node validates the response: checks for non-empty content, minimum 300-word count, strips meta-commentary (the AI sometimes adds "Here's a draft..."), and extracts the title. Invalid drafts trigger an abort of the entire submission. |
| **Platform content adaptation** | Workflow 2 | Three HTTP Request calls to OpenAI, each with platform-specific formatting instructions. LinkedIn adaptation uses the PAS technique (Problem-Agitate-Solution) and enforces a 3000-character limit. Twitter adaptation enforces a hard 280-character limit with sentence-boundary truncation. Newsletter adaptation produces a subject line and a 250-600 word body with a CTA. |
| **Adaptation validation** | Workflow 2 | Code nodes after each adaptation enforce platform constraints. The Twitter node hard-truncates at 280 characters (falls back to 277 + "..." if no sentence boundary fits). The LinkedIn node truncates at 2997 + "..." if over 3000. The newsletter node validates word count range and extracts the SUBJECT line from the AI output. |
| **OAuth token exchange** | Workflow 3 | Receives the authorization code from the OAuth redirect, decodes the state parameter (base64 JSON containing platform, user_id, redirect_url, and optionally code_verifier for PKCE), exchanges the code for access and refresh tokens via the platform's token endpoint, and saves the tokens to `platform_connections` in Supabase. LinkedIn and Twitter each have their own exchange branch. |
| **Real platform publishing** | Workflow 4 | Reads adapted content and platform credentials from Supabase, checks token expiration (refreshes if needed), then makes real API calls: POST to LinkedIn UGC API (`/v2/ugcPosts`), POST to Twitter v2 API (`/2/tweets`), POST to Resend API for newsletter. Each call uses idempotency keys (`{submission_id}-{platform}`) to prevent duplicate publishes. |
| **Token refresh** | Workflow 4 | Before publishing, checks `token_expires_at` for each platform's credentials. If expired and a `refresh_token` exists, calls the platform's refresh endpoint, saves the new tokens to `platform_connections`, and proceeds with the refreshed credentials. |
| **Error handling and status updates** | All workflows | Every workflow updates the submission status in Supabase at each stage: "generating," "pending_review," "processing," "published," "error," "partially_published." Error details include which specific node failed and why. HTTP Request nodes have 3 retries with exponential backoff (1s, 2s, 4s). |
| **All Supabase writes from workflows** | All workflows | n8n uses the Supabase service role key (bypasses RLS) for all database writes: creating submissions, saving drafts, saving adapted content, updating status, upserting platform connections, and recording published timestamps. |

### What runs in React frontend (code)

The frontend handles authentication, user interaction, data display, and direct Supabase reads. It never performs AI generation, content adaptation, or platform publishing.

| Responsibility | Component/Page | Details |
|---|---|---|
| **Magic link authentication** | `AuthProvider`, Login page | Uses the Supabase JavaScript client's `signInWithOtp()` method. Manages session state via `onAuthStateChange` listener. Stores the session in browser storage. Checks `team_members` table for active membership after authentication. Clears session and redirects if the user is deactivated. |
| **Role-based route protection** | `ProtectedRoute` | A wrapper component that checks authentication and minimum required role before rendering the page. Unauthenticated users are redirected to `/login`. Users with insufficient role see a "Not authorized" message or are redirected to the Dashboard. |
| **UI role gating** | `RoleGate` | An inline component used to conditionally render elements based on the user's role. For example, the "Approve & Publish Now" button is wrapped in `<RoleGate minRole="admin">`. The nav bar uses `RoleGate` to hide Team and Settings links from editors and viewers. |
| **Submission form and API calls** | New Submission page | Collects the content idea or URL from the user, validates client-side (non-empty input), and sends a POST request to the n8n webhook at `/content-submit`. Displays the loading state while waiting for the webhook response. On success, redirects to the submission detail page or dashboard. |
| **Draft display and selection** | Submission Detail page | Fetches the submission record from Supabase (direct client query, RLS-enforced) and renders the three draft cards with angle badges, titles, content previews, and word counts. The "Select This Draft" button sends a POST to the n8n webhook at `/draft-select` with the submission ID and selected draft index. |
| **Adapted content display** | Submission Detail page | Fetches the `adapted_content` record from Supabase and renders three platform-specific preview cards: LinkedIn post (with character count), Twitter tweet (with character count indicator), and newsletter (with subject line and word count). All content is read-only. |
| **Publish approval** | Submission Detail page | Renders the "Ready to Publish" card for admins and owners. The "Approve & Publish Now" button sends a POST to the n8n webhook at `/publish-content` with the submission ID and the list of connected platforms. Displays the success/failure response per platform. |
| **Team member management** | Team page | Reads team members from Supabase (`team_members` table, RLS-enforced). Creates new team member rows for invites (with generated `invite_token`). Updates role and status fields for existing members. All operations use the Supabase JavaScript client with the user's authenticated session (RLS policies enforce admin+ access). |
| **Platform connection UI** | Settings page | Reads from `platform_connections_safe` view (tokens masked) to display connection status. For LinkedIn and Twitter, constructs the OAuth authorization URL with client_id, redirect_uri, scope, and state, then navigates to the platform's authorization page. For newsletter, accepts the API key input and saves it to Supabase. Handles OAuth redirect callbacks by extracting the authorization code from the URL and sending it to n8n Workflow 3. |
| **OAuth redirect handling** | Auth callback pages | Catches the OAuth redirect from LinkedIn or Twitter, extracts the `code` and `state` parameters from the URL, sends them to n8n Workflow 3 (`/oauth-callback`) for token exchange, and then redirects back to the Settings page with a success or error message. For Twitter, the frontend generates the PKCE `code_verifier` and `code_challenge` before starting the flow and embeds the `code_verifier` in the state parameter. |
| **Real-time polling for status updates** | Dashboard, Submission Detail | The Dashboard polls Supabase every 15 seconds to refresh submission statuses. The Submission Detail page polls more frequently (every 5 seconds) when the submission is in an active state ("generating" or "processing") to provide timely feedback when drafts or adapted content become available. Polling stops when the submission reaches a terminal state ("published," "error"). |
| **All Supabase reads from frontend** | All pages | The frontend reads directly from Supabase using the JavaScript client with the authenticated user's session. RLS policies enforce role-based access: viewers can read submissions but not platform connections, editors can read submissions and their own content, admins can read everything. The frontend never reads from `platform_connections` directly (only the `_safe` view). |

### Why this split matters

The split between n8n and React is not arbitrary. It follows a principle: **secrets and business logic stay in n8n; interaction and display stay in React.**

- OpenAI API keys, OAuth client secrets, and platform access tokens are never exposed to the browser. All API calls that require these secrets happen inside n8n workflows.
- Content validation, AI generation, platform adaptation, and publishing are backend operations that should not depend on the frontend being available or trustworthy. A malicious frontend modification cannot bypass validation or publish unauthorized content because the n8n workflows enforce their own checks.
- The frontend's job is to make the system usable: collecting input, displaying output, managing navigation, and handling authentication. Supabase RLS provides a second layer of authorization that the frontend cannot circumvent.
- This split also makes each side independently testable. I can test n8n workflows with curl and verify every step in the execution log. I can test the React frontend against mock data in Supabase without running n8n at all.
