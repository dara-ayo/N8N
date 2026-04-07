# Pressure Test Results -- WK5 Lead Generation & Outreach Automation

**Date:** 2026-03-29
**QA Engineer:** Static Analysis & Logic Audit (QA & Edge Case Engineer)
**Workflow version:** workflow.json (78 nodes)
**Testing methodology:** Execution path tracing and resource analysis under stress conditions. Each scenario models a realistic extreme case and traces the exact workflow behavior, timing, and resource consumption.

---

## PT-001: High Volume -- 50 Leads Returned by Apify

### Scenario Setup
Apify returns exactly 50 leads (the configured maximum). All 50 are unique, have valid emails, valid websites, and valid LinkedIn URLs. This is the maximum expected throughput scenario.

### Expected Behavior
All 50 leads should be processed through the full pipeline: dedup check, Airtable insert, website verification, LinkedIn verification, about page scraping, email validation (Bouncer), and AI message generation. The persona should end in "Complete" status.

### Actual Behavior Based on Workflow Audit

**Per-lead timing estimate (serial processing, batch size = 1):**

| Step | Duration | Notes |
|---|---|---|
| Dedup Check (Airtable query) | ~0.5s | HTTP GET with filterByFormula |
| Create New Lead Record (Airtable POST) | ~0.5s | |
| Update Lead: Verifying (PATCH) | ~0.3s | |
| Website Verification (HEAD) | 0.5-10s | Depends on target server; 10s timeout cap |
| Evaluate Website Status | ~0.1s | Code node, local |
| LinkedIn Verification (GET) | 0.5-10s | Depends on LinkedIn; 10s timeout cap |
| Evaluate LinkedIn Status | ~0.1s | Code node, local |
| Update Lead: Verification Results (PATCH) | ~0.3s | |
| About Scraper: Trigger + Wait + Fetch | ~13s | 10s wait + trigger + fetch |
| Process About Text + Update Lead (PATCH) | ~0.5s | |
| Re-read Persona Status (GET) | ~0.3s | |
| Email Validation Code | ~0.1s | Code node, local |
| Update Lead: Validating Email (PATCH) | ~0.3s | |
| Call Bouncer API | 1-15s | Depends on Bouncer; 15s timeout cap |
| Process Bouncer + Update Email Status (PATCH) | ~0.5s | |
| Prepare AI + Update Generating (PATCH) | ~0.5s | |
| Generate Messages (OpenAI API) | 3-30s | Depends on load; 30s timeout cap |
| Process AI Response | ~0.1s | Code node, local |
| Update Lead: Final (PATCH) | ~0.3s | |
| Wait 1s (Rate Limit Buffer) | 1s | Fixed |

**Estimated per-lead time:** 23-83 seconds (typical: ~35 seconds)
**Estimated total for 50 leads:** 19-69 minutes (typical: ~29 minutes)

**Key concerns identified:**

1. **n8n execution timeout:** Cloud n8n instances typically have 5-10 minute execution timeouts. At ~35 seconds per lead, processing 50 leads takes approximately 29 minutes. This WILL exceed most default timeouts.
   - **Mitigation in workflow:** The Apify polling phase already consumes up to 5 minutes (EC-015). After that, 50 leads at 35s each = ~29 more minutes. Total: ~34 minutes.
   - **Self-hosted n8n:** No default timeout, but execution memory may be an issue.
   - **Cloud n8n:** The workflow will almost certainly be killed at lead ~8-14 depending on the timeout setting. The global error handler (node 77) may or may not fire.

2. **Airtable rate limit (5 req/sec):**
   - Each lead cycle makes approximately 8 Airtable API calls.
   - With 1s buffer between leads, that is ~8 requests/lead concentrated in ~3-5 seconds, then a 1s pause.
   - Peak rate during a single lead cycle: ~2-3 req/sec (sequential execution prevents true bursts).
   - **Verdict:** Unlikely to hit 5 req/sec limit with sequential processing. SAFE.

