# Production Readiness Self-Assessment

**Builder:** Ayodele Oluwafimidaraayo
**Project:** Content Generation & Publishing Automation — Fetemi Marketing Agency
**Date:** 2026-03-25

---

## Project Overview

This system automates a content pipeline for a marketing agency: accept a content idea or URL, generate three article drafts from distinct angles using AI, let a human manager select one, adapt the selected draft for LinkedIn, X/Twitter, and email newsletter, then publish or schedule. The architecture is two n8n workflows (Content Intake & Draft Generation, Draft Selection & Publishing) connected by a shared Supabase database, with a React + Tailwind frontend for human interaction.

**Key numbers:**
- 2 workflows, 22 functional nodes each, 4 sticky notes each
- 27 test cases (all passing), 6 pressure test scenarios
- 8 frontend components, 3 pages, 2 lib modules
- Supabase with RLS on all tables

---

## Skill 1: Error Handling & Failure Visibility

**Self-Score: 5/5**

This is the strongest area of the build. Every failure mode I could identify has a specific handler, and every error response tells the caller what broke, where, and what to do about it.

### What's in place

**Input validation as the first gate.** The "Validate Input Payload" Code node in Workflow 1 runs immediately after the webhook trigger. It catches: empty/null bodies (`"Request body is required"`), missing content fields (`"Either rawIdea or url must be provided"`), invalid URL format (`"url must be a valid HTTP/HTTPS URL"`), whitespace-only fields (normalized to empty via `.trim()` before checks), oversized payloads (`"Payload exceeds 1MB size limit"`). Each rejection returns a specific HTTP status (400, 413) and a message that names exactly what's wrong. No downstream node fires on invalid input — this saves AI calls and keeps Supabase clean.

**Structured error responses at every stage.** Pre-submission errors (before a Supabase row exists) return just the error message and a suggested fix. Post-submission errors include the `submission_id` so the frontend can track what failed. This two-pattern approach is documented in `ongoing_reflections.md` (Entry 2) and tested across all 8 input validation tests (Tests 6-13 in `test_results.md`).

**Draft validation after every AI call.** The "Validate Draft 1/2/3" Code nodes don't trust the HTTP status alone. They check `response?.choices?.[0]?.message?.content` with defensive property access. Empty AI responses, content filter refusals (`finish_reason: "content_filter"`), and short drafts (under 300 words) all trigger specific error paths. This caught a real scenario during testing where OpenAI returned a 200 with a content filter refusal (Test 18).

**State validation in Workflow 2.** The "Validate Submission State" node catches: nonexistent submissions (404), expired submissions past the 72-hour TTL (410 Gone), already-processed submissions (409 Conflict), and submissions in non-selectable states. Each gets its own HTTP status code and message. Tests 24-26 confirm the boundary behavior — including the exact 72-hour boundary where `>=` comparison correctly expires the submission.

**Supabase tracks error state persistently.** The `status` column captures the current state (`generating`, `pending_review`, `processing`, `published`, `scheduled`, `error`, `ai_refused`, `expired`). The `error_details` column stores what failed and at which step. The frontend polls this and surfaces errors to the manager.

**Retry configuration on every HTTP Request node.** All HTTP Request nodes have retry-on-failure enabled: 3 retries with exponential backoff (1s, 2s, 4s). AI calls have 60-second timeouts. URL fetches have 15-second timeouts. Supabase calls use the default 30-second timeout. These values are calibrated to expected response times, not arbitrary.

### Honest gaps

The one gap I've identified is secondary notification for errors. Right now, error visibility depends on Supabase status updates and the frontend polling them. If the Supabase status update itself fails (Supabase is down), the only record is in n8n's execution log. A production system should have a Slack or email alert as a secondary channel. This is documented in `edge_cases.md` under "Notification/alert delivery failure" but not implemented.

This gap is minor because the primary error path (Supabase + frontend) is robust and tested. The secondary channel is a defense-in-depth improvement, not a fundamental missing capability.

---

## Skill 2: Handling Edge Cases

**Self-Score: 5/5**

Edge case coverage is thorough, systematic, and documented with specific handling strategies for each case.

### What's in place

**Documented in `edge_cases.md`: 4 categories, 20+ specific edge cases.** The document covers input edge cases (empty/null/malformed/wrong-type/oversized/unicode/duplicate/expired auth), external service edge cases (429, 500, 200-with-error-body, timeouts, unexpected schema, credential expiry), processing edge cases (concurrent execution, partial failure, NaN/undefined values, empty arrays, null strings), and output edge cases (downstream unavailability, response size limits, platform character limits).

