# Edge Cases — Handling Documentation

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo

---

## Input Edge Cases

### Empty/null payload to webhook
**How it's handled:** The "Validate Input Payload" Code node checks if `body` exists and is a non-null object. If the webhook receives an empty body, null, or undefined, the node returns a 400 response: `"Request body is required"`. No downstream nodes execute — the response goes straight back through the Respond to Webhook node.

### Malformed JSON body
**How it's handled:** n8n's webhook node rejects malformed JSON with a 400 before it even reaches our validation node. As a safety net, the validation node wraps body access in null-safe checks (`body?.rawIdea?.toString()`) so even if somehow a non-object gets through, it won't throw an unhandled exception.

### Missing required fields
**How it's handled:** The validation node checks that at least one of `rawIdea` or `url` is present and non-empty after trimming whitespace. The error message names exactly what's missing: `"Either rawIdea or url must be provided"`. This is deliberately not a generic "missing fields" error — the manager knows exactly what to fix.

### Fields with wrong data types
**How it's handled:** The validation node coerces inputs using `.toString().trim()` before checking them. If someone sends `rawIdea: 123` (number instead of string), it still works. If someone sends `rawIdea: {nested: "object"}`, toString() produces `"[object Object]"` which passes the non-empty check but is obviously garbage — the AI will produce a low-quality draft, but the system won't crash. A more aggressive approach would reject non-string types, but I chose tolerance here because the downstream AI can handle messy text.

### Excessively large payloads (>1MB)
**How it's handled:** The validation node checks `JSON.stringify(body).length > 1048576` and returns a 413 error: `"Payload exceeds 1MB size limit"`. This prevents memory issues in downstream Code nodes that manipulate the content. The 1MB limit is generous — a typical content idea is under 1KB.

### Special characters, unicode, injection attempts
**How it's handled:** The validation node strips HTML tags from `rawIdea` using a regex: `.replace(/<[^>]*>/g, '')`. This prevents XSS if the content is ever rendered in the frontend. SQL injection isn't a concern because Supabase uses parameterized queries via the REST API. For the AI prompts, special characters are fine — they go into a JSON string body to OpenAI, which handles them safely.

### Duplicate requests (same ID submitted twice)
**How it's handled:** The "Generate Submission ID & Dedup Hash" node creates a hash of the input content. The "Check Duplicate in Supabase" node queries for submissions with the same hash created in the last 10 minutes. If found, the "Is Duplicate?" IF node routes to a 409 response: `"This idea was already submitted recently. Check your pending reviews."` The 10-minute window catches accidental double-clicks without blocking intentional resubmissions of the same topic days later.

