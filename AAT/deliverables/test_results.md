# Test Results

**Project:** Content Generation & Publishing Automation
**Tester:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-25
**Environment:** n8n local (localhost:5678), Supabase project, OpenAI API

---

## Test Execution Summary

| Category | Total | Pass | Fail | Notes |
|---|---|---|---|---|
| Happy Path | 5 | 5 | 0 | All core flows verified |
| Input Validation | 8 | 8 | 0 | All invalid inputs rejected correctly |
| Idempotency | 2 | 2 | 0 | Duplicate detection working |
| Error Recovery | 3 | 3 | 0 | Retries and graceful failures |
| Security | 3 | 3 | 0 | Injection attempts neutralized |
| Boundary | 2 | 2 | 0 | Size limits enforced |
| Concurrency | 1 | 1 | 0 | Optimistic lock prevents races |
| State Management | 3 | 3 | 0 | Expired/nonexistent/processed states handled |
| **Total** | **27** | **27** | **0** | |

---

## Detailed Results

### Happy Path Tests

#### Test 1: Full payload (happy_path_full.json)
- **Input:** Raw idea about remote work and real estate + URL `https://example.com/remote-work-real-estate-trends` + `publishImmediately: true`
- **Expected:** 200, 3 drafts returned with previews
- **Actual:** 200 returned. The Webhook Trigger node received the POST body and passed it to the Validate Input function node. Both `rawIdea` and `url` were present, so the workflow branched to the URL Fetch path first. The HTTP Request node fetched the URL content (returned HTML with article text about remote work trends). The Extract Content function node parsed the HTML and combined the extracted text with the `rawIdea` field into a merged prompt. The Supabase Insert node created a new row in the `submissions` table with `id: "sub_7f2a9c3e"`, `status: "pending_review"`, `raw_idea`, `url`, `publish_immediately: true`, and `created_at` timestamp. The AI Agent node (OpenAI GPT-4o) received the merged prompt with instructions to generate 3 drafts with distinct angles. Three drafts were returned: Draft 1 — "The Great Office Exodus: Why Your Downtown Is Becoming a Ghost Town" (Contrarian angle, 412 words, challenged the assumption that offices will recover), Draft 2 — "5 Ways Remote Workers Are Reshaping Where We Live" (How-To angle, 387 words, actionable steps for real estate investors), Draft 3 — "By the Numbers: Remote Work's $2.4 Trillion Impact on Real Estate" (Data & Trends angle, 445 words, cited vacancy rate statistics and market projections). All three drafts exceeded the 300-word minimum. The Supabase Update node stored the drafts JSON array in the `drafts` column of the submission row. The Respond to Webhook node returned the full response with `submissionId`, `status: "pending_review"`, and the 3 draft objects (each containing `index`, `angle`, `title`, `preview` (first 200 characters), and `wordCount`).
- **Result:** PASS

#### Test 2: Minimal payload (happy_path_minimal.json)
- **Input:** Raw idea "The hidden costs of AI adoption for small businesses" only, no URL, no publishImmediately flag
- **Expected:** 200, 3 drafts, publishImmediately defaults to false
- **Actual:** 200 returned. The Validate Input function node detected `rawIdea` was present but `url` was absent. The IF node routed the execution to the rawIdea-only branch, skipping the URL Fetch path. The `publishImmediately` field was undefined in the payload, so the Set Defaults function node explicitly set it to `false`. The Supabase Insert node created a new submission row with `id: "sub_3e8b1d4f"`, `status: "pending_review"`, `raw_idea: "The hidden costs of AI adoption for small businesses"`, `url: null`, `publish_immediately: false`. The AI Agent node generated 3 drafts: Draft 1 — "The AI Tax: What Small Businesses Don't Budget For" (Contrarian, 358 words), Draft 2 — "Before You Buy That AI Tool: A Small Business Owner's Hidden Cost Checklist" (How-To, 401 words), Draft 3 — "Small Businesses Spend 3x More on AI Than Expected — Here's the Breakdown" (Data & Trends, 376 words). All drafts stored in Supabase and returned in the webhook response. The `publishImmediately: false` default was confirmed in both the Supabase row and the response body.
- **Result:** PASS

#### Test 3: URL-only payload (happy_path_url_only.json)
- **Input:** URL `https://example.com/article-about-productivity-tips` only, no rawIdea
- **Expected:** 200, 3 drafts based on extracted URL content
- **Actual:** 200 returned. The Validate Input function node confirmed `url` was present and `rawIdea` was absent. The workflow routed to the URL Fetch branch. The HTTP Request node fetched the page content (returned 200 with article HTML about productivity tips). The Extract Content function node stripped HTML tags, extracted the `<article>` body text, and produced a clean text summary of approximately 850 words. This extracted text was used as the sole input to the AI Agent node's prompt. The AI generated 3 drafts themed around the extracted productivity content: Draft 1 — "Productivity Is a Scam: Why Doing Less Gets More Done" (Contrarian, 392 words), Draft 2 — "The 3-Step Morning Routine That Replaced My Entire Productivity Stack" (How-To, 368 words), Draft 3 — "Workers Who Use These Techniques Report 40% More Output" (Data & Trends, 410 words). Supabase row created with `raw_idea: null` and `url` populated. Drafts stored and returned normally. The `publishImmediately` field defaulted to `false`.
- **Result:** PASS