3. **What happens if workflow times out at lead #35:**
   - Leads 1-34: Fully processed, Pipeline Status = "Complete" or other terminal state.
   - Lead 35: Stuck in whatever intermediate status it was in (e.g., "Verifying", "Generating Messages").
   - Leads 36-50: Never processed. No records in Airtable for these leads.
   - Persona: Still shows "Running" (the completion update never fires).
   - Run Log: Still shows "Running" with no End Time.
   - Recovery: Manual. The `Check Duplicate Trigger` (node 10) will block re-triggering because leads 1-34 exist. Lead 35 is stuck and cannot be easily identified without querying Airtable for leads in non-terminal status.

### Risk Level: HIGH

### Mitigation
- **Already implemented:** Apify maxResults capped at 50 (prevents unbounded input). SplitInBatches with 1s buffer (rate limit prevention).
- **Recommended:**
  1. Increase n8n execution timeout to 60 minutes for this workflow (or use self-hosted n8n).
  2. Consider processing leads in smaller persona batches (e.g., maxResults = 20) to stay within timeout limits.
  3. Implement a checkpoint-based approach where the workflow can resume from the last successfully processed lead after a timeout.
  4. Add a "last processed lead index" field to the Run Log so operators know exactly where execution stopped.

---

## PT-002: Concurrent Persona Triggers

### Scenario Setup
Two personas (Persona A and Persona B) are both set to "Ready to Run" within seconds of each other. Two separate webhook calls arrive at the n8n webhook endpoint. Two independent n8n executions start concurrently.

### Expected Behavior
Both executions should run independently. Each should process its own leads without interference. Deduplication checks should catch any overlapping leads between the two personas.

### Actual Behavior Based on Workflow Audit

**Execution isolation:**
- Each execution has its own `executionId` (captured in `Set Execution Context`, node 2).
- Each execution carries its own `personaRecordId` through the pipeline.
- n8n executions run in separate memory spaces -- no shared mutable state.
- All node references use execution-scoped data (`$json`, `$('NodeName').first().json`) -- no global variables.

**SplitInBatches loop interference:**
- Each execution has its own `SplitInBatches` instance. n8n's SplitInBatches is execution-scoped.
- The `reset: false` setting in node 32 means the batch state persists within a single execution but does NOT leak across executions.
- **No interference.**

**Dedup protection across executions:**
- Both executions query the Airtable Leads table for duplicates via `Dedup Check: Search by Email` (node 33).
- If Persona A and Persona B return the same lead, whichever execution inserts the record first will cause the other execution's dedup check to find it and flag it as duplicate.
- **Race window:** There is a small window (~0.5-2 seconds) where both executions could query the Leads table simultaneously, both find "no duplicate," and both insert. This would result in a duplicate lead record. The annotations acknowledge this: "The Airtable dedup check is not atomic. This is a known Airtable limitation."

**Airtable rate limit collision:**
- Two executions running simultaneously doubles the Airtable API request rate.
- Each execution makes ~8 req/lead. Two concurrent executions: ~16 req/two-leads during overlapping processing cycles.
- With 1s buffers, peak rate could approach 4-5 req/sec.
- **Risk of 429 errors is elevated** but mitigated by n8n's retry (3 attempts, 1s between).

**API quota concerns:**
- Two concurrent Apify runs: Double the compute units. If the account quota is tight, the second run may fail with a quota error -> caught by `Handle Apify Trigger Error` (node 19) or `Evaluate Apify Status` (node 24).
- Two concurrent Bouncer streams: ~100 Bouncer calls total (50 per persona). With sequential processing per execution, this is spread over time.
- Two concurrent OpenAI streams: ~100 API calls total. gpt-4o-mini has generous rate limits. Unlikely to be an issue.

### Risk Level: MEDIUM

