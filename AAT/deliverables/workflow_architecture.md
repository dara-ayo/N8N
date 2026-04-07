# Workflow Architecture

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo

---

## System Overview

The system consists of two n8n workflows connected by a shared Supabase database, a React frontend with role-based access control and invite-based onboarding, and Supabase Auth for authentication.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                                 │
│  Login (magic link) → AuthProvider → ProtectedRoute → RoleGate           │
│  Invite flow: /invite/:token → AcceptInvite → magic link → active member  │
│  Submit idea/URL → Review drafts → Select draft → View status            │
│  Settings (platform connections) → Team management                        │
└───┬────────────┬────────────┬──────────────┬────────────────────────────┘
    │            │            │              │
    │ POST       │ POST       │ POST         │ POST
    │ /content-  │ /draft-    │ /publish-    │ /oauth-
    │ submit     │ select     │ content      │ callback
    ▼            ▼            ▼              ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│   CONTENT PIPELINE (107 nodes)        │  │  OPERATIONS WORKFLOW          │
│   workflow_merged.json                │  │                              │
│                                       │  │  POST /oauth-callback:       │
│  /content-submit entry:               │  │    Validate code + state     │
│    Input Val → Dedup → URL/Raw →      │  │    IF LinkedIn:              │
│    Save Sub → Draft 1 → Draft 2 →     │  │      Exchange code → tokens  │
│    Draft 3 → Update DB → Return       │  │    IF Twitter (PKCE):        │
│                                       │  │      Exchange + verifier      │
│  /draft-select entry:                 │  │    Save to platform_conns     │
│    Validate → Fetch → Lock →          │  │    Redirect to /settings     │
│    Select → Adapt x3 → Save          │  │                              │
│                                       │  │  Scheduled cleanup:          │
│  /publish-content entry:              │  │    Find stale "generating"   │
│    Fetch content → Fetch creds →      │  │    submissions > 10 min      │
│    Refresh tokens if needed →         │  │    Update to "error" status  │
│    ┌────────┬────────┬──────────┐    │  └──────────────────────────────┘
│    │LinkedIn│Twitter │Newsletter│    │
│    │(live)  │(built) │(live)    │    │
│    └───┬────┴───┬────┴────┬─────┘    │
│        ↓        ↓         ↓          │
│    Update Status → Return results    │
└──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Database + Auth)                       │
│                                                                      │
│  Auth: magic link sessions, invite token activation, user mgmt       │
│  submissions: id, content_hash, input, drafts, status, dates         │
│  adapted_content: id, submission_id, platform, content, meta         │
│  team_members: id, user_id, email, role, status, invite_token        │
│  platform_connections: id, platform, access_token, refresh_token     │
│  platform_connections_safe: view (tokens masked)                     │
│                                                                      │
│  RLS: get_user_role() enforces role-based access on all tables       │
└─────────────────────────────────────────────────────────────────────┘
```

### Platform Connection Status

| Platform  | Workflow File              | Status                                   |
|-----------|----------------------------|------------------------------------------|
| LinkedIn  | Content Pipeline (Wf1)     | Connected (Fetemi's account), publishing live |
| Twitter/X | Content Pipeline (Wf1)     | OAuth built and working; API credits depleted |
| Newsletter| Content Pipeline (Wf1)     | Resend configured, sending live          |

---

## Content Pipeline: Content Intake & Draft Generation

**Workflow:** Content Pipeline (`workflow_merged.json`)
**Trigger:** POST webhook at `/content-submit`
**Purpose:** Accept a content idea or URL, generate 3 SEO-optimized article drafts from distinct angles, store them, and return previews to the frontend.

### Node-by-Node Flow

| # | Node Name | Type | Purpose |
|---|---|---|---|
| 1 | Receive Content Submission | Webhook | Entry point. POST, responseMode: lastNode |
| 2 | Validate Input Payload | Code | Checks body exists, rawIdea or url present, type validation, size limit (<1MB), sanitizes HTML |
| 3 | Generate Submission ID & Dedup Hash | Code | Creates unique submission ID (sub_xxx), hashes input content for duplicate detection |
| 4 | Check Duplicate in Supabase | HTTP Request | Queries submissions table for matching hash within 10-minute window |
| 5 | Is Duplicate? | IF | Routes to error response if duplicate found |
| 6 | Return Duplicate Error | Respond to Webhook | 409 "Already submitted" (true branch) |
| 7 | URL Provided? | IF | Branches based on whether URL field is populated (false/no-dup branch) |
| 8 | Fetch URL Content | HTTP Request | GETs the URL. 15s timeout, 3 retries exponential backoff |
| 9 | Extract Text from URL Response | Code | Strips HTML/scripts/styles, extracts plain text, truncates to 5000 chars. Returns 422 if content too thin |
| 10 | Use Raw Idea | Code | Passes raw idea text through as content_base (false branch) |
| 11 | Prepare Content Base | Code | Merge point — creates clean object with submissionId, contentBase, inputType |
| 12 | Save Submission to Supabase | HTTP Request | POSTs new row: id, content_hash, raw_input, content_base, status="generating" |
| 13 | Generate Draft 1 — Contrarian Angle | HTTP Request | OpenAI gpt-4o call. Prompt: contrarian/challenge-assumptions angle with full SEO rules |
| 14 | Validate Draft 1 | Code | Checks non-empty, ≥300 words, strips meta-commentary, extracts title |
| 15 | Generate Draft 2 — Practical How-To | HTTP Request | OpenAI call. Includes Draft 1 angle summary to force diversity |
| 16 | Validate Draft 2 | Code | Same validation |
| 17 | Generate Draft 3 — Data & Trends | HTTP Request | OpenAI call. Includes Draft 1+2 angle summaries |
| 18 | Validate Draft 3 | Code | Same validation |
| 19 | Package All Drafts | Code | Combines 3 drafts with metadata: angles, word counts, timestamps |
| 20 | Update Submission with Drafts | HTTP Request | PATCHes Supabase row: drafts JSON, status → "pending_review" |
| 21 | Format Success Response | Code | Builds response: submission_id, draft previews (200 char each), status |
| 22 | Return Drafts to Frontend | Respond to Webhook | 200 with draft data |

### Why sequential draft generation?

Drafts are generated one at a time, not in parallel. Each subsequent prompt includes a summary of previous draft angles. This produces genuinely distinct articles rather than three rephrased versions of the same argument. The latency cost (~30-45s extra) is invisible because the next step is human review.

---

## Content Pipeline: Draft Selection & Platform Adaptation

**Workflow:** Content Pipeline (`workflow_merged.json`)
**Trigger:** POST webhook at `/draft-select`
**Purpose:** Accept a draft selection from the manager, adapt the chosen article for LinkedIn/X/newsletter, optionally publish immediately, and update status.

### Node-by-Node Flow

| # | Node Name | Type | Purpose |
|---|---|---|---|
| 1 | Receive Draft Selection | Webhook | Entry point. POST, responseMode: lastNode |
| 2 | Validate Selection Input | Code | Checks submission_id present, selected_draft is 1/2/3 |
| 3 | Fetch Submission from Supabase | HTTP Request | GETs submission by ID |
| 4 | Validate Submission State | Code | Checks: exists, status=pending_review, not expired (72h TTL) |
| 5 | Lock Submission | HTTP Request | PATCHes status → "processing" (optimistic lock) |
| 6 | Extract Selected Draft | Code | Gets draft text by index from stored drafts array |
| 7 | Adapt for LinkedIn | HTTP Request | OpenAI call with PAS technique and LinkedIn formatting rules |
| 8 | Validate LinkedIn Content | Code | Enforces ≤3000 chars, checks for CTA |
| 9 | Adapt for X Twitter | HTTP Request | OpenAI call emphasizing 280-char hard limit |
| 10 | Enforce X Character Limit | Code | Hard truncation: sentence boundary at 280, fallback 277+"..." |
| 11 | Adapt for Email Newsletter | HTTP Request | OpenAI call with newsletter format rules |
| 12 | Validate Newsletter Content | Code | Extracts SUBJECT line, validates 250-600 words, checks CTA |
| 13 | Combine Adapted Content | Code | Merges all 3 platform versions into single object |
| 14 | Save Adapted Content to Supabase | HTTP Request | POSTs to adapted_content table |
| 15 | Publish Immediately? | IF | Checks publishImmediately flag |
| 16 | Publish to LinkedIn | HTTP Request | LinkedIn API post (true branch). Idempotency key: {id}-linkedin |
| 17 | Publish to X | HTTP Request | X API tweet (true branch). Idempotency key: {id}-twitter |
| 18 | Send Newsletter | HTTP Request | ESP API send (true branch). Idempotency key: {id}-newsletter |
| 19 | Prepare Published Response | Code | Formats response with published URLs |
| 20 | Prepare Scheduled Response | Code | Formats response for saved/scheduled content (false branch) |
| 21 | Update Submission Status | HTTP Request | PATCHes status → "published" or "scheduled" |
| 22 | Return Final Result | Respond to Webhook | 200 with result |

### Why an optimistic lock?

Before adaptation begins, the submission status is updated to "processing". This prevents a race condition where the same submission could be selected twice (double-click, browser retry). If the second selection webhook fires, it finds status="processing" instead of "pending_review" and rejects the request.

---

## Operations Workflow: OAuth Token Exchange

**Workflow:** Operations Workflow
**Trigger:** POST webhook at `/oauth-callback`
**Purpose:** Receive OAuth authorization codes from platform redirects (LinkedIn, Twitter/X), exchange them for access and refresh tokens, and store the credentials in Supabase.

### Node-by-Node Flow

| # | Node Name | Type | Purpose |
|---|---|---|---|
| 1 | Receive OAuth Callback | Webhook | Entry point. POST, receives code, state, and platform params from OAuth redirect |
| 2 | Validate Callback Input | Code | Checks code and state are present and non-empty. Decodes state parameter (base64 JSON containing platform, user_id, redirect_url, and optionally code_verifier for PKCE) |
| 3 | Verify State Integrity | Code | Validates state contains required fields, checks state hasn't expired (5-minute TTL), prevents replay attacks by checking for already-used state tokens |
| 4 | Is LinkedIn? | IF | Routes based on platform field from decoded state |
| 5 | Exchange LinkedIn Code | HTTP Request | POSTs to `https://www.linkedin.com/oauth/v2/accessToken` with grant_type=authorization_code, code, redirect_uri, client_id, client_secret. Returns access_token, expires_in |
| 6 | Extract LinkedIn Token Data | Code | Parses response: access_token, expires_in → calculates token_expires_at timestamp. Fetches LinkedIn user profile ID via /v2/userinfo |
| 7 | Is Twitter? | IF | Routes based on platform field from decoded state (false branch from node 4) |
| 8 | Exchange Twitter Code with PKCE | HTTP Request | POSTs to `https://api.twitter.com/2/oauth2/token` with grant_type=authorization_code, code, redirect_uri, client_id, code_verifier (from state). Uses Basic Auth header with client_id:client_secret |
| 9 | Extract Twitter Token Data | Code | Parses response: access_token, refresh_token, expires_in → calculates token_expires_at. Fetches Twitter user ID via /2/users/me |
| 10 | Upsert Platform Connection | HTTP Request | POSTs to Supabase platform_connections table with ON CONFLICT (platform) DO UPDATE. Saves access_token, refresh_token, token_expires_at, platform_user_id, platform_metadata |
| 11 | Format Success Redirect | Code | Builds redirect URL back to frontend /settings page with success=true query param |
| 12 | Format Error Redirect | Code | Builds redirect URL back to frontend /settings page with error message query param (used by error branches) |
| 13 | Return Redirect | Respond to Webhook | 302 redirect to the frontend URL from node 11 or 12 |