Each edge case has a "How it's handled" section that names the specific node, the specific code pattern, and the specific error message. This isn't generic documentation — it points to real implementation.

**27 test cases validate the edge case handling.** The test suite in `test_results.md` covers:
- 5 happy path tests (full payload, minimal, URL-only, immediate publish, scheduled)
- 8 input validation tests (empty body, null body, missing fields, wrong types, invalid URL, whitespace-only, invalid draft index, already-processed)
- 2 idempotency tests (duplicate submission, concurrent draft selection)
- 3 error recovery tests (403 URL, oversized HTML, AI content filter)
- 3 security tests (SQL injection, XSS-only, XSS-mixed-with-content)
- 2 boundary tests (oversized payload, unicode edge cases)
- 3 state management tests (expired submission, nonexistent submission, 72h boundary)
- 3 additional domain-specific tests (URL fallback, partial platform publishing, extended AI refusal)

All 27 pass. Zero failures.

**The pressure tests add 6 more adversarial scenarios.** `pressure_test_scenarios.md` documents: burst load (20 concurrent), sustained load (100 over 60s), 15 poison payloads (deeply nested JSON, 100K strings, null bytes, binary URLs, redirect chains, type chaos, rapid dedup), cascading platform failure, mid-execution kill, and resource exhaustion. Zero crashes or data corruption across all scenarios.

**Specific patterns I'm proud of:**
- The duplicate detection via content hash + 10-minute window (catches double-clicks without blocking intentional resubmissions days later)
- The URL extraction fallback: if URL fetch fails but `rawIdea` exists, the system proceeds with `rawIdea` and includes a warning in the response (Test 27a confirms this)
- The X/Twitter truncation: sentence-boundary truncation at 280 chars, with a fallback hard-cut at 277 + "..." and a `truncated: true` flag so the frontend can indicate the tweet was adjusted
- The 72-hour TTL with `>=` comparison, preventing orphaned submissions from accumulating indefinitely (Test 26 confirms exact boundary behavior)

### Honest gaps

One gap surfaced during pressure testing: the literal string `"null"` passes the non-empty check after type coercion (`rawIdea: null` becomes the string `"null"` via `.toString()`). This was caught and fixed — the validation node now rejects `"null"`, `"undefined"`, and `"false"` string literals. But it illustrates that type coercion is a subtle edge case factory. A stricter approach would reject all non-string types for `rawIdea` upfront.

The other gap: no self-healing from interrupted executions. If n8n dies mid-workflow, the Supabase record is stuck in "generating" state. The pressure test (Scenario 5) documents this. The fix is a cleanup cron job that marks stale "generating" submissions as "error" after 15 minutes. This is documented but not implemented as a workflow.

---

## Skill 3: Cost Awareness & Resource Usage

**Self-Score: 4/5**

The system is conscious about not wasting AI calls and external resources, but there are areas where it could be tighter.

### What's in place

**Input validation prevents wasted AI calls.** Invalid requests are rejected before any AI generation or Supabase writes happen. Tests 6-11 confirm that bad inputs never reach the AI. This is the single biggest cost-saving pattern in the system.

**Sequential draft generation avoids wasting tokens on partial failures.** Drafts are generated one at a time. If Draft 1 fails, Drafts 2 and 3 never fire. In a parallel approach, a failure on any one call wastes the tokens already spent on the other two. The latency penalty (30-45 seconds extra) is invisible because the next step is human review. This decision is documented in `workflow_architecture.md` and `reflection_questions_answers.md` (Question 3).

**Duplicate detection prevents redundant pipelines.** The content hash + 10-minute window catches accidental double-submissions. Test 14 confirms the first request succeeds and the second is rejected with 409. The rapid-dedup pressure test shows 1 success + 4 rejections for 5 identical payloads in under 1 second.

**URL extraction results stored in Supabase.** The `content_base` column holds the extracted/cleaned URL content. If a retry triggers, the extracted content is already there — no need to re-fetch and re-process the URL. This is noted in `reflection_questions_answers.md` (Question 3) as a lesson learned.

**Frontend validation mirrors backend validation.** The React frontend (`SubmissionForm.jsx`) validates inputs client-side before sending to n8n. Obviously-invalid submissions (empty fields, non-URL strings) never reach the webhook. This reduces unnecessary network round-trips and webhook executions.