### Mitigation
- **Already implemented:** Execution ID correlation (node 2), dedup checks across leads table (node 33), persona-scoped processing, retry on Airtable 429s.
- **Recommended:**
  1. Add a mutex/lock mechanism: Before setting persona to "Running", check if any OTHER persona is currently "Running." If so, queue this one (set to "Queued" and re-trigger after a delay). This prevents concurrent execution entirely.
  2. Alternatively, accept the narrow duplicate window and rely on a post-run dedup cleanup job.
  3. If concurrent execution is expected to be common, increase the `Wait 1s (Rate Limit Buffer)` to 2 seconds to reduce rate limit collision risk.

---

## PT-003: All Leads Are Duplicates

### Scenario Setup
Apify returns 50 leads. All 50 already exist in the Airtable Leads table from a previous run (same emails or LinkedIn URLs). The dedup check fires 50 times in a row, each time querying Airtable.

### Expected Behavior
All 50 leads should be detected as duplicates. Each should be inserted with `Is Duplicate = true` and `Pipeline Status = "Skipped"`. No expensive API calls (Bouncer, AI) should be made. The persona should end in "Complete" status.

### Actual Behavior Based on Workflow Audit

**Dedup flow per lead (abbreviated path):**
1. `SplitInBatches` -> `Dedup Check: Search by Email` (1 Airtable GET request)
2. `Is Duplicate Lead?` -> isDuplicate = true
3. `Route: Duplicate or New` -> FALSE branch -> `Create Duplicate Lead Record` (1 Airtable POST request)
4. `Wait 1s (Rate Limit Buffer)` -> back to `SplitInBatches`

**Per duplicate lead: 2 Airtable API calls + 1s wait = ~2 seconds per lead.**
**Total for 50 duplicates: ~100 Airtable API calls over ~100 seconds (~1.7 minutes).**

**Airtable rate limit assessment:**
- 2 requests per lead cycle + 1s buffer = ~2 req/sec sustained.
- Well within the 5 req/sec limit. **SAFE.**

**Correct exit behavior:**
- After all 50 leads processed (all duplicates): `SplitInBatches` output 1 fires -> `Update Persona: Complete`.
- `Set Persona Status: Complete` (node 75): PATCH Status="Complete", Lead Count = processedCount.

**Issue identified:** The `processedCount` field from `Process and Validate Leads` (node 28) counts ALL leads that passed validation, including those that will later be found as duplicates. The Run Log will show "Leads Found: 50, Leads Processed: 50" even though none were actually processed through the pipeline. The `inBatchDuplicates` counter tracks only in-memory dedup within the batch (same email appearing twice in the Apify results), NOT Airtable-level dedup.

**Persona status update:** `Set Persona Status: Complete` sets Lead Count to `processedCount` (from node 28) which counts all validated leads, not just new ones. The persona would show "Lead Count: 50" even though all 50 are duplicates. The Run Log shows `Leads Skipped Duplicate: {inBatchDuplicates}` which only counts in-batch dedup.

### Risk Level: LOW

### Mitigation
- **Already implemented:** Fast dedup path (2 Airtable calls per lead, no expensive API calls), 1s rate limit buffer, structured logging of dedup decisions.
- **Recommended:**
  1. Add a counter for Airtable-level duplicates (incremented when `isDuplicate = true` in node 34). Update the Run Log with this count at completion.
  2. Update `processedCount` or `Lead Count` to reflect only NEW leads (not duplicates). Currently the persona shows a misleading lead count.

---

## PT-004: Complete API Failure Cascade

### Scenario Setup
Apify succeeds and returns 10 leads. The Bouncer API is completely down -- all 3 retries fail for every lead. The OpenAI API is working normally.

### Expected Behavior
All 10 leads should be inserted into Airtable. All 10 should have Email Status = "Error". AI generation should still proceed for all 10 leads. The persona should end in a status reflecting partial success.

### Actual Behavior Based on Workflow Audit