### Why exchange tokens server-side?

OAuth authorization codes must be exchanged for tokens using the client_secret, which cannot be exposed in frontend code. The Operations workflow webhook acts as the backend server in this flow, keeping secrets in the n8n credential store and only storing the resulting tokens in Supabase.

---

## Content Pipeline: Real Publishing

**Workflow:** Content Pipeline (`workflow_merged.json`)
**Trigger:** POST webhook at `/publish-content`
**Purpose:** Read platform credentials from Supabase, then publish adapted content to LinkedIn, Twitter/X, and newsletter ESP using real authentication tokens.

### Node-by-Node Flow

| # | Node Name | Type | Purpose |
|---|---|---|---|
| 1 | Receive Publish Request | Webhook | Entry point. POST, responseMode: lastNode. Expects submission_id and platforms array |
| 2 | Validate Publish Input | Code | Checks submission_id present, platforms is non-empty array with valid values (linkedin, twitter, newsletter) |
| 3 | Fetch Adapted Content | HTTP Request | GETs adapted_content from Supabase by submission_id. Validates content exists for each requested platform |
| 4 | Fetch Platform Credentials | HTTP Request | GETs platform_connections from Supabase for each platform in the request. Uses service role key to read real tokens (not the safe view) |
| 5 | Validate Credentials Available | Code | Checks that credentials exist and tokens are not expired for each requested platform. If token expired, checks for refresh_token and flags for refresh |
| 6 | Refresh Expired Tokens | HTTP Request | If any token is expired and a refresh_token exists, calls the platform's token refresh endpoint. Updates platform_connections with new tokens |
| 7 | Publish to LinkedIn? | IF | Checks if "linkedin" is in requested platforms array |
| 8 | Post to LinkedIn API | HTTP Request | POSTs to LinkedIn UGC API (`/v2/ugcPosts`) with Bearer token from platform_connections. Idempotency key: {submission_id}-linkedin. Includes adapted LinkedIn content |
| 9 | Publish to Twitter? | IF | Checks if "twitter" is in requested platforms array |
| 10 | Post to Twitter API | HTTP Request | POSTs to Twitter v2 API (`/2/tweets`) with Bearer token from platform_connections. Idempotency key: {submission_id}-twitter. Includes adapted tweet content |
| 11 | Publish to Newsletter? | IF | Checks if "newsletter" is in requested platforms array |
| 12 | Send via Newsletter ESP | HTTP Request | POSTs to Resend/SendGrid/Mailchimp API (determined by platform_metadata.provider) with API key from platform_connections. Idempotency key: {submission_id}-newsletter. Includes adapted newsletter content |
| 13 | Aggregate Publish Results | Code | Collects results from all platform publish attempts. Records success/failure per platform with published URLs or error details |
| 14 | Update Submission Status | HTTP Request | PATCHes Supabase submission record: status → "published" (all succeeded) or "partially_published" (some failed) or "publish_failed" (all failed). Sets published_at timestamps per platform |
| 15 | Format Publish Response | Code | Builds response with per-platform results: published URLs, error details, overall status |
| 16 | Return Publish Result | Respond to Webhook | 200 with publish results |