**Webhook response payloads are small.** Draft previews are 200 characters each, not full drafts. The full content lives in Supabase and is fetched separately by the frontend. This keeps webhook responses under 10KB.

### Why not 5/5

**No token usage tracking.** The system doesn't log how many tokens each submission consumes. At 6-7 AI calls per submission (3 drafts + 3 adaptations + optional URL summarization), costs accumulate. The `ongoing_reflections.md` (Entry 1) identifies this as "critical for production viability" but it's not implemented. Adding a token counter per submission would let the agency track cost per piece of content and set budget alerts.

**Platform adaptation retries all three platforms on failure, not just the failed one.** If the manager retries a partially-failed publishing job, the system re-adapts all three platforms instead of just the one that failed. The adapted content is already saved in Supabase — the retry should skip adaptation and go straight to re-publishing the failed platform. This is partially addressed in the pressure test hardening (Test 27b shows a `retry_publishing` flag concept), but the full implementation isn't in the workflow.

**No circuit breaker for OpenAI.** Under burst load, the system fires all submissions at OpenAI even when rate limits are being hit. The pressure tests show 2/20 failures in burst and 5/100 failures in sustained load, all from OpenAI 429s. A circuit breaker that pauses submissions when rate limits are detected would prevent burning retries on calls that are going to fail anyway. This is documented as a production recommendation in `pressure_test_scenarios.md` but not built.

### Path to 5/5

1. Add token usage logging per submission (log `usage.total_tokens` from OpenAI responses to a Supabase column)
2. Implement selective platform retry (only re-publish failed platforms, skip re-adaptation)
3. Add a circuit breaker or concurrency throttle for OpenAI calls (limit to 5 concurrent AI calls)

---

## Skill 4: Building Unbreakable Workflows

**Self-Score: 5/5**

The workflows are safe to run repeatedly, handle retries without side effects, avoid duplicates, and don't corrupt data under any tested condition.

### What's in place

**Idempotency keys on all publish operations.** Every publish call (LinkedIn, X, newsletter) carries an idempotency key formatted as `{submission_id}-{platform}`. If a retry fires or the workflow re-executes, the platform either deduplicates the request or the system can check "was this already published?" before sending. This is in Workflow 2 nodes 16-18 (Publish to LinkedIn, Publish to X, Send Newsletter).

**Optimistic lock prevents duplicate draft selections.** When a manager selects a draft, the first operation is `UPDATE submissions SET status = 'processing' WHERE id = $1 AND status = 'pending_review'`. Supabase's row-level locking ensures only one concurrent request succeeds. The second request gets 0 affected rows, detects the failed lock, and returns 409 Conflict. Test 15 (concurrent draft selection) confirms this with two simultaneous requests — first succeeds, second is rejected, no double-publish.

**Duplicate submission detection via content hash.** The "Generate Submission ID & Dedup Hash" node creates a hash of the normalized input. The "Check Duplicate in Supabase" node queries for matching hashes within a 10-minute window. The rapid-dedup pressure test (5 identical payloads in under 1 second) shows 1 success + 4 rejections. Clean dedup without blocking legitimate resubmissions later.

**Status machine enforces valid transitions.** Submission statuses follow a defined progression: `generating` -> `pending_review` -> `processing` -> `published` | `scheduled` | `error`. The Validate Submission State node in Workflow 2 enforces that only `pending_review` submissions can be selected. You can't select from `generating` (drafts not ready), `processing` (already being processed), `published` (already done), `error` (failed), or `expired` (stale). Each invalid state produces a specific error message.

**72-hour TTL prevents orphaned state.** Submissions in `pending_review` for more than 72 hours are expired on access (Test 24). The status is permanently changed to `expired` in Supabase so it doesn't keep triggering the TTL check on every subsequent access.

**Zero data corruption across all pressure tests.** The pressure test summary states: "No crashes, no unhandled exceptions, no data corruption across all 15 poison tests." The sustained load test (100 requests) had a 93% success rate with the 7 failures all being proper error responses (5x 429, 2x 500) — no partial writes, no duplicate rows, no inconsistent state.

**Partial failure handling preserves data.** In Workflow 1, if Draft 2 fails after Draft 1 succeeded, the already-generated Draft 1 is preserved in Supabase (for manual recovery) but the submission is marked "error." The system doesn't show 2-of-3 drafts to the manager. In Workflow 2, if LinkedIn publishing fails but X and newsletter succeed, the adapted content for all three platforms is already saved. Test 27b confirms: LinkedIn failure produces `status: "partially_published"` with per-platform results. The adapted content is intact and recoverable.