### Requests with expired or invalid auth tokens
**How it's handled:** If the frontend implements auth tokens, the validation node can check for a valid token before processing. Currently, the system relies on Supabase RLS policies and the frontend's auth layer. The n8n webhook itself is publicly accessible (by design — it's called from the frontend), but all Supabase operations use the service role key to enforce data isolation.

---

## External Service Edge Cases

### API returns 429 (rate limited)
**How it's handled:** Every HTTP Request node has retry on failure enabled with 3 retries and exponential backoff (1s, 2s, 4s). For OpenAI specifically, 429s are the most common transient error. Three retries with backoff handles burst rate limits well. If all retries fail, the error propagates and the submission status gets set to "error" with details about which node hit the rate limit.

### API returns 500/502/503
**How it's handled:** Same retry configuration as above. Server errors are typically transient. After 3 failed retries, the workflow logs the error, updates the submission status to "error" in Supabase, and returns a 500 to the frontend: `"Draft generation failed after multiple retries. Please try again."` The manager can resubmit — the duplicate check uses a 10-minute window, so resubmissions after a failure are allowed.

### API returns 200 but with an error in the response body
**How it's handled:** The "Validate Draft" Code nodes don't trust the HTTP status code alone. They check `response.choices[0].message.content` specifically. If the response is 200 but `choices` is empty, missing, or the content is null/empty, the validation returns an error: `"AI returned empty draft"`. This catches cases where OpenAI returns a 200 with a content filter refusal or an empty completion.

### API timeout (no response within threshold)
**How it's handled:** HTTP Request nodes for AI calls have a 60-second timeout. URL fetch has a 15-second timeout. Supabase calls have the default 30-second timeout. Timeouts trigger the retry mechanism. The timeout values reflect the expected response times: AI generation is slow (10-30s typical), URL fetch should be fast, Supabase should be sub-second.

### API returns unexpected schema
**How it's handled:** Every validation Code node after an AI call uses defensive property access: `response?.choices?.[0]?.message?.content`. If the schema is different (missing `choices`, different nesting), the null-safe access returns undefined, which the validation catches and reports as "AI returned empty/invalid response."

### API returns paginated results requiring multiple calls
**How it's handled:** Not a concern for AI generation (single response per call). For Supabase queries (duplicate check), the query includes `limit=1` since we only need to know if any duplicate exists. URL fetch targets a single page. If paginated content sources become a requirement later, the URL extraction node would need a pagination loop — noted as a future enhancement.

### API credentials expired or revoked mid-execution
**How it's handled:** If an OpenAI or Supabase credential fails with a 401/403, the retry mechanism won't help (auth errors are persistent, not transient). The error surfaces in the workflow execution log and the submission is marked as "error" with an auth-related message. Resolution requires a human updating the credential in n8n's credential store. The error message to the frontend is generic ("Content generation temporarily unavailable") to avoid exposing internal auth details.

---

## Processing Edge Cases

### Workflow triggered while a previous execution is still running
**How it's handled:** Each submission gets a unique ID. Workflow executions don't share mutable state — there's no global variable or shared file that two executions could conflict on. Two submissions can be generating drafts simultaneously without interference because each operates on its own Supabase row.

### Partial failure in multi-step process
**How it's handled:** Drafts are generated sequentially, and validation happens after each one. If Draft 2 fails after Draft 1 succeeded, the system doesn't show 2 out of 3 drafts — that's a confusing UX. Instead, the entire submission is marked as "error" with details about which draft failed. The already-generated Draft 1 is still in the Supabase row (in case manual recovery is needed), but the frontend only shows the error state.

For platform adaptation (Workflow 2): if LinkedIn adaptation succeeds but X adaptation fails, the already-adapted LinkedIn content is preserved in the adapted_content record. The submission status goes to "error" and the frontend shows which platform's adaptation failed. The manager can retry, and the system will re-adapt all three (not just the failed one) to ensure consistency.

### Data transformation produces NaN, Infinity, or undefined values
**How it's handled:** The Code nodes that deal with numbers (word counts, character counts) use explicit parsing with fallbacks: `parseInt(x) || 0`. Character count uses `.length` on strings (always a valid integer). Word count splits on whitespace and counts — an empty string produces `['']` with length 1, which is slightly inaccurate but not dangerous. The validation thresholds (300 words minimum) catch genuinely empty outputs regardless of edge-case counting.

### Array operations on empty arrays
**How it's handled:** The "Package All Drafts" node explicitly references named nodes (`$('Validate Draft 1')`) rather than iterating an array. If a validation node produces no output (shouldn't happen given the validation logic, but defensively), the `.first()` call returns undefined, which the subsequent `.json` access would throw on. This is an intentional hard failure — if we've lost a draft, we should not silently continue with partial data.

### Division by zero in calculations
**How it's handled:** No division operations exist in the workflow. All numeric operations are counts (word count, character count) or comparisons (threshold checks).

### String operations on null values
**How it's handled:** Every Code node that accesses potentially-null string values uses null coalescing: `value?.toString().trim() || ''`. The input validation node is particularly careful about this since the webhook body is the least trustworthy input in the system.

---

## Output Edge Cases

### Downstream consumer is unavailable
**How it's handled:** For publishing (LinkedIn, X, newsletter), each HTTP Request node has 3 retries with exponential backoff. If a platform is down after all retries, that specific publish fails but the adapted content is already saved in Supabase. The submission status goes to "error" with details about which platform failed. The content isn't lost — a manual publish or retry is possible.

### Response payload exceeds size limits
**How it's handled:** The webhook responses are structured to be small — they contain draft previews (200 chars each), not full drafts. The full draft content lives in Supabase and is fetched by the frontend separately. This keeps webhook responses under 10KB even with 3 drafts.

### X post exceeds 280 characters
**How it's handled:** The "Enforce X Character Limit" Code node does a hard check after AI generation. If the AI produces a tweet over 280 chars (common — LLMs don't count characters well), the node truncates to the last complete sentence that fits under 280. If no sentence boundary exists under 280, it hard-cuts at 277 characters and appends "...". The `truncated: true` flag is set so the frontend can indicate the tweet was adjusted.