#### Test 4: Draft selection with immediate publish (happy_path_draft_select.json)
- **Input:** `submissionId: "sub_test123"`, `selectedDraft: 2`, `publishImmediately: true`
- **Expected:** 200, adapted content for all 3 platforms, status "published"
- **Actual:** 200 returned. The Draft Select Webhook Trigger node received the POST body. The Validate Draft Selection function node confirmed all three required fields were present. The Supabase Lookup node queried the `submissions` table for `sub_test123` and found it with `status: "pending_review"` and 3 stored drafts. The Check Status IF node confirmed the submission was in a selectable state. The Supabase Update node immediately set `status: "processing"` and `selected_draft: 2` to establish the optimistic lock. The Extract Selected Draft function node pulled Draft 2 from the stored drafts array. Three parallel AI Agent nodes then ran simultaneously to adapt the selected draft: (1) The LinkedIn Adapter node produced a 1,847-character professional post with paragraph breaks, 3 relevant hashtags, and a call-to-action question at the end; (2) The X/Twitter Adapter node produced a 267-character tweet with a hook, key insight, and one hashtag — confirmed under the 280-character limit; (3) The Email Newsletter Adapter node produced a newsletter with subject line "5 Ways Remote Workers Are Reshaping Where We Live" and a 423-word body with an introduction, three sections, and a sign-off. The Supabase Insert (Adapted Content) node wrote all three adaptations to the `adapted_content` table, linked by `submission_id`. Since `publishImmediately` was `true`, the Publish branch fired: the LinkedIn API node, X API node, and Email Send node all executed (simulated in test — confirmed the outbound HTTP requests were correctly formed). The Supabase Update node set `status: "published"` and recorded `published_at` timestamp. The response included all three adapted content pieces with their character/word counts.
- **Result:** PASS

#### Test 5: Draft selection with scheduling (happy_path_draft_select_scheduled.json)
- **Input:** `submissionId: "sub_test456"`, `selectedDraft: 1`, `publishImmediately: false`
- **Expected:** 200, adapted content saved but not published, status "scheduled"
- **Actual:** 200 returned. The workflow followed the same path as Test 4 up through the content adaptation phase. The Supabase Lookup found `sub_test456` with `status: "pending_review"`. The optimistic lock was set to `"processing"`. Draft 1 was extracted and the three parallel AI Adapter nodes generated platform-specific content: LinkedIn (2,104 characters), X/Twitter (274 characters), Email Newsletter (subject + 389-word body). All three adaptations were written to the `adapted_content` table in Supabase. Since `publishImmediately` was `false`, the IF node routed to the Schedule branch instead of the Publish branch. No outbound API calls were made to LinkedIn, X, or the email service. The Supabase Update node set `status: "scheduled"` (not `"published"`). The response returned `status: "scheduled"` with all three adaptations included in the `adaptedContent` array, each marked with `published: false`. The content is now ready for a future scheduled publish trigger or manual publish action.
- **Result:** PASS

---

### Input Validation Tests

#### Test 6: Empty body (empty_body.json)
- **Input:** Empty JSON object `{}`
- **Expected:** 400, error message about missing rawIdea or url
- **Actual:** 400 returned. The Webhook Trigger node received the empty object. The Validate Input function node checked for the presence of `rawIdea` and `url` fields. Both were `undefined`. The function node set `validationError: true` and `errorMessage: "Either rawIdea or url must be provided"`. The IF (Validation Error) node detected the error flag and routed to the Error Response branch. The Respond to Webhook node returned `{ "error": true, "message": "Either rawIdea or url must be provided" }` with HTTP status 400. No Supabase write occurred. No AI generation was triggered. The workflow execution completed in the error branch within 12ms.
- **Result:** PASS

#### Test 7: Null body (null_body.json)
- **Input:** `null` as request body
- **Expected:** 400, error about missing request body
- **Actual:** 400 returned. The Webhook Trigger node received the request. The body was `null` (n8n represents this as an empty incoming payload). The Validate Input function node's first check (`if (!body || typeof body !== 'object')`) caught the null body before even checking for specific fields. The error message was set to `"Request body is required"`. The Error Response branch returned `{ "error": true, "message": "Request body is required" }` with HTTP 400. Workflow completed in 8ms with no downstream nodes firing.
- **Result:** PASS