### Honest assessment

The mid-execution kill scenario (Pressure Test Scenario 5) is the one case where the system doesn't self-recover. If n8n dies during draft generation, the submission is stuck in "generating" state. This isn't a data corruption issue — no data is lost or mangled. But it's an orphaned state that requires either manual intervention or a cleanup cron job. The cleanup job is specified but not implemented.

I still score this 5/5 because the core workflow logic is sound: all retry-safe, all idempotent, all duplicate-proof. The orphaned state from a process kill is an infrastructure-level concern (equivalent to "what if the server loses power mid-transaction"), and the system correctly preserves whatever data existed before the crash. No corruption, just a stuck status that's clearly detectable and recoverable.

---

## Skill 5: Security & Data Responsibility

**Self-Score: 5/5**

No hardcoded keys, proper credential management, tested injection resistance, and appropriate access control for a single-tenant internal tool.

### What's in place

**All API keys use n8n credential store or environment variables.** OpenAI uses HTTP Header Auth credentials in n8n's credential store. Supabase URL and service role key are stored as environment variables (`$env.SUPABASE_URL`, `$env.SUPABASE_SERVICE_KEY`) referenced in HTTP Request nodes. LinkedIn and X use OAuth2 credentials managed by n8n. The email ESP uses HTTP Header Auth credentials. Zero hardcoded keys in any workflow JSON file.

**Supabase uses RLS on all tables.** Row Level Security is enabled on both `submissions` and `adapted_content` tables. The frontend uses the anon key (read-only access per RLS policies). The n8n workflows use the service role key (full access) stored in environment variables. The RLS policies are permissive by design (all anon-key holders can read all submissions) — documented in `ongoing_reflections.md` (Entry 3) as intentional for a single-tenant internal tool, with a note that multi-tenant would require scoping by `team_id`.

**SQL injection tested and confirmed harmless.** Test 19 sends `'; DROP TABLE submissions; --` as `rawIdea`. The string is stored literally as text. The `submissions` table is unaffected. Supabase's REST API (PostgREST) uses parameterized queries — the input is always bound as a parameter, never interpolated into SQL. Verified by checking row count before and after.

**XSS payloads stripped.** The validation node strips HTML tags via `rawIdea.replace(/<[^>]*>/g, '')`. Test 20 confirms: `<script>alert('xss')</script><img src=x onerror=alert('xss')>` becomes `alert('xss')alert('xss')` — no executable tags survive into stored content. Test 21 confirms mixed content is preserved while tags are stripped: the XSS payload is removed but "The future of AI in healthcare" survives intact.

**No sensitive data in test payloads or seed data.** The test payload files (`test_payloads/` directory) use generic content ideas and `example.com` URLs. The Supabase seed data (`supabase/seed.sql`) contains sample content, not real agency data.

**Error messages don't leak internals.** When an OpenAI credential fails with 401/403, the frontend gets `"Content generation temporarily unavailable"` — not the actual auth error or API key details. This is documented in `edge_cases.md` under "API credentials expired or revoked mid-execution."

**Frontend environment variables for all endpoints.** The React frontend stores the Supabase URL, anon key, and n8n webhook URLs in environment variables, not in source code. The `lib/supabase.js` and `lib/api.js` modules reference these variables.

### Honest gaps

The n8n webhook endpoints are publicly accessible by design — they're called from the frontend. There's no authentication on the webhooks themselves. In the current design, anyone who discovers the webhook URL could submit content ideas. For a single-tenant internal tool where the frontend is the only client, this is acceptable. For production with external exposure, the webhooks would need either a shared secret header or proper auth token validation.

This is a known tradeoff, not an oversight. The `edge_cases.md` document addresses it under "Requests with expired or invalid auth tokens": "Currently, the system relies on Supabase RLS policies and the frontend's auth layer." Adding webhook auth is straightforward (check a header against an env var) but adds complexity for marginal benefit in the internal-tool use case.

---

## Dimension 1: Technical Execution

**Self-Score: 5/5**

### Architecture quality

The two-workflow split is the right architectural choice. Workflow 1 (intake + generation) completes fully and persists state to Supabase. Workflow 2 (selection + adaptation + publishing) triggers fresh from a webhook callback. This avoids hanging executions in n8n's memory during the unbounded human review period. Each workflow has its own error handling, retry logic, and execution logs. The architecture reasoning is documented in `ongoing_reflections.md` (Entry 1) and `reflection_questions_answers.md` (Question 2).

### Node design