### Why separate publishing from adaptation?

The draft selection/adaptation section and the publishing section are separate webhook entry points within the Content Pipeline. This means: (1) adaptation and publishing are independently testable, (2) publishing can be triggered without re-adapting (adapted content is stored in Supabase), (3) the credential-fetching logic is isolated from content generation logic, and (4) adaptation can be tested in "dry run" mode while real publishing is disabled.

---

## Error Handling Strategy

### Per-node error handling
- Every HTTP Request node: retry on failure = true, 3 retries, exponential backoff starting at 1s
- Every AI generation node: 60s timeout
- Every validation Code node: returns structured error objects that downstream nodes check

### Error flow
- Validation failures → immediate webhook response with 400 and clear error message
- AI generation failures → after 3 retries, update Supabase status to "error", return 500 to frontend
- Supabase failures → logged in error output, return 503 to frontend
- URL extraction failures → graceful fallback to raw idea if available, otherwise 422

### Error visibility
- Every error response includes: what failed, which step, what input caused it
- Supabase submission record captures error state and details
- Frontend polls submission status and displays errors to the manager

---

## Data Model (Supabase)

### submissions table
| Column | Type | Purpose |
|---|---|---|
| id | text (PK) | Submission ID (sub_xxx) |
| content_hash | text | For duplicate detection |
| input_type | text | "url" or "raw_idea" |
| raw_input | text | Original user input |
| content_base | text | Extracted/cleaned content |
| drafts | jsonb | Array of 3 draft objects |
| selected_draft | integer | Which draft was chosen (1/2/3) |
| status | text | generating, pending_review, processing, published, scheduled, error |
| error_details | text | Error info if status=error |
| publish_immediately | boolean | Whether to publish on selection |
| created_at | timestamptz | Submission time |
| updated_at | timestamptz | Last status change |