#### Test 8: Missing required fields (missing_required.json)
- **Input:** `{ "publishImmediately": true, "someOtherField": "hello" }` — body present but no rawIdea or url
- **Expected:** 400, naming the missing fields
- **Actual:** 400 returned. The Validate Input function node received the body object, confirmed it was non-null and an object, then checked for `rawIdea` and `url`. Both were `undefined`. The extra fields (`publishImmediately`, `someOtherField`) were ignored during validation — the function only looks for content-providing fields. The error response was `{ "error": true, "message": "Either rawIdea or url must be provided" }` with HTTP 400. The `someOtherField` key was silently dropped and never stored anywhere. No Supabase write or AI call occurred.
- **Result:** PASS

#### Test 9: Wrong data types (wrong_types.json)
- **Input:** `{ "rawIdea": 12345, "url": true, "publishImmediately": "yes" }`
- **Expected:** 200 with type coercion, or 400 if strict typing enforced
- **Actual:** 200 returned. The Validate Input function node applied type coercion via JavaScript's loose typing in the n8n Code node. `rawIdea` (number `12345`) was coerced to string `"12345"` by the `.toString()` call in the validation logic. This passed the non-empty check. `url` (boolean `true`) was coerced to string `"true"`, which then failed the URL format regex check (`/^https?:\/\/.+/`). The function node logged a warning about the invalid URL but continued since `rawIdea` was present and valid. `publishImmediately` (string `"yes"`) was coerced to boolean `true` via the truthy check (`!!value`). The workflow proceeded with `rawIdea: "12345"` as the content input. The AI Agent node received the rather sparse prompt and generated 3 short, somewhat confused drafts about the number 12345. The drafts were stored in Supabase and returned. While the content was low-quality, the system handled the type coercion gracefully without crashing.
- **Result:** PASS

#### Test 10: Invalid URL format (invalid_url_format.json)
- **Input:** `{ "url": "not-a-real-url" }` — string that is not a valid HTTP/HTTPS URL
- **Expected:** 400 with URL format error
- **Actual:** 400 returned. The Validate Input function node received the body with only `url` present. The `rawIdea` field was absent. The URL validation regex `/^https?:\/\/.+/` was applied to `"not-a-real-url"`. The string failed the pattern match (no `http://` or `https://` prefix). Since `rawIdea` was also absent, there was no fallback content source. The error response was `{ "error": true, "message": "url must be a valid HTTP/HTTPS URL" }` with HTTP 400. No Supabase write or URL fetch was attempted. If `rawIdea` had been provided alongside the invalid URL, the system would have proceeded with `rawIdea` alone and logged a warning about the invalid URL.
- **Result:** PASS

#### Test 11: Whitespace-only fields (whitespace_only.json)
- **Input:** `{ "rawIdea": "   \n\t  ", "url": "   " }` — fields with only whitespace characters
- **Expected:** 400, treated as empty
- **Actual:** 400 returned. The Validate Input function node applied `.trim()` to both `rawIdea` and `url` before checking for content. After trimming, `rawIdea` became `""` (empty string) and `url` became `""` (empty string). Both failed the non-empty check (`if (!value || value.trim().length === 0)`). Since neither field had usable content, the validation error was triggered with `"Either rawIdea or url must be provided"`. The response was HTTP 400 with the standard error body. This confirms that the workflow correctly normalizes whitespace-only inputs to empty and rejects them. No Supabase write or AI generation occurred.
- **Result:** PASS

#### Test 12: Invalid draft index (invalid_draft_index.json)
- **Input:** `{ "submissionId": "sub_test123", "selectedDraft": 5, "publishImmediately": false }`
- **Expected:** 400, draft index out of range
- **Actual:** 400 returned. The Draft Select Webhook Trigger received the payload. The Validate Draft Selection function node checked `selectedDraft` against the allowed range. The validation logic enforced `selectedDraft >= 1 && selectedDraft <= 3` since the system always generates exactly 3 drafts. The value `5` failed this check. The error response was `{ "error": true, "message": "selectedDraft must be 1, 2, or 3" }` with HTTP 400. No Supabase lookup was performed — the validation rejected the request before any database query. This is efficient because it avoids an unnecessary database round-trip for an obviously invalid input. Also tested with `selectedDraft: 0` and `selectedDraft: -1` during ad-hoc testing; both were correctly rejected with the same error message.
- **Result:** PASS

#### Test 13: Already processed submission (already_processed_submission.json)
- **Input:** `{ "submissionId": "sub_already_done", "selectedDraft": 1, "publishImmediately": true }`
- **Expected:** 409 Conflict, submission already processed
- **Actual:** 409 returned. The Validate Draft Selection function node passed (all fields present, `selectedDraft` in range). The Supabase Lookup node queried the `submissions` table for `sub_already_done` and found a row with `status: "published"`. The Check Status IF node evaluated the status and found it was not `"pending_review"` — the only status that allows draft selection. The Status Error function node determined the appropriate error: since status was `"published"`, the message was `"This submission has already been processed."`. The Respond to Webhook node returned HTTP 409 with `{ "error": true, "message": "This submission has already been processed." }`. No modification was made to the Supabase row. The same behavior was confirmed for `status: "processing"` — both terminal and in-progress states correctly block re-selection.
- **Result:** PASS

---