**Per-lead Bouncer failure path:**
1. `Email Validation (Bouncer)` (node 59): If email is valid format, `shouldCallBouncer = true`.
2. `Should Call Bouncer?` (node 61): TRUE -> `Call Bouncer API` (node 62).
3. Node 62: `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 1000`. All 3 attempts fail. `continueOnFail: true` -> error response passed to `Process Bouncer Response`.
4. `Process Bouncer Response` (node 63): `try/catch` catches the error. `emailStatus = 'Error'`, `bouncerRaw = JSON.stringify(response)`, log: `[timestamp] [Bouncer] service_error: {email} verification failed: {e.message}`.
5. `Update Lead: Email Status` (node 65): PATCH with Email Status = "Error".

**AI generation after Bouncer failure:**
6. `Prepare AI Generation` (node 66): `emailStatus = 'Error'` is NOT in `emailInvalidStatuses = ['Invalid', 'Disposable']`. So `emailOnlyLinkedIn = false`. Full email sequence generated.
7. `Generate Messages (OpenAI)` (node 69): Normal generation with all 3 emails + LinkedIn.
8. `Process AI Response` (node 70): `emailStatus = 'Error'` does not match any of the special status checks (Unknown, Accept-All, Role-Address, Invalid, Disposable). Falls through to: if `messageGenStatus === 'Generated'` -> `pipelineStatus = 'Complete'`.

**Bouncer retry timing per lead:** 3 attempts x 1s wait = ~3 additional seconds per lead.
**Total additional time for 10 leads:** ~30 seconds (negligible impact).

**Final state assessment:**
- All 10 leads: Pipeline Status = "Complete", Email Status = "Error", all message fields populated.
- Persona: Status = "Complete".
- Run Log: Status = "Complete".

**Issue identified:** The final Pipeline Status for leads with Email Status = "Error" is "Complete," not "Needs Review" or "Partial." This means leads with unverified emails (due to Bouncer outage) are marked as fully complete and could be used for outreach without the operator realizing the email was never verified.

### Risk Level: MEDIUM

### Mitigation
- **Already implemented:** `continueOnFail: true` on Bouncer node ensures pipeline continues. Error logging captures the failure. Bouncer raw response stored for audit.
- **Recommended:**
  1. Add `'Error'` to the status checks in `Process AI Response` (node 70) that set Pipeline Status to "Needs Review." Email Status = "Error" should trigger "Needs Review" since the email was never verified. Currently, only "Unknown" and "Accept-All" trigger this.
  2. Add a view/filter in Airtable: "Leads with Email Status = Error" for operator visibility.

---

## PT-005: Malformed Input Batch

### Scenario Setup
Apify returns 20 leads:
- **Group A (5 leads):** No email address (email field empty/null)
- **Group B (5 leads):** Malformed emails ("john@", "n/a", "", "user@domain", "test")
- **Group C (5 leads):** Injection strings in name field (`<script>alert(1)</script>`, `{{ $env.API_KEY }}`, `'; DROP TABLE;`, `$json.secret`, `\x00\x01binary`)
- **Group D (5 leads):** Clean and valid (valid email, valid website, valid LinkedIn)

### Expected Behavior
- Group A: Inserted, Bouncer skipped, AI generates LinkedIn-focused content
- Group B: Inserted with invalid email flag, Bouncer skipped, AI generates content
- Group C: Names sanitized, then processed normally
- Group D: Full pipeline processing

### Actual Behavior Based on Workflow Audit

**Group A -- No email (5 leads):**

`Process and Validate Leads` (node 28):
- `rawEmail = ''.trim()` -> empty string
- `emailValid = false`, `emailStatus = 'Skipped'`
- Lead added to `processedLeads` with `email: ''`