### adapted_content table
| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| submission_id | text (FK) | Links to submissions |
| linkedin_content | text | Adapted LinkedIn post |
| twitter_content | text | Adapted tweet |
| twitter_char_count | integer | Actual character count |
| newsletter_subject | text | Email subject line |
| newsletter_content | text | Email body |
| newsletter_word_count | integer | Body word count |
| published_at | timestamptz | When published (null if scheduled) |
| created_at | timestamptz | Adaptation time |

### team_members table
| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References auth.users |
| email | text | Member email address |
| role | text | owner, admin, editor, or viewer |
| status | text | invited, active, or deactivated |
| invite_token | text | Unique token for invite flow (null after activation) |
| invited_by | uuid | user_id of the person who sent the invite |
| created_at | timestamptz | When the member was added |
| updated_at | timestamptz | Last role or status change |

### platform_connections table
| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| platform | text | linkedin, twitter, or newsletter |
| access_token | text | OAuth access token or ESP API key |
| refresh_token | text | OAuth refresh token (null for API keys) |
| token_expires_at | timestamptz | Token expiration time (null for non-expiring API keys) |
| platform_user_id | text | User/account ID on the external platform |
| platform_metadata | jsonb | Platform-specific data (ESP provider, scopes, account name) |
| created_at | timestamptz | When the connection was established |
| updated_at | timestamptz | Last token refresh or metadata update |