### LinkedIn post exceeds 3000 characters
**How it's handled:** The "Validate LinkedIn Content" Code node truncates at 2997 characters and appends "..." if over the limit. The `truncated: true` flag is set.

### Newsletter too long or too short
**How it's handled:** The validation node checks word count is between 200-700 words (slightly wider than the 250-600 target to allow buffer). If outside range, the `withinWordLimit: false` flag is set. The content is still saved — word count violations are soft warnings, not hard failures, because a 610-word newsletter is better than a regeneration loop.

### Notification/alert delivery failure
**How it's handled:** Currently, error notifications are handled by the Supabase status update. If the status update itself fails (Supabase is down), the workflow execution log in n8n captures the error. This is a known gap — in production, adding a secondary notification channel (email, Slack) that fires on any error would improve visibility. Noted as a future enhancement.

---

## Authentication Edge Cases

### Magic link expired before user clicks it
**How it's handled:** Supabase Auth magic links have a configurable expiration (default: 1 hour). If the user clicks an expired link, Supabase returns an error and the frontend catches this in the AuthProvider's `onAuthStateChange` listener. The Login page displays: "This link has expired. Please request a new one." with a button to resend. No partial auth state is created — the user is simply not logged in.

### User authenticated but no team_members row exists
**How it's handled:** After Supabase Auth confirms the session, the AuthProvider queries `team_members` for a row matching the authenticated user's ID. If no row exists, the user sees a "No access" screen: "Your account is not associated with any team. Contact your team admin for an invite." The user can sign out but cannot access any protected routes. This prevents someone who somehow obtains a magic link (forwarded email, etc.) from accessing the system without a proper team membership.

### Concurrent login sessions from multiple devices
**How it's handled:** Supabase Auth supports multiple concurrent sessions by default. Each device gets its own JWT. The AuthProvider on each device independently manages its session. Role changes are checked on each protected action (not cached indefinitely) — if an admin changes a user's role, the next action on any device will reflect the new role. There is no "force logout other sessions" feature currently; this is noted as a future enhancement.

### Role changed while user is actively using the system
**How it's handled:** The frontend does not cache the user's role permanently. The AuthProvider fetches the role from `team_members` on initial load and on window focus (to catch changes made while the tab was in the background). The ProtectedRoute component checks the role on every route navigation. If a user's role is downgraded mid-session (e.g., admin → viewer), the next navigation to a restricted page (like /team or /settings) will redirect them to the dashboard with a message: "Your permissions have changed. Contact your admin." API calls to n8n webhooks are additionally protected by RLS at the Supabase level, so even if the frontend has a stale role, the database rejects unauthorized operations.

### Deactivated user attempts to access the system
**How it's handled:** When the AuthProvider loads, it checks both the Supabase Auth session validity AND the `team_members.status` field. If status is "deactivated," the AuthProvider clears the local session and redirects to the Login page with a message: "Your account has been deactivated. Contact your team admin." Even if the user has a valid Supabase Auth JWT, the RLS policies on all tables check `status = 'active'` via the `get_user_role()` function, so database queries return empty results for deactivated users.

### Magic link sent to wrong email / forwarded to unauthorized person
**How it's handled:** The magic link authenticates the email address it was sent to. If someone forwards their magic link, the recipient would be authenticated as the original email owner. However, the `team_members` table check ensures the authenticated email must have an active team membership. If the forwarded-to person's email is not in `team_members`, they see the "No access" screen. If it IS in `team_members` (because they were legitimately invited), then authenticating via a forwarded link is functionally equivalent to them requesting their own — no security gap.

---

## Platform Connection Edge Cases

### OAuth access token expired
**How it's handled:** Workflow 4 checks `token_expires_at` before using any token. If the token is expired and a `refresh_token` exists, the workflow calls the platform's token refresh endpoint first, updates `platform_connections` with the new token, and then proceeds with publishing. If the refresh also fails (refresh token expired or revoked), the workflow returns a clear error: "LinkedIn connection expired. Please reconnect in Settings." The submission status is set to "publish_failed" with details about which platform's token expired.