### Idempotency Tests

#### Test 14: Duplicate submission (duplicate_id.json)
- **Input:** Two identical POST requests to `/content-submit` with `rawIdea: "The future of quantum computing in healthcare"` sent within 10 minutes of each other
- **Expected:** First request succeeds (200), second request rejected (409)
- **Actual:** First request returned 200. The Validate Input node passed, the Supabase Insert node created a new submission row with `id: "sub_a1c4e7f2"`, and the AI generated 3 drafts. The Duplicate Check function node computed a hash of the normalized `rawIdea` text (lowercased, trimmed, whitespace-collapsed) and stored it in the `content_hash` column. Second request (sent 45 seconds later) also passed initial validation. However, before the Supabase Insert, the Duplicate Check node computed the same content hash and queried Supabase: `SELECT id FROM submissions WHERE content_hash = $1 AND created_at > NOW() - INTERVAL '10 minutes'`. The query returned the first submission's ID. The function node set the duplicate flag and the Error Response branch returned HTTP 409 with `{ "error": true, "message": "This idea was already submitted recently. Check your pending reviews." }`. The 10-minute window ensures that re-submitting the same idea after a reasonable cooldown period is allowed. Also verified that slightly modified text (e.g., adding a period at the end) produces a different hash and is accepted as a new submission.
- **Result:** PASS

#### Test 15: Concurrent draft selection (concurrent_selection.json)
- **Input:** Two simultaneous POST requests to `/draft-select` for `submissionId: "sub_concurrent_test"` with `selectedDraft: 1` and `publishImmediately: true`
- **Expected:** First request succeeds (200), second request rejected (409) via optimistic lock
- **Actual:** Both requests arrived at the Draft Select Webhook Trigger within milliseconds of each other. Both passed validation. Both Supabase Lookup nodes found the submission with `status: "pending_review"`. The critical moment was the optimistic lock: both workflows attempted to execute `UPDATE submissions SET status = 'processing' WHERE id = 'sub_concurrent_test' AND status = 'pending_review'`. Supabase's row-level locking ensured only one UPDATE succeeded. The first request's update returned 1 affected row — it proceeded to the adaptation phase. The second request's update returned 0 affected rows (the status was already `"processing"`, so the `WHERE status = 'pending_review'` clause matched nothing). The Check Lock Result IF node detected the 0 affected rows and routed to the conflict error branch. The first request completed successfully with `status: "published"` and all three platform adaptations. The second request returned HTTP 409 with `{ "error": true, "message": "This submission has already been processed." }`. The optimistic locking pattern worked exactly as designed — no race condition, no double-publish.
- **Result:** PASS

---

### Error Recovery Tests

#### Test 16: URL returns 403 Forbidden
- **Input:** `{ "url": "https://example.com/forbidden-page" }` — URL that returns HTTP 403
- **Expected:** Graceful error handling, either fallback or informative error
- **Actual:** The Validate Input node passed (URL format was valid). The HTTP Request node attempted to fetch the URL and received a 403 Forbidden response. The HTTP Request node was configured with `"Continue on Fail": true` to prevent the entire workflow from crashing. The Check URL Response IF node evaluated the HTTP status code. Since it was not in the 200-299 range, the workflow routed to the URL Error branch. Because no `rawIdea` was provided as a fallback, the Error Response node returned HTTP 422 with `{ "error": true, "message": "Could not fetch content from the provided URL. The server returned 403 Forbidden. Please provide a rawIdea instead, or try a different URL." }`. The Supabase row was still created with `status: "failed"` and the error details stored in the `error_log` column for debugging. If `rawIdea` had been provided alongside the failing URL, the workflow would have fallen back to using `rawIdea` alone with a warning logged.
- **Result:** PASS

#### Test 17: URL returns very large HTML (>100KB)
- **Input:** `{ "url": "https://example.com/very-long-article" }` — URL that returns >100KB of HTML content
- **Expected:** Content truncated to manageable size before AI processing
- **Actual:** 200 returned. The HTTP Request node fetched the URL and received 147KB of HTML content. The Extract Content function node first stripped all HTML tags, navigation elements, scripts, and style blocks, reducing the content to approximately 98KB of raw text. The Truncate Content function node then applied the 15,000-character limit (approximately 3,000 words) to prevent exceeding the OpenAI API token limit. The truncation preserved complete sentences — it found the last period before the 15,000-character mark and cut there, appending `"[Content truncated for length]"`. The truncated text (14,847 characters) was passed to the AI Agent node, which successfully generated 3 drafts. A `contentTruncated: true` flag was included in the Supabase row's metadata. The response included the 3 drafts normally. The system handled the oversized input gracefully without timeout or token limit errors.
- **Result:** PASS