### platform_connections_safe view
| Column | Source | Purpose |
|---|---|---|
| id | platform_connections.id | Row identifier |
| platform | platform_connections.platform | Platform name |
| platform_user_id | platform_connections.platform_user_id | External account identifier |
| platform_metadata | platform_connections.platform_metadata | Non-sensitive metadata |
| token_expires_at | platform_connections.token_expires_at | Expiration info (for UI status display) |
| created_at | platform_connections.created_at | Connection timestamp |
| updated_at | platform_connections.updated_at | Last update timestamp |
| access_token_masked | CASE expression | Shows "••••••••" if token exists, NULL otherwise |

This view is used by the frontend Settings page to display connection status without exposing raw tokens. The frontend never reads from `platform_connections` directly.

### RLS Policies

All tables use Row Level Security enforced by a `get_user_role()` PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM team_members
  WHERE user_id = auth.uid() AND status = 'active'
$$ LANGUAGE sql SECURITY DEFINER;
```

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| submissions | all roles | editor+ | editor+ (own), admin+ (all) | admin+ |
| adapted_content | all roles | editor+ | admin+ | admin+ |
| team_members | all roles | admin+ | admin+ | owner only |
| platform_connections | admin+ | admin+ | admin+ | admin+ |

---

## Credential Requirements

| Credential | n8n Type | Used By |
|---|---|---|
| OpenAI API Key | HTTP Header Auth | All AI generation/adaptation nodes (Content Pipeline) |
| Supabase URL + anon key | Environment variables | Frontend Supabase client, RLS-enforced queries |
| Supabase service role key | Environment variables | n8n Supabase HTTP Request nodes (both workflows), bypasses RLS |
| LinkedIn OAuth client_id + client_secret | Environment variables | Operations — OAuth token exchange for LinkedIn |
| Twitter/X OAuth client_id + client_secret | Environment variables | Operations — OAuth token exchange for Twitter (PKCE flow) |
| User-provided LinkedIn access_token | Supabase (platform_connections) | Content Pipeline — Post to LinkedIn API with real credentials |
| User-provided Twitter/X access_token | Supabase (platform_connections) | Content Pipeline — Post to Twitter API (credits depleted) |
| User-provided ESP API key | Supabase (platform_connections) | Content Pipeline — Send newsletter via Resend |
| Supabase Auth config | Supabase dashboard | Magic link email provider, redirect URLs, JWT secret |