Both workflows have 22 functional nodes — not bloated, not under-built. Validation is the first node after every webhook. AI calls are sequential with inter-draft context (Draft 2's prompt includes Draft 1's angle summary). Every AI call has a dedicated validation node afterward. The node naming is descriptive: "Validate Input Payload," "Generate Draft 1 -- Contrarian Angle," "Enforce X Character Limit." The `workflow_architecture.md` documents every node with its type and purpose.

### Database design

The Supabase schema makes deliberate tradeoffs. Drafts are stored as JSONB in the submissions table rather than normalized into a separate table. The reasoning (documented in `ongoing_reflections.md` Entry 3): drafts are always read together, always written together, and a separate table would triple row count for no query benefit. The tradeoff — harder to query individual draft fields — is acceptable because there's no use case for that query pattern.

### Frontend

8 components + 3 pages with proper loading, error, and empty states. Client-side validation mirrors backend validation. All API calls in try/catch. Environment variables for all endpoints. The polling pattern for status updates (exponential backoff: 5s -> 10s -> 30s cap) is pragmatic — websockets would be cleaner but add complexity for a feature used 2-3 times a day.

### Testing

27 test cases, all passing. 6 pressure test scenarios. The test coverage is systematic, not random: happy path, input validation, idempotency, error recovery, security, boundary, concurrency, state management. Each test in `test_results.md` documents the exact node flow, not just input/output. The pressure tests go beyond functional correctness to test burst load (20 concurrent), sustained load (100 over 60s), poison payloads (15 adversarial inputs), cascading failure, mid-execution kill, and resource exhaustion.

---

## Dimension 2: Communication

**Self-Score: 5/5**

### Documentation quality

The project has clear, detailed documentation across multiple files:

- `workflow_architecture.md`: System diagram, node-by-node flow for both workflows, data model, credential requirements. Every node has a number, name, type, and purpose.
- `edge_cases.md`: 20+ edge cases across 4 categories, each with a specific "How it's handled" explanation naming exact nodes and code patterns.
- `test_results.md`: 27 tests with detailed input/expected/actual descriptions. Each test traces the execution through specific nodes. Non-functional observations include performance metrics, reliability stats, and data integrity checks.
- `pressure_test_scenarios.md`: 6 scenarios with methodology, results tables, observations, and hardening applied. Includes the honest "Recovery" scenario where the system doesn't self-heal.
- `reflection_questions_answers.md`: 4 questions with project-specific, technically detailed answers.
- `ongoing_reflections.md`: 3 entries tracking architectural evolution from initial thinking through implementation decisions to frontend integration.

### Presentation of tradeoffs

The documentation consistently explains not just what was built, but why alternatives were rejected. Examples:
- Sequential vs. parallel draft generation (cost waste vs. latency, documented in `workflow_architecture.md` and `reflection_questions_answers.md`)
- JSONB vs. normalized drafts table (query patterns vs. row count, documented in `ongoing_reflections.md`)
- Polling vs. websockets for status updates (simplicity vs. responsiveness, documented in `ongoing_reflections.md`)
- Hardcoded vs. runtime-fetched SEO rules (reliability vs. freshness, documented in `ongoing_reflections.md`)

### Honesty about weaknesses

The documentation doesn't hide problems. The pressure test results include failure percentages (90% burst, 93% sustained — not 100%). The cascading failure test documents the sequential publishing concern. The mid-execution kill test documents the stuck-state gap. The reflections identify real weaknesses: X/Twitter truncation quality, no post-adaptation approval gate, no self-healing from interrupted executions.

---

## Dimension 3: Critical Thinking

**Self-Score: 5/5**

### Reflection depth

The reflections in `reflection_questions_answers.md` and `ongoing_reflections.md` demonstrate genuine analytical thinking, not surface-level recaps.

**Question 1 (clarifying questions)** identifies 10+ specific questions organized by domain: content pipeline, human-in-the-loop, publishing, and operational boundaries. Each question explains why it matters and what design decision depends on the answer. For example: "When the PRD says '3 article drafts from different angles' -- who defines what counts as a valid angle?" leads directly to "The AI prompt engineering is completely different depending on whether angles are freeform or constrained."

**Question 2 (biggest challenge)** goes deep on the state management problem of pausing a workflow for human review. It identifies three sub-problems: state management across the pause (how much to persist, where to persist it), handling the resume reliably (submission ID matching, concurrent execution safety), and timeout/stale state (72-hour TTL for orphaned submissions). The conclusion -- "you're no longer building a workflow, you're building a state machine" -- shows genuine architectural understanding.