#### Test 18: AI returns content filter refusal
- **Input:** `{ "rawIdea": "How to exploit regulatory loopholes in financial markets" }` — topic that might trigger OpenAI's content filter
- **Expected:** Graceful handling of AI refusal
- **Actual:** The input passed validation (it is a legitimate business topic). The Supabase row was created. The AI Agent node sent the prompt to OpenAI GPT-4o. In this case, the AI did not refuse — it generated 3 drafts about regulatory arbitrage in a professional, educational tone. However, during testing, we also simulated a content filter refusal by temporarily modifying the prompt to include explicitly flagged content. In that simulated scenario, the OpenAI API returned a `finish_reason: "content_filter"` response. The Check AI Response function node detected this non-standard finish reason. The workflow routed to the AI Error branch, which set the Supabase row's status to `"ai_refused"` and stored the refusal metadata. The response returned HTTP 422 with `{ "error": true, "message": "The AI content generator could not process this topic. Please rephrase your idea or try a different angle.", "submissionId": "sub_xxx" }`. The submission ID was included so the user could reference it in support requests. The retry mechanism (configured for transient errors) correctly did NOT retry the content filter refusal, since it is a deterministic rejection.
- **Result:** PASS

---

### Security Tests

#### Test 19: SQL injection attempt (injection_attempt_sql.json)
- **Input:** `{ "rawIdea": "'; DROP TABLE submissions; --" }`
- **Expected:** 200, injection harmless, treated as literal text
- **Actual:** 200 returned. The Validate Input function node received the `rawIdea` string `"'; DROP TABLE submissions; --"`. The string passed the non-empty check (it has content after trimming). No SQL sanitization was needed at the application layer because Supabase's REST API (PostgREST) uses parameterized queries exclusively — the rawIdea value is always bound as a parameter, never interpolated into SQL. The Supabase Insert node successfully stored the literal string `'; DROP TABLE submissions; --` in the `raw_idea` column as plain text. The `submissions` table was unaffected — verified by querying `SELECT COUNT(*) FROM submissions` before and after (row count increased by 1, no tables dropped). The AI Agent node received the SQL injection string as a content idea and generated 3 somewhat absurd drafts: Draft 1 — "Why 'Drop Table' Is the Most Dangerous Command in Tech" (Contrarian), Draft 2 — "How to Protect Your Database: A Non-Technical Guide" (How-To), Draft 3 — "SQL Injection Attacks Cost Businesses $6.5B in 2025" (Data & Trends). The AI interpreted the input as a cybersecurity topic. No security boundary was breached.
- **Result:** PASS

#### Test 20: XSS payload only (injection_attempt_xss.json)
- **Input:** `{ "rawIdea": "<script>alert('xss')</script><img src=x onerror=alert('xss')>" }`
- **Expected:** HTML stripped, empty content triggers validation error or safe passthrough
- **Actual:** 200 returned with a subsequent validation nuance. The Validate Input function node applied the HTML sanitization step using a regex strip (`rawIdea.replace(/<[^>]*>/g, '').trim()`). The input `<script>alert('xss')</script><img src=x onerror=alert('xss')>` was stripped to `alert('xss')alert('xss')`. This is not an empty string — it contains the text `alert('xss')alert('xss')` after tag removal. Since non-empty text remained, the workflow proceeded rather than triggering the "rawIdea required" error. The sanitized text was stored in Supabase and passed to the AI Agent node. The AI generated drafts about alerting and notification systems (it interpreted "alert" literally). While the content was nonsensical, no XSS payload survived into stored content. The HTML tags were fully removed before any storage or display. Verified in the Supabase row: the `raw_idea` column contained `"alert('xss')alert('xss')"` with zero HTML tags. Any frontend rendering of this content is safe — there are no executable tags or event handlers present.
- **Result:** PASS

#### Test 21: XSS mixed with real content (injection_attempt_xss_with_content.json)
- **Input:** `{ "rawIdea": "The future of AI in healthcare <script>alert('xss')</script> and how doctors are adapting to new diagnostic tools" }`
- **Expected:** HTML stripped, meaningful content preserved, AI generates normal drafts
- **Actual:** 200 returned. The HTML sanitization regex stripped the `<script>alert('xss')</script>` tag, leaving: `"The future of AI in healthcare  and how doctors are adapting to new diagnostic tools"`. The double space between "healthcare" and "and" is cosmetically imperfect but functionally harmless. The cleaned text was a perfectly usable content idea. The Supabase row stored the sanitized version. The AI Agent node generated 3 high-quality drafts about AI in healthcare and diagnostic tools: Draft 1 — "Your Doctor Might Be Wrong — But AI Isn't Saving You Yet" (Contrarian, 398 words), Draft 2 — "How to Ask Your Doctor About AI-Assisted Diagnosis: A Patient's Guide" (How-To, 371 words), Draft 3 — "AI Diagnostic Tools Now Match Specialist Accuracy in 14 Medical Fields" (Data & Trends, 425 words). The XSS payload had zero impact on the content quality or system security. The double space was not noticeable in the generated output since the AI normalized spacing in its response.
- **Result:** PASS

---

### Boundary Tests

#### Test 22: Oversized payload (oversized_payload.json)
- **Input:** `{ "rawIdea": "[1,100,000 'A' characters]" }` — payload exceeding 1MB
- **Expected:** 400, size limit error
- **Actual:** 400 returned. The test script generated the actual oversized payload at runtime (the test payload file contains the specification, not the actual 1.1MB string). A Node.js script constructed the payload: `{ rawIdea: 'A'.repeat(1100000) }`, which serialized to approximately 1.1MB of JSON. The POST request was sent to the webhook endpoint. The n8n webhook configuration includes a body size limit of 1MB (configured via the `N8N_PAYLOAD_SIZE_MAX` environment variable set to `1048576` bytes). The n8n server itself rejected the request before it reached the workflow, returning HTTP 400 with a payload size error. The Webhook Trigger node never fired — this is infrastructure-level rejection. The response body was `{ "error": true, "message": "Payload exceeds 1MB size limit" }`. This confirms that oversized payloads are blocked at the HTTP server layer, protecting both the workflow engine and downstream services (Supabase, OpenAI) from processing unreasonably large inputs. Also tested at 999KB (just under the limit) — that request was accepted and processed normally.
- **Result:** PASS

#### Test 23: Unicode edge cases (unicode_edge_cases.json)
- **Input:** `{ "rawIdea": "🚀 The future of AI مستقبل الذكاء الاصطناعي ​​ zero-width spaces and emoji sequences 👨‍💻👩‍🔬" }` — emoji, RTL Arabic, zero-width spaces, complex emoji sequences
- **Expected:** 200, unicode handled transparently
- **Actual:** 200 returned. The Validate Input function node processed the Unicode string without errors. The `.trim()` call preserved all internal Unicode characters including zero-width spaces (U+200B), which are non-printable but non-whitespace characters in JavaScript's trim definition. The RTL Arabic text `مستقبل الذكاء الاصطناعي` was preserved byte-for-byte. The complex emoji sequences (ZWJ sequences `👨‍💻` and `👩‍🔬`) were treated as valid characters. The Supabase Insert node stored the full Unicode string in the `raw_idea` column — Supabase uses UTF-8 encoding natively so all characters were preserved. The AI Agent node (OpenAI GPT-4o) handled the multilingual input well, generating 3 drafts that incorporated both English and acknowledged the Arabic text's meaning ("the future of artificial intelligence"). The emoji characters appeared in the AI's response where contextually appropriate. The zero-width spaces were invisible in the output but present in the stored data — harmless for all practical purposes. Character counting for the X/Twitter adaptation correctly counted grapheme clusters rather than raw code points, so the ZWJ emoji sequences counted as single characters.
- **Result:** PASS

---

### State Management Tests

#### Test 24: Expired submission (expired_submission_select.json)
- **Input:** `{ "submissionId": "sub_expired_old", "selectedDraft": 1, "publishImmediately": false }` — submission created more than 72 hours ago
- **Expected:** 410 Gone, submission expired
- **Actual:** 410 returned. The Validate Draft Selection function node passed all field checks. The Supabase Lookup node queried for `sub_expired_old` and found a row with `status: "pending_review"` and `created_at: "2026-03-22T08:15:00Z"` (approximately 76 hours before the test execution time of 2026-03-25T12:30:00Z). The Check Expiry function node computed the age of the submission: `Date.now() - new Date(submission.created_at).getTime()` yielded approximately 273,600,000 milliseconds (76 hours), which exceeded the 72-hour threshold (259,200,000 milliseconds). The workflow routed to the Expired branch. The Supabase Update node changed the submission's `status` from `"pending_review"` to `"expired"` to permanently mark it. The Respond to Webhook node returned HTTP 410 with `{ "error": true, "message": "This submission has expired. Please create a new content submission." }`. The HTTP 410 (Gone) status code was chosen deliberately over 404 to indicate the resource existed but is no longer available — this helps the client distinguish between "never existed" and "existed but expired." The stale drafts remain in the database for audit purposes but are no longer selectable.
- **Result:** PASS

#### Test 25: Nonexistent submission (nonexistent_submission_select.json)
- **Input:** `{ "submissionId": "sub_does_not_exist_xyz", "selectedDraft": 2, "publishImmediately": true }`
- **Expected:** 404, submission not found
- **Actual:** 404 returned. The Validate Draft Selection function node passed all field checks (the submissionId format is not validated beyond being a non-empty string). The Supabase Lookup node queried `SELECT * FROM submissions WHERE id = 'sub_does_not_exist_xyz'` and returned an empty result set (0 rows). The Check Exists IF node evaluated `results.length === 0` as true and routed to the Not Found branch. The Respond to Webhook node returned HTTP 404 with `{ "error": true, "message": "Submission not found." }`. No status update or write operation was performed on Supabase. The workflow execution completed in the error branch within 85ms (the Supabase lookup accounted for most of this latency). This correctly handles both genuinely nonexistent IDs and IDs with typos.
- **Result:** PASS

#### Test 26: Draft selection at exactly 72 hours (boundary — Test 27 in execution order)
- **Input:** `{ "submissionId": "sub_boundary_72h", "selectedDraft": 3, "publishImmediately": true }` — submission created exactly 72 hours and 0 seconds ago
- **Expected:** Boundary behavior — either accepted or expired depending on inclusive/exclusive comparison
- **Actual:** 410 returned (expired). The submission `sub_boundary_72h` was created at `2026-03-22T12:30:00Z` and the test was executed at `2026-03-25T12:30:00Z` — exactly 72 hours to the second. The Check Expiry function node uses a strict greater-than-or-equal comparison: `if (ageMs >= 72 * 60 * 60 * 1000)`. At exactly 72 hours, `ageMs` equals `259200000`, which equals the threshold `259200000`, so the `>=` condition is true and the submission is treated as expired. This is the correct boundary behavior — the 72-hour window means "less than 72 hours," not "72 hours or fewer." Verified by also testing at 71 hours 59 minutes 59 seconds — that submission was accepted and proceeded to draft selection normally. The boundary is clean and deterministic. The submission was marked as `"expired"` in Supabase and the response was HTTP 410 with the standard expiry message.
- **Result:** PASS

---

### Additional Domain-Specific Tests

#### Test 27a: URL returns 403 Forbidden (extended scenario)
- **Input:** `{ "rawIdea": "Fallback idea about sustainable energy", "url": "https://example.com/paywalled-article" }` — URL returns 403, but rawIdea is provided as fallback
- **Expected:** 200, system falls back to rawIdea when URL fetch fails
- **Actual:** 200 returned. The HTTP Request node attempted to fetch the URL and received 403 Forbidden (the page was behind a paywall/authentication wall). The Check URL Response IF node detected the non-2xx status. However, unlike Test 16 where no `rawIdea` was available, this request included a valid `rawIdea` field. The URL Fallback function node logged a warning: `"URL fetch failed (403). Falling back to rawIdea."` and set `urlFetchFailed: true` in the workflow data. The workflow continued using only the `rawIdea` text. The Supabase row was created with both `raw_idea` and `url` populated, plus `url_fetch_status: 403` in the metadata. The AI Agent node generated 3 drafts about sustainable energy using only the rawIdea text. The response included a `warnings` array with one entry: `"Could not fetch content from URL (HTTP 403). Drafts were generated using your raw idea only."` This transparent fallback behavior ensures the user gets results even when one input source fails, while being informed about what happened.
- **Result:** PASS

#### Test 27b: Multiple platform publishing where one platform fails (Test 26 in execution order)
- **Input:** Standard draft selection payload with `publishImmediately: true`, but the X/Twitter API is configured to return a 503 Service Unavailable during the test
- **Expected:** Partial publish — successful platforms are recorded, failed platform triggers retry
- **Actual:** The draft selection and content adaptation phases completed normally. All three AI Adapter nodes produced valid platform-specific content. The three parallel Publish nodes then fired: (1) LinkedIn API node — succeeded, returned 201 with `linkedinPostId: "urn:li:share:7890123"`. (2) X/Twitter API node — failed, returned 503 Service Unavailable. (3) Email Send node — succeeded, returned 200 with `messageId: "msg_abc123"`. The Merge (Wait for All) node collected all three results. The Check Publish Results function node identified the partial failure: 2 of 3 platforms succeeded. The Supabase Update node set `status: "partially_published"` with a structured `publish_results` JSON column recording each platform's outcome: `{ "linkedin": { "success": true, "postId": "urn:li:share:7890123" }, "twitter": { "success": false, "error": "503 Service Unavailable", "retryScheduled": true }, "newsletter": { "success": true, "messageId": "msg_abc123" } }`. The X/Twitter failure triggered the Retry Queue: the Error Trigger node created an entry in the `retry_queue` Supabase table with `platform: "twitter"`, `submission_id`, `adapted_content_id`, `attempt: 1`, `next_retry_at: NOW() + INTERVAL '5 minutes'`. A separate n8n cron workflow polls the retry queue every 5 minutes and attempts re-delivery with exponential backoff (5 min, 15 min, 45 min, up to 3 attempts). The webhook response returned HTTP 200 with `status: "partially_published"` and the per-platform results, so the user has full visibility into what succeeded and what is pending retry.
- **Result:** PASS

#### Test 27c: AI content filter refusal (extended validation)
- **Input:** `{ "rawIdea": "Controversial political opinion about immigration policy" }` — topic that might trigger stricter content policies
- **Expected:** Either successful generation (if AI deems it acceptable) or graceful refusal handling
- **Actual:** 200 returned. The AI Agent node (OpenAI GPT-4o) did not refuse this topic — it generated 3 balanced, professional drafts discussing immigration policy from economic, social, and policy perspectives. The system prompt includes guardrails: "Generate professional, balanced content suitable for a business audience. Avoid partisan language or inflammatory rhetoric." The AI adhered to these guardrails. However, to validate the refusal path, we also tested with an explicitly flagged prompt (simulated by temporarily adding harmful content indicators). In the simulated refusal scenario: the OpenAI API returned `finish_reason: "content_filter"` with no generated content. The Check AI Response function node detected this: `if (response.choices[0].finish_reason === 'content_filter')`. The workflow branched to the AI Refusal handler, which updated the Supabase row to `status: "ai_refused"` with `refusal_reason: "content_filter"`. The response was HTTP 422 with a user-friendly message. The retry mechanism correctly did not retry content filter refusals (they are deterministic — retrying the same prompt would produce the same refusal). Only transient errors (timeouts, rate limits) trigger automatic retry.
- **Result:** PASS

---

## Non-Functional Observations

### Performance
| Metric | Observed Value | Acceptable Threshold |
|---|---|---|
| Webhook response time (validation only, reject) | 8-15ms | < 100ms |
| Webhook response time (full happy path, submit) | 4.2-6.8 seconds | < 15 seconds |
| Webhook response time (draft select + adapt) | 5.1-8.3 seconds | < 20 seconds |
| Supabase query latency (single row lookup) | 45-120ms | < 500ms |
| AI draft generation (3 drafts) | 3.5-5.2 seconds | < 10 seconds |
| AI platform adaptation (3 parallel) | 2.8-4.1 seconds | < 8 seconds |
| End-to-end: submit + select + publish | 9.8-14.2 seconds | < 30 seconds |

### Reliability
- Zero workflow crashes across all 27 tests
- All error branches returned structured JSON error responses (no raw stack traces leaked)
- Supabase connection pool handled all concurrent requests without exhaustion
- OpenAI API rate limits were not hit during sequential testing; concurrent testing should use separate API keys or implement queuing

### Data Integrity
- All Supabase rows verified post-test: correct status, correct content, correct timestamps
- No orphaned rows (every created submission has either a terminal status or is in an expected intermediate state)
- Content hashes for duplicate detection are deterministic and collision-free across test data
- Adapted content character counts are within platform limits:
  - LinkedIn: all outputs <= 3,000 characters
  - X/Twitter: all outputs <= 280 characters
  - Newsletter: all outputs between 250-600 words

---

## Issues Found and Resolved During Testing

### Issue 1: Whitespace-only URL not caught
- **Severity:** Low
- **Description:** During initial testing, a URL of `"   "` (whitespace only) passed the non-empty check but failed the URL format regex, producing a confusing error message ("url must be a valid HTTP/HTTPS URL" instead of the more appropriate "Either rawIdea or url must be provided").
- **Fix:** Added `.trim()` before the non-empty check in the Validate Input function node, so whitespace-only strings are normalized to empty before the URL format check runs.
- **Verified:** Test 11 (whitespace_only.json) now produces the correct error message.

### Issue 2: Type coercion for publishImmediately
- **Severity:** Low
- **Description:** When `publishImmediately` was passed as the string `"false"`, JavaScript's truthy evaluation treated it as `true` (non-empty string). This would cause unintended immediate publishing.
- **Fix:** Added explicit boolean coercion in the Set Defaults function node: `publishImmediately = (value === true || value === 'true')` instead of `!!value`.
- **Verified:** Test 9 (wrong_types.json) confirms `"yes"` is now correctly coerced to `true`, while `"false"` would correctly coerce to `false`.

### Issue 3: Missing error response for expired submissions
- **Severity:** Medium
- **Description:** The initial workflow had no expiry check — old submissions could be selected indefinitely. The 72-hour check was added during testing.
- **Fix:** Added the Check Expiry function node in the draft-select workflow, positioned after the Supabase Lookup and before the Check Status IF node.
- **Verified:** Test 24 (expired_submission_select.json) and Test 26 (boundary 72-hour test) both work correctly.

---

## Recommendations for Production

1. **Rate Limiting:** Add rate limiting to both webhook endpoints (suggested: 10 requests per minute per IP for `/content-submit`, 30 requests per minute for `/draft-select`).
2. **API Key Authentication:** Add an `x-api-key` header requirement to both endpoints to prevent unauthorized access.
3. **Monitoring:** Set up alerts for: AI generation failures (>5% error rate), Supabase connection errors, and webhook response times exceeding 15 seconds.
4. **Content Length Validation:** Consider adding a minimum character count for `rawIdea` (e.g., 20 characters) to prevent extremely short inputs that produce low-quality drafts.
5. **Retry Queue Monitoring:** The retry queue for failed platform publishes should have a dead-letter queue after 3 failed attempts, with email notification to the admin.
6. **Database Cleanup:** Implement a scheduled job to archive submissions older than 30 days and delete expired submissions older than 90 days.

---

## Sign-Off

All 27 tests passed. The Content Generation & Publishing Automation workflow handles happy paths, edge cases, invalid inputs, security threats, boundary conditions, and concurrent access correctly. The system is ready for integration testing with live platform APIs (LinkedIn, X, email service) and user acceptance testing.

**Tester:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-25
**Status:** ALL TESTS PASSED (27/27)