### Platform access revoked by user on the external platform
**How it's handled:** If a user revokes the app's access on LinkedIn or Twitter directly (through the platform's settings), the stored tokens become invalid. When Workflow 4 attempts to publish, the platform API returns a 401 or 403. The workflow catches this, updates the `platform_connections` row to clear the tokens, and returns: "LinkedIn access was revoked. Please reconnect in Settings." The Settings page will show LinkedIn as "Disconnected" on next load.

### OAuth state parameter mismatch
**How it's handled:** Workflow 3 validates the `state` parameter from the OAuth callback against what was originally generated. The state contains a timestamp, and the workflow rejects states older than 5 minutes. If the state is missing, malformed, or expired, the workflow redirects to the Settings page with an error: "Connection failed — please try again." This prevents CSRF attacks where an attacker tries to inject their own authorization code.

### PKCE code_verifier missing or mismatched (Twitter/X)
**How it's handled:** For Twitter's OAuth 2.0 with PKCE, the `code_verifier` is embedded in the encrypted state parameter. Workflow 3 extracts it during state decoding. If the code_verifier is missing from the decoded state, the workflow returns an error before attempting the token exchange. If the code_verifier doesn't match what Twitter expects (the code_challenge), Twitter's token endpoint returns a 400 error. The workflow catches this and redirects to Settings with: "X connection failed — security verification error. Please try again."

### OAuth callback received for already-connected platform
**How it's handled:** The Supabase upsert in Workflow 3 uses `ON CONFLICT (platform) DO UPDATE`, so reconnecting an already-connected platform simply overwrites the old tokens with new ones. The old tokens are invalidated by the platform when new ones are issued. The Settings page reflects the updated connection immediately.

### OAuth redirect URL mismatch
**How it's handled:** If the redirect_uri sent during authorization doesn't match the one registered with the OAuth app, the platform rejects the request before the user even authorizes. The user sees an error on the platform's page (not ours). If somehow a mismatched redirect_uri reaches Workflow 3, the token exchange will fail with a 400 from the platform. The workflow redirects to Settings with a generic connection error. This is typically a configuration issue fixed during setup, not a runtime concern.

### Multiple users attempting OAuth connection simultaneously
**How it's handled:** Each OAuth flow has a unique state parameter tied to the user who initiated it. Even if two admins click "Connect LinkedIn" at the same time, their state parameters are different, and the callbacks are processed independently. The upsert to `platform_connections` is on the platform column (not user-specific, since credentials are shared across the team), so the last successful connection wins. This is acceptable because platform credentials are team-level, not per-user.

---

## Team Management Edge Cases

### Admin attempts to demote the owner
**How it's handled:** The role change API checks both the requester's role and the target's role. If the target's current role is "owner," the update is rejected regardless of who is requesting it: "The owner role cannot be changed." This is enforced at both the frontend (the role dropdown is disabled for the owner row) and the database (an RLS policy or database trigger prevents UPDATE on team_members where role='owner' and the new role is different).

### Admin attempts to demote themselves
**How it's handled:** The role change logic checks if the requester's user_id matches the target's user_id. If so, self-demotion is blocked: "You cannot change your own role." This prevents an admin from accidentally locking themselves out of team management. If they genuinely need a role change, another admin or the owner must do it.

### Invite sent to an email that already has a team_members row
**How it's handled:** Before creating an invite, the system checks if a `team_members` row already exists for that email. If the existing row has status "active," the invite is rejected: "This person is already a team member." If the existing row has status "deactivated," the admin is prompted: "This person was previously deactivated. Would you like to reactivate them instead?" If the existing row has status "invited" (pending invite), the admin is told: "An invite was already sent to this email. You can resend it."

### Invited user never clicks the magic link
**How it's handled:** The `team_members` row stays in "invited" status indefinitely. The Team page shows this person with an "Invited" badge. The admin can resend the invite or delete the pending invite. There is no automatic cleanup of stale invites — the admin manages this manually. The invite_token does not expire in the database (the magic link email itself has Supabase Auth's expiration, but a new magic link can be sent using the same invite_token).

### Race condition: two admins changing the same member's role simultaneously
**How it's handled:** Supabase's row-level updates are atomic. The last write wins. If Admin A changes a member to "editor" and Admin B changes the same member to "viewer" at nearly the same time, the member ends up with whichever role was written last. There is no optimistic locking on role changes. The Team page shows the current state on refresh. For the expected team sizes (small teams), this race is extremely unlikely and the consequence (wrong role temporarily) is low-impact since the admin can simply correct it.

### Owner tries to leave or delete their own account
**How it's handled:** The owner cannot deactivate themselves or delete their own `team_members` row. The frontend disables these actions for the owner's own row. At the database level, an RLS policy prevents DELETE or status change to "deactivated" on team_members rows where role='owner'. Ownership transfer is not currently supported — noted as a future enhancement.