Per-lead pipeline:
- `Dedup Check` (node 33): `OR(LOWER({Email})=LOWER(''), LOWER({LinkedIn URL})=LOWER('...'))`. Empty email comparison is effectively ignored. LinkedIn dedup works normally.
- `Create New Lead Record` (node 37): Email field set to `''`. Email Status preset to `'Skipped'`.
- Website/LinkedIn verification proceed normally.
- `Email Validation (Bouncer)` (node 59): `!email` -> `shouldCallBouncer = false`.
- `Should Call Bouncer?` -> FALSE -> `Skip Bouncer Path`.
- `Prepare AI Generation` (node 66): `emailStatus = 'Skipped'` is NOT in `emailInvalidStatuses`. `emailOnlyLinkedIn = false`. Full content generated.
- Final status: Pipeline Status depends on other factors (about text quality, email status checks in node 70).

**Issue:** For no-email leads, `emailOnlyLinkedIn` is false because "Skipped" is not in `['Invalid', 'Disposable']`. This means the AI generates full email sequences for leads with no email address. The emails are stored but unusable. This is wasteful -- it costs an AI API call to generate emails that can never be sent.

**Group B -- Malformed emails (5 leads):**

`Process and Validate Leads` (node 28):
- `"john@"` -> regex fails -> `emailStatus = 'Skipped'`
- `"n/a"` -> in garbage list -> `emailStatus = 'Skipped'`
- `""` -> empty -> `emailStatus = 'Skipped'`
- `"user@domain"` -> regex test `^[^\s@]+@[^\s@]+\.[^\s@]+$`: "user@domain" has no dot after @ -> fails -> `emailStatus = 'Skipped'`
- `"test"` -> in garbage list -> `emailStatus = 'Skipped'`

All 5 treated identically to Group A. Bouncer skipped. Same AI generation issue.

**Group C -- Injection strings (5 leads):**

`Process and Validate Leads` (node 28) `sanitize()`:
- `<script>alert(1)</script>` -> `alert(1)` (HTML tags stripped)
- `{{ $env.API_KEY }}` -> `[removed]` (n8n expression patterns removed)
- `'; DROP TABLE;` -> unchanged (no HTML, no n8n expressions; SQL is not a risk for Airtable)
- `$json.secret` -> `[removed].secret` (n8n expression pattern removed)
- `\x00\x01binary` -> control characters stripped -> `binary`

All 5 leads inserted with sanitized names. Full pipeline proceeds normally.

**Group D -- Clean leads (5 leads):**

Full happy path. All verification, Bouncer, AI generation proceed normally.

**Final Airtable State:**

| Group | Records Created | Pipeline Status | Email Status | Messages Generated |
|---|---|---|---|---|
| A (no email) | 5 | Complete (likely) | Skipped | Yes (all 7 fields -- wasteful) |
| B (malformed) | 5 | Complete (likely) | Skipped | Yes (all 7 fields -- wasteful) |
| C (injection) | 5 | Complete | Varies | Yes (sanitized names used) |
| D (clean) | 5 | Complete | Deliverable | Yes |

### Risk Level: MEDIUM

### Mitigation
- **Already implemented:** Input sanitization (HTML, n8n expressions, control chars), email validation (regex + garbage list), Bouncer skip for invalid/missing emails.
- **Recommended:**
  1. Add `'Skipped'` to the `emailInvalidStatuses` list in `Prepare AI Generation` (node 66) so that leads with no valid email only get LinkedIn messages generated (not wasteful full email sequences).
  2. Consider setting a more specific `emailStatus` value like `"No Email"` (instead of generic "Skipped") for leads with missing email addresses, to differentiate from malformed emails.

---

## PT-006: Large About Page Text

### Scenario Setup
The Apify About scraper returns 10,000 characters of text for a lead's company about page. The AI prompt has a 128K token context window but the About text field in Airtable is Long Text (no hard limit). The question is whether the workflow truncates at the right points.

### Expected Behavior
The about text should be stored in Airtable (up to the schema-defined limit), truncated for the AI prompt (to a reasonable size), and not cause any node to fail due to oversized data.

### Actual Behavior Based on Workflow Audit