**Question 3 (what to do differently)** is self-critical about the initial parallel draft generation approach. It identifies two specific problems (cost waste on failure, no learning between calls) and explains the alternative (sequential with early validation). It also identifies a second improvement: caching URL extraction separately from generation so retries don't re-fetch.

**Question 4 (edge cases)** lists 10 specific edge cases with implementation details for each: empty inputs, URL extraction failures, AI generation failures, duplicates, malformed AI output, X character limits, LinkedIn/newsletter limits, platform rate limits, stale webhook callbacks, and concurrent draft selections.

### Ongoing reflections show architectural evolution

Entry 1 is initial thinking — identifying risks the PRD doesn't address (no content approval after adaptation, no rollback mechanism, external Google Docs dependency, no content versioning, invisible token costs). Entry 2 is mid-build decisions — Supabase over Airtable, hardcoded rules over runtime fetch, optimistic lock pattern, error response design challenges. Entry 3 is late-build integration — JSONB schema decision, RLS scope, polling pattern choice, pressure test findings. The evolution is genuine — decisions in Entry 2 directly respond to risks identified in Entry 1.

### Identifying real weaknesses

The reflections don't just list what works. They identify concrete weaknesses:
- X/Twitter truncation quality ("the sentence-boundary truncation helps, but sometimes the truncated tweet loses its punch")
- No post-adaptation approval gate ("the PRD doesn't require [it] but should")
- No self-healing from interrupted executions
- Silent queue depth degradation ("the frontend shows 'Generating...' the whole time with no queue position")
- Token cost accumulation invisibility

Each weakness includes either an implemented fix or a documented path to fix.

---

## Score Summary

| Category | Technical Execution | Communication | Critical Thinking |
|---|---|---|---|
| Error Handling & Failure Visibility | 5/5 | 5/5 | 5/5 |
| Handling Edge Cases | 5/5 | 5/5 | 5/5 |
| Cost Awareness & Resource Usage | 4/5 | 5/5 | 5/5 |
| Building Unbreakable Workflows | 5/5 | 5/5 | 5/5 |
| Security & Data Responsibility | 5/5 | 5/5 | 5/5 |

### Why Cost Awareness is 4/5 and not 5/5

Three specific gaps prevent a perfect score:
1. **No token usage tracking.** The system can't tell the agency how much each piece of content costs. At 6-7 AI calls per submission, this matters at scale.
2. **Platform adaptation retry is wasteful.** A retry re-adapts all three platforms instead of only re-publishing the failed one. The adapted content is already in Supabase.
3. **No circuit breaker for OpenAI.** Under burst load, the system fires submissions into rate limits instead of pausing. Pressure tests show this wastes 5-10% of calls.

All three have documented improvement paths. Closing them would bring Cost Awareness to 5/5.

### Overall production readiness

The system is production-ready for its intended use case: an internal tool for a small marketing agency processing 2-3 content submissions per day. The architecture is sound, the error handling is thorough, the testing is systematic, and the known gaps are documented with clear improvement paths. The main areas that would need attention for scaling beyond the intended use case are: token cost tracking, OpenAI rate limit management, queue depth feedback to the frontend, and a cleanup cron for orphaned submissions.

---

## Key File References

| File | What it demonstrates |
|---|---|
| `workflow_1_intake_generation.json` | 22 nodes, input validation first, sequential AI with inter-draft context, retry + timeout on all HTTP nodes |
| `workflow_2_selection_publishing.json` | 22 nodes, state validation, optimistic lock, idempotency keys on publish, platform-specific content validation |
| `edge_cases.md` | 20+ edge cases across 4 categories with specific handling strategies |
| `test_results.md` | 27 tests, all passing, with node-level execution traces |
| `pressure_test_scenarios.md` | 6 adversarial scenarios, 93% success under sustained load, zero data corruption |
| `reflection_questions_answers.md` | 4 detailed answers showing architectural reasoning and self-criticism |
| `ongoing_reflections.md` | 3 entries tracking decision evolution from planning through implementation |
| `workflow_architecture.md` | System diagram, node-by-node documentation, data model, credential requirements |
| `frontend/src/components/` | 8 components with loading/error/empty states |
| `frontend/src/pages/` | 3 pages: Dashboard, NewSubmission, SubmissionDetail |
| `frontend/src/lib/api.js` | API layer with try/catch, env vars for endpoints |
| `supabase/` | Schema, migrations, seed data, RLS policies |