**Truncation points identified:**

1. **Process About Text (node 53):** `if (clean.length > 10000) clean = clean.substring(0, 10000)`. Text capped at 10,000 characters. This matches the schema spec 8.4 ("10,000 character limit").

2. **Update Lead: About Text (node 55):** `'Company About Text': ($json.companyAboutText || '').substring(0, 10000)`. Double-safety truncation at 10,000 chars before Airtable write.

3. **Prepare AI Generation (node 66):** `if (sanitizedAbout.length > 2000) sanitizedAbout = sanitizedAbout.substring(0, 2000)`. AI prompt limited to 2,000 characters of about text.

4. **Generate Messages (OpenAI) (node 69):** The about text is embedded in the user prompt within `<company_context>` delimiters. With 2,000 chars of context, the total prompt is well under gpt-4o-mini's context limit.

**Airtable Long Text field:** No hard character limit in Airtable's Long Text type. The 10,000 char cap is self-imposed by the workflow.

**AI prompt sizing:** 2,000 chars of about text + ~500 chars of system prompt + ~300 chars of user prompt metadata = ~2,800 chars total. At ~4 chars/token, that is ~700 tokens. gpt-4o-mini supports 128K tokens. No risk of exceeding the limit.

**Data flow:**
```
Scraper returns 10,000 chars
  -> Process About Text: truncated to 10,000 chars (no-op for exactly 10K)
  -> Airtable: stored as 10,000 chars
  -> Prepare AI: truncated to 2,000 chars for prompt
  -> OpenAI: receives 2,000 chars of context
```

### Risk Level: LOW

### Mitigation
- **Already implemented:** Triple truncation (10K at processing, 10K at Airtable write, 2K at AI prompt). All caps are explicit and documented.
- **Recommended:** No changes needed. The implementation is robust. The 2K AI prompt limit is a reasonable balance between context quality and cost (more tokens = higher API cost).

---

## PT-007: No Context Available

### Scenario Setup
A lead has no email, no website URL, and no LinkedIn URL -- a completely empty enrichment profile. Only the name and company name are available (from Apify).

### Expected Behavior
The lead should be flagged as having no contact channels. It should not go through verification, email validation, or AI generation. It should be stored in Airtable for record-keeping but clearly marked as non-actionable.

### Actual Behavior Based on Workflow Audit

**Processing in `Process and Validate Leads` (node 28):**
- `rawEmail = ''` -> `emailValid = false`, `emailStatus = 'Skipped'`
- `linkedinRaw = ''` -> `linkedinStatus = 'Missing'`
- `website = ''` -> `websiteStatus = 'Missing'`, `websiteValid = false`
- `noContact` check: `!emailValid && (linkedinStatus === 'Missing' || linkedinStatus === 'Invalid')` -> `true`
- `noContactChannels = true`

**Per-lead pipeline:**
1. `Dedup Check` (node 33): Query with `OR(LOWER({Email})=LOWER(''), LOWER({LinkedIn URL})=LOWER(''))`. Both empty. Airtable may return no results (no existing records with empty email AND empty LinkedIn). Lead passes as non-duplicate.
2. `Create New Lead Record` (node 37): Record created with Website Status = "Missing", LinkedIn Status = "Missing", Email Status = "Skipped". Pipeline Status = "Queued".
3. `Store Lead Record ID` (node 38) -> `Check No Contact Channels` (node 39): `lead.noContactChannels = true` -> `skipPipeline = true`.
4. `Has Contact Channels?` (node 40): `skipPipeline = true` -> `operation: false` check: TRUE (skipPipeline IS false?) -- Wait, let me re-check.

**Detailed IF node analysis (node 40):**
```json
"leftValue": "={{ $json.skipPipeline }}",
"rightValue": false,
"operator": { "type": "boolean", "operation": "false" }
```
This checks if `skipPipeline === false`. When `skipPipeline = true`, the condition evaluates to FALSE.
- TRUE branch (skipPipeline IS false = HAS contact channels) -> `Update Lead: Verifying` (continue pipeline)
- FALSE branch (skipPipeline IS true = NO contact channels) -> `Update Lead: No Contact`

5. `Update Lead: No Contact` (node 41): PATCH with `Pipeline Status = 'Partial'`, Error Detail = log message about no contact channels.
6. `Wait 1s (Rate Limit Buffer)` -> back to `SplitInBatches`.

**No expensive API calls made.** No website verification, no LinkedIn verification, no about scraping, no Bouncer, no OpenAI.

**Final record state:**
- Full Name: [from Apify]
- Company Name: [from Apify]
- Email: empty
- Website: empty
- LinkedIn URL: empty
- Website Status: Missing
- LinkedIn Status: Missing
- Email Status: Skipped
- Pipeline Status: Partial
- Error Detail: "[timestamp] [DataValidation] no_contact: lead {name} at {company} has no email, no website, no LinkedIn"
- All message fields: empty
- Is Duplicate: false

### Risk Level: LOW

### Mitigation
- **Already implemented:** `noContactChannels` check in node 28, routing in nodes 39-40, "No Contact" update in node 41, skip of all expensive API calls.
- **Recommended:**
  1. Consider using Pipeline Status = "Skipped" instead of "Partial" for no-contact leads. "Partial" implies some processing was done, but these leads never entered the pipeline at all. "Skipped" (currently used for duplicates) might be more semantically accurate.
  2. The `Usable` formula in the schema (`IF(AND({Email Status} = "Deliverable", {Pipeline Status} = "Complete"), TRUE(), FALSE())`) correctly evaluates to FALSE for these leads. No downstream risk.

---

## Pressure Test Summary

| Test | Risk Level | Key Finding | Action Required |
|---|---|---|---|
| PT-001 | **HIGH** | 50 leads takes ~29 minutes. Will exceed most n8n cloud timeouts (5-10 min). Leads processed before timeout are fine; remaining are lost. | Increase timeout or reduce maxResults. |
| PT-002 | **MEDIUM** | Concurrent executions are isolated but share Airtable. Narrow race window for duplicate inserts. Rate limit collision possible. | Add mutex or accept narrow race window. |
| PT-003 | **LOW** | 50 duplicates process quickly (~100s). Rate limits safe. Lead count on persona is misleading (shows all 50, not 0 new). | Fix lead count to reflect new leads only. |
| PT-004 | **MEDIUM** | Bouncer outage: pipeline continues, Email Status = "Error", but Pipeline Status = "Complete" (misleading). Emails generated for unverified leads. | Add "Error" to email status checks that trigger "Needs Review." |
| PT-005 | **MEDIUM** | No-email and malformed-email leads get full email sequences generated (wasteful). Sanitization works correctly. | Add "Skipped" to emailOnlyLinkedIn trigger. |
| PT-006 | **LOW** | Triple truncation (10K storage, 10K Airtable write, 2K AI prompt) is robust. No oversized data risk. | None. |
| PT-007 | **LOW** | No-context leads correctly flagged and skipped. No expensive API calls. Record kept for audit. | Consider "Skipped" instead of "Partial" status. |

---

## Overall Assessment

The workflow handles pressure scenarios well for its design constraints. The most significant risk is **PT-001 (execution timeout for large batches)**, which is an architectural limitation of processing leads serially in a single n8n execution. This is the primary barrier to true production use at scale.

The remaining findings (PT-003 misleading counts, PT-004 missing email error check, PT-005 wasteful AI calls) are minor logic gaps that can be addressed with small code changes to the relevant Code nodes. None of these would cause data loss, crashes, or security issues.

The workflow is well-suited for its target scale: **single-persona runs with 10-30 leads**, where total processing time stays under 15-20 minutes. For larger volumes or concurrent runs, the mitigation recommendations should be implemented.
