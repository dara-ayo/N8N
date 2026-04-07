# Workflow Annotations -- WK5 Lead Generation & Outreach Automation

**Workflow Name:** WK5 -- Lead Generation & Outreach Automation
**Total Nodes:** 78
**Author:** Ayodele Oluwafimidaraayo
**Last Updated:** 2026-03-29

---

## Architecture Overview

The workflow follows a linear pipeline with conditional branches, processing one lead at a time via `SplitInBatches`. The overall flow is:

```
Webhook Trigger
  -> Persona Validation (exists? still ready? fields valid? already processed?)
  -> Set Running + Create Run Log
  -> Apify Lead Scraper (trigger + poll loop)
  -> Fetch + Process Results
  -> SplitInBatches (1 lead at a time)
    -> Dedup Check -> Create Record
    -> Website Verification -> LinkedIn Verification
    -> About Page Scraping
    -> Pre-AI persona status check
    -> Email Validation (Bouncer)
    -> AI Message Generation (OpenAI)
    -> Final Status Update
  -> Persona Complete + Run Log Complete
  -> Global Error Handler (separate trigger)
```

Every HTTP Request node that calls an external API uses `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 1000` (ms). The retry is linear in n8n; for production, exponential backoff would be preferred (documented inline). Credentials are referenced by n8n credential IDs and never stored as plaintext in node parameters.

---

## Node-by-Node Documentation

### Section 1: Trigger and Persona Validation

---

#### 1. Webhook Trigger
- **Type:** `n8n-nodes-base.webhook`
- **Purpose:** Entry point for the entire pipeline. Receives a POST request from an Airtable automation that fires when a Target Persona record's Status is changed to "Ready to Run."
- **Key Configuration:** Path = `wk5-lead-gen`, HTTP Method = POST, Response Mode = `onReceived` (returns 200 immediately so Airtable doesn't timeout).
- **Placement Reasoning:** Must be the first node. Airtable's scripting automation sends a POST with the record ID to this webhook URL.
- **Failure Considerations:** If the webhook URL is unreachable, the Airtable automation will show an error on its side. The n8n workflow won't fire at all -- this is outside our control.
- **Edge Cases Addressed:** Beginning of EC-007 handling (we don't trust the trigger payload, we re-read the record).

---

#### 2. Set Execution Context
- **Type:** `n8n-nodes-base.set`
- **Purpose:** Extracts the persona record ID from the webhook payload and initializes execution-level counters (leads processed, skipped, errored).
- **Key Configuration:** Captures `record_id` (or `recordId`) from the request body, captures the n8n execution ID, and records the start timestamp.
- **Placement Reasoning:** Immediately after trigger so all downstream nodes have access to the persona ID and execution context.
- **Failure Considerations:** If the webhook payload doesn't include a record ID, `personaRecordId` will be empty and the next Airtable read will fail -- caught by the error handler.
- **Edge Cases Addressed:** EC-041 (concurrent execution isolation via execution ID as correlation key).

---

#### 3. Read Persona Record
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Re-reads the full persona record from Airtable's REST API. This is critical -- we never trust the trigger payload data alone.
- **Key Configuration:** GET request to `api.airtable.com/v0/{baseId}/Target Personas/{recordId}`. Timeout: 15 seconds. Full response mode to capture HTTP status code. Retry: 3 attempts.
- **Placement Reasoning:** Must happen before any validation or processing. We need the authoritative current state of the record.
- **Failure Considerations:** Network timeout (EC-004) handled by retry + 15s timeout. If all retries fail, the global error handler catches it. If the record was deleted (404), the next node detects this.
- **Edge Cases Addressed:** EC-004 (timeout on read), EC-005 (record deleted), EC-007 (stale trigger data).

**Why HTTP Request instead of Airtable node:** Per MEMORY.md, the native Airtable node may return empty output on zero results and has unpredictable behavior. HTTP Request nodes give us explicit status codes and full control over error handling.

---

#### 4. Check Persona Exists & Still Ready
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Two-condition gate: (1) HTTP status is 200 (record exists), (2) Status field equals "Ready to Run" (record hasn't been modified).
- **Key Configuration:** AND condition -- both must be true. Case-insensitive string comparison for status.
- **Placement Reasoning:** First decision point. If either condition fails, we abort immediately without calling any external APIs (saves money).
- **Failure Considerations:** False branch goes to the logging node. True branch continues to field extraction.
- **Edge Cases Addressed:** EC-005 (record deleted -- 404 fails condition 1), EC-006 (status changed), EC-007 (stale trigger -- status no longer "Ready to Run").

---

#### 5. Log Stale or Missing Persona
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Generates a structured error log message explaining why the persona was skipped (either deleted or status changed).
- **Key Configuration:** Checks the HTTP status code to differentiate between deletion (404) and stale data (status != Ready to Run). Outputs a log message following the format from edge_case_spec Appendix B.
- **Placement Reasoning:** Terminal node on the abort path. After this, the execution ends.
- **Edge Cases Addressed:** EC-005, EC-007 (logging).

---

#### 6. Extract Persona Fields
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Extracts and trims all persona fields (Job Title, Location, Company Size, Keywords) from the Airtable response. Creates a clean, predictable data structure for downstream nodes.
- **Key Configuration:** Trims whitespace from all string fields. Carries forward the persona record ID and execution context.
- **Placement Reasoning:** After confirming the record exists and is ready, before validation.
- **Edge Cases Addressed:** Part of EC-001 (trimming catches whitespace-only values).

---

#### 7. Validate Persona Inputs
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Validates that all required persona fields are present and valid. Checks: Job Title (non-empty after trim), Location (non-empty after trim), Company Size (must be one of the 5 valid options from the schema).
- **Key Configuration:** Returns an `isValid` boolean and a `missingFields` array. If invalid, generates a structured error message with the exact list of missing fields.
- **Placement Reasoning:** Must happen before any external API call. Invalid personas should not waste Apify credits.
- **Failure Considerations:** Keywords are optional and not validated (per schema spec 8.1).
- **Edge Cases Addressed:** EC-001 (missing required persona fields).

---

#### 8. Is Persona Valid?
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Routes based on validation result. True = continue to duplicate check. False = set persona status to Input Error.
- **Edge Cases Addressed:** EC-001 routing.

---

#### 9. Set Persona Status: Input Error
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH request to set the persona's Status to "Input Error" and write the specific missing fields to Error Notes.
- **Key Configuration:** Writes the structured error message from the validation node. Retry 3x.
- **Placement Reasoning:** Terminal node on the invalid-persona path.
- **Edge Cases Addressed:** EC-001 (final handling).

---

### Section 2: Duplicate Trigger Detection

---

#### 10. Check Duplicate Trigger
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Queries the Leads table for any records linked to this persona. If leads already exist, this might be a duplicate trigger fire.
- **Key Configuration:** Uses `filterByFormula` with `FIND` to match the persona record ID in the Source Persona linked field. Limited to 1 record (we only need to know if any exist).
- **Placement Reasoning:** After validation, before setting Running status. This prevents double-processing.
- **Edge Cases Addressed:** EC-002 (duplicate trigger fire).

---

#### 11. Evaluate Duplicate Trigger
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Evaluates whether existing leads are in terminal states (Complete, Partial, Error, Skipped, Needs Review). If yes, the persona was already processed. If leads exist in non-terminal states, another execution may be running concurrently.
- **Key Configuration:** Checks against a list of terminal states. Both cases result in skipping the run.
- **Edge Cases Addressed:** EC-002.

---

#### 12-13. Is Duplicate Trigger? / Set Persona Status: Already Processed
- **Purpose:** Routes based on duplicate check result. If duplicate, sets persona status and logs, then stops. If not duplicate, continues to Running state.
- **Edge Cases Addressed:** EC-002.

---

### Section 3: Pipeline Initialization

---

#### 14. Set Persona Status: Running
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH the persona record to Status = "Running" and Run Date = current timestamp. This is the first user-visible signal that the pipeline has started.
- **Placement Reasoning:** After all pre-checks pass. If we set Running before validation, a failed validation would leave the persona stuck in Running.

---

#### 15. Create Run Log Record
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Creates a record in the Run Logs table with Start Time, linked Persona, and Status = "Running". This provides an audit trail per the schema.
- **Key Configuration:** Includes the n8n execution ID in the Notes field for debugging.
- **Edge Cases Addressed:** EC-041 (execution-level correlation).

---

#### 16. Store Run Log ID
- **Type:** `n8n-nodes-base.set`
- **Purpose:** Captures the Run Log record ID from the Airtable response so we can update it at the end of the run. Also carries forward all persona data.

---

### Section 4: Apify Lead Scraping

---

#### 17. Trigger Apify Lead Scraper
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** POST to the Apify API to start the Leads Scraper actor. Sends the persona's search criteria (job title, location, company size, keywords) as input. maxResults capped at 50.
- **Key Configuration:** Uses the Apify API credential. 30s timeout on the trigger request itself. maxResults: 50 in the actor input (EC-043).
- **Placement Reasoning:** After all validation passes and Running status is set.
- **Failure Considerations:** Auth errors (401/403) and rate limits (429) are checked in the next node.
- **Edge Cases Addressed:** EC-016 (API auth/rate limit), EC-043 (batch cap).

---

#### 18-20. Check Apify Trigger Response / Handle Apify Trigger Error / Set Persona Error (Apify)
- **Purpose:** Checks if Apify accepted the run request (HTTP 201). If not, routes to error handling that sets the persona to Error status with a detailed log message.
- **Edge Cases Addressed:** EC-016 (auth and rate limit errors on the Apify API).

---

#### 21. Extract Apify Run ID
- **Type:** `n8n-nodes-base.set`
- **Purpose:** Extracts the Apify run ID and dataset ID from the response. Initializes the poll counter at 0 with a maximum of 20 (20 polls x 15 seconds = 5 minutes max).
- **Edge Cases Addressed:** EC-015 (poll timeout setup).

---

#### 22-25. Apify Polling Loop (Wait -> Poll -> Evaluate -> Route)

This is a loop that polls Apify every 15 seconds:

- **Wait 15s (Apify Poll):** Pauses 15 seconds between polls.
- **Poll Apify Run Status:** GET request to check the actor run's current status.
- **Evaluate Apify Status:** Code node that checks the status and increments the poll counter. Determines the next action:
  - `SUCCEEDED` -> fetch results
  - `RUNNING` and under max polls -> poll again (loop back to Wait)
  - `RUNNING` and over max polls -> poll timeout (EC-015)
  - `FAILED` -> scrape failed (EC-010)
  - `TIMED-OUT` -> check for partial results (EC-009)
- **Route Apify Status:** Switch node with 4 outputs routing to the appropriate handler.

**Edge Cases Addressed:** EC-009 (partial results from timed-out actor), EC-010 (failed actor), EC-015 (5-minute polling timeout).

---

#### 26. Fetch Apify Dataset
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** GET request to fetch the dataset items from the completed Apify run. Limited to 50 items.
- **Key Configuration:** Format = JSON, limit = 50. 30s timeout.
- **Edge Cases Addressed:** EC-043 (batch cap).

---

#### 27. Handle Scrape Failure
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Sets persona to Error status when the Apify actor failed or timed out.
- **Edge Cases Addressed:** EC-010, EC-015.

---

### Section 5: Lead Data Processing

---

#### 28. Process and Validate Leads
- **Type:** `n8n-nodes-base.code`
- **Purpose:** This is the largest single node in the workflow. It processes the raw Apify output into normalized, validated, sanitized lead objects. This node handles an enormous amount of edge cases in one pass for efficiency.
- **Key Configuration / What it does:**
  1. Handles multiple possible response formats (array, object with items/data property)
  2. Caps results at 50 leads (EC-043)
  3. In-memory dedup by email within the batch (schema spec 7.2, point 1)
  4. For each lead:
     - Sanitizes all text fields: strips HTML tags, removes n8n expression patterns (`{{ }}`, `$json`, `$env`), strips control characters, limits to 2000 chars (EC-014, EC-037)
     - Validates email format with regex (EC-012) and checks against garbage value blocklist (EC-012)
     - Validates LinkedIn URL format -- checks for personal profile pattern vs company page (EC-013, EC-021)
     - Normalizes LinkedIn URLs per schema spec 7.3 (lowercase, strip query params, ensure https://www.)
     - Validates website URL format -- checks for valid HTTP(S) protocol, rejects javascript:/data:/file: (EC-023)
     - Checks for no-contact-channel leads (EC-044)
  5. Returns empty check result (EC-008)
- **Failure Considerations:** If the Apify response format is completely unexpected, the node will produce an empty leads array, which triggers the "No Results" path.
- **Edge Cases Addressed:** EC-008, EC-011, EC-012, EC-013, EC-014, EC-021, EC-023, EC-037, EC-043, EC-044.

---

#### 29. Results Empty?
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Checks if processed leads count is zero. Routes to "No Results" handler or continues to batch processing.
- **Edge Cases Addressed:** EC-008.

---

#### 30. Set Persona: No Results
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Sets persona Status to "No Results" and Lead Count to 0. Terminal state.
- **Edge Cases Addressed:** EC-008.

---

### Section 6: Per-Lead Processing Loop

---

#### 31. Prepare Leads for Batch Processing
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Converts the leads array into individual n8n items. Each lead becomes a separate item that SplitInBatches can process one at a time.

---

#### 32. SplitInBatches
- **Type:** `n8n-nodes-base.splitInBatches`
- **Purpose:** Processes leads one at a time (batch size = 1). This ensures controlled API usage, proper error isolation (one lead's failure doesn't crash the batch), and prevents rate limiting.
- **Key Configuration:** Batch size = 1, reset = false.
- **Two outputs:** Output 0 = next batch item (goes to dedup check). Output 1 = all items processed (goes to completion).
- **Edge Cases Addressed:** EC-003 (rate limit prevention), EC-041 (isolation between leads).

---

#### 33. Dedup Check: Search by Email
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Queries the Airtable Leads table for existing records with the same email OR LinkedIn URL. Combines primary and secondary dedup keys in one query for efficiency.
- **Key Configuration:** `filterByFormula` uses `OR(LOWER({Email})=LOWER('...'), LOWER({LinkedIn URL})=LOWER('...'))`. maxRecords = 1.
- **Edge Cases Addressed:** EC-038 (email dedup), EC-039 (LinkedIn dedup).

---

#### 34. Is Duplicate Lead?
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Evaluates the dedup search results. If any records were found, marks the lead as duplicate.
- **Edge Cases Addressed:** EC-038, EC-039.

---

#### 35. Route: Duplicate or New
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Routes duplicates to the "create as duplicate" path and new leads to the full pipeline.

---

#### 36. Create Duplicate Lead Record
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Creates the lead record in Airtable with `Is Duplicate = true` and `Pipeline Status = "Skipped"`. The record is kept for audit trail per schema spec 7.2.
- **Key Configuration:** Does NOT trigger any downstream processing. Loops back to SplitInBatches via the rate limit buffer.
- **Edge Cases Addressed:** EC-038, EC-039 (duplicate handling).

---

#### 37. Create New Lead Record
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Creates a new lead record in Airtable with all available fields from the scraper. Sets Pipeline Status to "Queued", links to Source Persona, and pre-sets any statuses already determined (e.g., Website Status = "Missing" if no URL).
- **Key Configuration:** Sets `Retry Count = 0`, `Is Duplicate = false`.
- **Edge Cases Addressed:** Part of EC-040 (pipeline checkpoint -- Queued state).

---

#### 38. Store Lead Record ID
- **Type:** `n8n-nodes-base.set`
- **Purpose:** Captures the Airtable record ID for the new lead so all subsequent PATCH updates can target it.

---

#### 39-40. Check No Contact Channels / Has Contact Channels?
- **Purpose:** If the lead has no email AND no valid LinkedIn URL, skip the entire pipeline (no point verifying or generating messages for an unreachable person).
- **Edge Cases Addressed:** EC-044.

---

#### 41. Update Lead: No Contact
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Sets Pipeline Status to "Partial" with an error detail explaining no contact channels were available.
- **Edge Cases Addressed:** EC-044.

---

### Section 7: Website and LinkedIn Verification

---

#### 42. Update Lead: Verifying
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Updates Pipeline Status to "Verifying" before starting URL verification. This is a checkpoint (EC-040).

---

#### 43. Website Verification
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** HTTP HEAD request to the company's website URL to verify it exists and is accessible.
- **Key Configuration:**
  - Method: HEAD (lighter than GET, just checks the server response)
  - Timeout: 10 seconds (EC-019)
  - Follow redirects: up to 3 hops (EC-018)
  - User-Agent: Chrome browser string (avoids basic bot blocks)
  - `continueOnFail: true` -- CRITICAL. If the request fails (timeout, DNS error, connection refused), the pipeline continues instead of crashing. This is the core graceful degradation mechanism.
  - `retryOnFail: false` -- We don't retry website checks. If it's down, it's down. Save time.
- **Failure Considerations:** The node will output an error object instead of a normal response on failure. The next Code node handles both cases.
- **Edge Cases Addressed:** EC-017 (404), EC-018 (redirects), EC-019 (timeout), EC-020 (placeholder -- partial, detected in next node).

---

#### 44. Evaluate Website Status
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Maps the HTTP response (or error) to the appropriate Website Status value from the schema. Handles all possible outcomes:
  - 200 -> "Valid"
  - 403 -> "Blocked"
  - 404 -> "Invalid"
  - Other 4xx/5xx -> "Invalid"
  - Timeout/ETIMEDOUT -> "Timeout"
  - DNS failure (ENOTFOUND) -> "Invalid"
  - Redirect to parking domain -> "Parked" (checks against godaddy.com, sedoparking.com, etc.)
- **Edge Cases Addressed:** EC-017, EC-018, EC-019, EC-020 (parking domain detection).

---

#### 45. LinkedIn Verification
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** HTTP GET request to the LinkedIn profile URL with UA spoofing.
- **Key Configuration:**
  - Method: GET (LinkedIn doesn't respond well to HEAD)
  - Headers: Browser-like User-Agent, Accept, Accept-Language (UA spoofing per task requirements)
  - Timeout: 10 seconds
  - Follow redirects: up to 3
  - `continueOnFail: true`
- **Edge Cases Addressed:** EC-022 (LinkedIn 999 response and redirects).

---

#### 46. Evaluate LinkedIn Status
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Maps LinkedIn HTTP response to status values:
  - 200 -> "Valid"
  - 999 -> "Bot-Blocked" (LinkedIn anti-bot -- NOT marked as Invalid because the profile likely exists)
  - 404 -> "Invalid"
  - 3xx -> "Valid" (redirect means profile exists but URL changed)
  - 403 -> "Bot-Blocked"
  - Company page (from earlier format check) -> "Invalid" with specific log
- **Edge Cases Addressed:** EC-021 (company page), EC-022 (999 anti-bot, redirects).

---

#### 47. Update Lead: Verification Results
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH the lead record with Website Status and LinkedIn Status results.

---

### Section 8: About Page Scraping

---

#### 48-49. Should Scrape About Page? / Route: Scrape or Skip
- **Purpose:** Determines whether to trigger the About page scraper. Only scrapes if the website is Valid OR LinkedIn is Valid/Bot-Blocked (bot-blocked LinkedIn profiles can still have company pages we can scrape).
- **Placement Reasoning:** After verification, because we need to know if the URLs are actually reachable before trying to scrape them.

---

#### 50. Trigger Apify About Scraper
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Triggers the Apify LinkedIn Company / About page scraper actor with the lead's best available URL.
- **Key Configuration:** `continueOnFail: true` -- if the scraper fails, we still continue the pipeline with no about text (graceful degradation).
- **Edge Cases Addressed:** Part of EC-031 (if scraper fails or returns empty, we use fallback prompt).

---

#### 51-52. Wait 10s / Fetch About Scraper Results
- **Purpose:** Waits for the About scraper to complete, then fetches results. This is a simplified approach (single wait + fetch) rather than a full polling loop, since About scraping is typically fast.

---

#### 53. Process About Text
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Processes and sanitizes the scraped About text. Strips HTML, removes injection patterns, enforces the 10,000 character limit per schema spec 8.4.
- **Edge Cases Addressed:** EC-014 (sanitization), EC-037 (prompt injection patterns removed from about text).

---

#### 54. Merge After About Scrape
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Handles the "skip scrape" path. Sets About Source to "None" and passes through with empty about text.

---

#### 55. Update Lead: About Text
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH the lead with Company About Text and About Source. Updates Pipeline Status to "Scraping".

---

### Section 9: Pre-AI Persona Check

---

#### 56. Re-read Persona Status (Pre-AI Check)
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Re-reads the persona record's Status field BEFORE the expensive AI generation step. If the user changed the persona status away from "Running" (e.g., to "Draft" or "Paused"), we abort instead of spending money on AI calls.
- **Key Configuration:** Only fetches the Status field (minimal data). `continueOnFail: true` so that if the read fails, we still attempt to continue.
- **Placement Reasoning:** Placed right before AI generation because that's the most expensive step. We don't check earlier because the verification steps are cheap.
- **Edge Cases Addressed:** EC-006 (persona status changed during execution).

---

#### 57-58. Persona Still Running? / Route: Continue or Abort
- **Purpose:** If persona is no longer Running, abort the pipeline for this lead (and all subsequent leads). The abort path loops back to SplitInBatches which will process remaining items and eventually hit the completion node.
- **Edge Cases Addressed:** EC-006.

---

### Section 10: Email Validation (Bouncer)

---

#### 59. Email Validation (Bouncer)
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Pre-validates the email before calling Bouncer. Checks: (1) email is non-empty, (2) email is not a garbage value (n/a, none, null, etc.), (3) email matches the format regex from schema spec 8.2.
- **Key Configuration:** Uses the full regex: `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`.
- **Placement Reasoning:** Before the Bouncer API call to avoid wasting API credits on obviously invalid or missing emails.
- **Edge Cases Addressed:** EC-011 (missing email), EC-012 (malformed email), EC-029 (skip Bouncer when no email).

---

#### 60. Update Lead: Validating Email
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Pipeline Status checkpoint -- "Validating Email".

---

#### 61. Should Call Bouncer?
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Routes to Bouncer API call or skip path based on the pre-validation result.
- **Edge Cases Addressed:** EC-029.

---

#### 62. Call Bouncer API
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** GET request to the Bouncer email verification endpoint.
- **Key Configuration:**
  - Timeout: 15 seconds (EC-028)
  - Retry: 3 attempts with 1s wait (EC-027 rate limit recovery, EC-028 service error retry)
  - `continueOnFail: true` -- if Bouncer is completely down, we still continue the pipeline
  - Full response mode to capture HTTP status codes
- **Edge Cases Addressed:** EC-027 (rate limit), EC-028 (timeout/5xx).

---

#### 63. Process Bouncer Response
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Maps the Bouncer API response to the Email Status values defined in the schema. Also performs the role address check.
- **Key Configuration:**
  - Verdict mapping per schema spec 8.3: deliverable->Deliverable, undeliverable->Invalid, unknown->Unknown, accept_all->Accept-All, disposable->Disposable, role->Role-Address
  - Role address check: Even if Bouncer says "deliverable", checks the local part against 20+ common role prefixes (info, support, hello, contact, admin, sales, etc.)
  - On any error during processing, sets Email Status to "Error"
- **Edge Cases Addressed:** EC-024 (unknown/accept_all), EC-025 (invalid), EC-026 (disposable), EC-028 (error handling), EC-030 (role address detection).

---

#### 64. Skip Bouncer Path
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Pass-through for leads that skipped Bouncer. Preserves the emailStatus already set (e.g., "Skipped").

---

#### 65. Update Lead: Email Status
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH the lead with Email Status and Bouncer Raw Response.

---

### Section 11: AI Message Generation

---

#### 66. Prepare AI Generation
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Pre-AI preparation that handles three critical checks:
  1. **Industry blocklist (EC-036):** Scans company name and about text for excluded industries (weapons, casino, gambling, adult entertainment, tobacco, payday lending, etc.). If matched, AI is skipped entirely.
  2. **Email status routing (EC-025/EC-026):** If email is Invalid or Disposable, sets a flag so AI only generates the LinkedIn message (not emails).
  3. **About text quality (EC-031):** Checks if about text is >= 50 characters. If not, flags for fallback prompt.
  4. **Prompt injection sanitization (EC-037):** Scans about text line-by-line for injection patterns (lines starting with "ignore", "forget", "disregard", "you are now", "new instructions", "system prompt"). Removes matching lines. If >50% of content is removed, uses fallback prompt instead.
  5. **Length cap:** Limits about text to 2000 characters for the AI prompt.
- **Edge Cases Addressed:** EC-025, EC-026, EC-031, EC-036, EC-037.

---

#### 67. Should Generate AI?
- **Type:** `n8n-nodes-base.if`
- **Purpose:** Routes to AI generation or to the "excluded industry" update based on the blocklist check.
- **Edge Cases Addressed:** EC-036.

---

#### 68. Update Lead: Generating Messages
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Pipeline Status checkpoint -- "Generating Messages".

---

#### 69. Generate Messages (OpenAI)
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** POST to the OpenAI Chat Completions API to generate the 3-step email sequence and LinkedIn message.
- **Key Configuration:**
  - Model: `gpt-4o-mini` (cost-effective for outreach generation)
  - Temperature: 0.7 (variety without randomness)
  - `response_format: { type: "json_object" }` -- forces structured JSON output for reliable parsing
  - System prompt includes:
    - Service context ("connects founders with AI automation assistants")
    - Forbidden words ("revolutionary", "game-changing", "leverage")
    - Tone instruction ("Write like a human, not a marketer")
    - Exact output schema (7 fields)
    - Length constraints ("Keep each email under 150 words")
  - User prompt uses two variants:
    - **Full context prompt:** When about text >= 50 chars. Includes company_context delimiters (`<company_context>` tags) with anti-injection instruction per EC-037.
    - **Fallback prompt:** When about text is thin. Explicitly instructs: "Do not reference any company details, mission, or products. Do not fabricate company details."
    - **LinkedIn-only variant:** When email is invalid/disposable. Instructs AI to set email fields to "[SKIPPED - Invalid Email]".
  - Timeout: 30 seconds (EC-034)
  - Retry: 3 attempts with 5s wait (longer wait because AI APIs can be slow to recover)
  - `continueOnFail: true` -- AI failure should not crash the pipeline
- **Placement Reasoning:** Last major processing step because it's the most expensive. All cheaper validation happens first.
- **Edge Cases Addressed:** EC-025 (invalid email -> LinkedIn only), EC-026 (disposable -> LinkedIn only), EC-031 (fallback prompt), EC-034 (AI timeout/error), EC-037 (company_context delimiters).

---

#### 70. Process AI Response
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Parses and validates the AI output. This is the quality gate for generated content.
- **Key Configuration:**
  1. Parses JSON response from OpenAI
  2. Validates all 7 required fields exist (email_subject_1 through linkedin_message)
  3. **Placeholder detection (EC-035):** Scans for patterns like `[Company Name]`, `[Your Name]`, `[INSERT`, `{company}`, etc.
  4. **Company name reference check (EC-033):** When good context was available, verifies the company name appears in at least the first email or LinkedIn message.
  5. **Word count check (EC-032):** Checks each email body against 300-word limit. Checks LinkedIn message against 300-character limit. If LinkedIn message is too long, truncates to 297 chars + "...".
  6. **Final Pipeline Status determination:** Maps the combination of email status, about text quality, and generation result to the correct final status:
     - All good + Deliverable email -> "Complete"
     - Limited context -> "Complete" with "Limited Context" message status
     - Unknown/Accept-All email -> "Needs Review"
     - Role address -> "Needs Review"
     - Invalid/Disposable email -> "Partial"
     - Generation failure -> "Error"
  7. On any parsing error (bad JSON, empty response): sets messageGenStatus to "Failed", preserves all existing lead data (EC-034, EC-040)
- **Edge Cases Addressed:** EC-032, EC-033, EC-034, EC-035, EC-040 (preserving existing data on failure).

---

#### 71. Update Lead: Final (Messages + Status)
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** The final PATCH for this lead. Writes all 7 message fields, Message Generation Status, final Pipeline Status, and consolidates all error/log entries into the Error Detail field (appended, never overwritten).
- **Key Configuration:** LinkedIn Message truncated to 300 characters (LinkedIn's connection request limit). Error Detail concatenates all logs from every pipeline stage.
- **Edge Cases Addressed:** EC-040 (final checkpoint).

---

#### 72. Update Lead: Excluded Industry
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** For leads blocked by the industry filter: sets Pipeline Status to "Skipped" and Message Generation Status to "Skipped".
- **Edge Cases Addressed:** EC-036.

---

### Section 12: Loop Control and Completion

---

#### 73. Wait 1s (Rate Limit Buffer)
- **Type:** `n8n-nodes-base.wait`
- **Purpose:** 1-second pause between lead processing cycles. All paths (duplicate, no contact, completed, excluded, aborted) converge here before looping back to SplitInBatches.
- **Placement Reasoning:** Prevents Airtable rate limiting (5 req/sec limit per EC-003). Also creates natural spacing for Bouncer and AI API calls.
- **Edge Cases Addressed:** EC-003 (Airtable rate limit), EC-027 (Bouncer rate limit prevention).

---

#### 74. Update Persona: Complete
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Runs after SplitInBatches has processed all leads (output 1). Collects final statistics.

---

#### 75. Set Persona Status: Complete
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** PATCH the persona record: Status = "Complete", Lead Count = total processed.

---

#### 76. Update Run Log: Complete
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Final Run Log update with all statistics: End Time, Leads Found, Leads Processed, Leads Skipped Duplicate, Status = "Complete", and a summary Notes string.
- **Placement Reasoning:** Very last node in the success path. Closes the audit trail.

---

### Section 13: Global Error Handler

---

#### 77. Error Handler (Global)
- **Type:** `n8n-nodes-base.errorTrigger`
- **Purpose:** Catches any uncaught exception across the entire workflow. This is the safety net for scenarios where a node fails in a way that wasn't explicitly handled.
- **Key Configuration:** This is a separate trigger -- it fires independently when any execution fails.
- **Failure Considerations:** If the workflow is killed by an execution timeout, this trigger may not fire reliably. The recovery query (EC-040) is the backup.
- **Edge Cases Addressed:** EC-045 (global execution timeout / unhandled errors).

---

#### 78. Log Global Error
- **Type:** `n8n-nodes-base.code`
- **Purpose:** Formats the error for logging. Captures execution ID, failing node name, and error message.
- **Edge Cases Addressed:** EC-045.

---

## Credentials Reference

| Credential Name | Type | Used By |
|---|---|---|
| Airtable API | HTTP Header Auth | All Airtable CRUD operations (header: `Authorization: Bearer {token}`) |
| Apify API | HTTP Header Auth | Apify actor triggers and dataset fetches (header: `Authorization: Bearer {token}`) |
| Bouncer API | HTTP Header Auth | Email verification API calls (header: `x-api-key: {key}`) |
| OpenAI | HTTP Header Auth | Chat completions API (header: `Authorization: Bearer {token}`) |

All credentials are configured as n8n credential objects. No API keys appear in node parameters. Code nodes do not access `$env` (blocked by sandboxing per MEMORY.md).

---

## Retry and Backoff Strategy

| API | Max Tries | Wait Between | Timeout | Notes |
|---|---|---|---|---|
| Airtable | 3 | 1000ms | 15s | Linear backoff (n8n limitation). For production: implement exponential via a Code node loop paired with a Wait node for delays. |
| Apify (trigger) | 3 | 1000ms | 30s | Longer timeout for actor triggering. |
| Apify (poll) | 3 | 1000ms | 15s | Polling retries are independent of the poll loop. |
| Bouncer | 3 | 1000ms | 15s | Per EC-028. Retry covers transient failures. |
| OpenAI | 3 | 5000ms | 30s | Longer wait between retries for AI API (often needs more recovery time). |
| Website verification | 0 (no retry) | -- | 10s | Sites are either up or down. Retrying wastes time. |
| LinkedIn verification | 0 (no retry) | -- | 10s | Same rationale as website. |

**Production improvement:** n8n's built-in retry is linear (fixed wait). For true exponential backoff, you would wrap API calls in a Code node loop: `wait = baseWait * Math.pow(2, attemptNumber)`. This is documented but not implemented because n8n's retry mechanism is adequate for the expected scale (< 50 leads per run).

---

## Edge Case Coverage Map

| EC ID | Handler Node(s) | Status |
|---|---|---|
| EC-001 | Validate Persona Inputs, Is Persona Valid?, Set Persona Status: Input Error | Implemented |
| EC-002 | Check Duplicate Trigger, Evaluate Duplicate Trigger, Is Duplicate Trigger? | Implemented |
| EC-003 | SplitInBatches (batch=1), Wait 1s (Rate Limit Buffer) | Implemented |
| EC-004 | Read Persona Record (timeout=15s, retry=3) | Implemented |
| EC-005 | Check Persona Exists & Still Ready (checks statusCode=200) | Implemented |
| EC-006 | Re-read Persona Status (Pre-AI Check), Persona Still Running? | Implemented |
| EC-007 | Read Persona Record + Check Persona Exists & Still Ready | Implemented |
| EC-008 | Process and Validate Leads (isEmpty check), Results Empty? | Implemented |
| EC-009 | Evaluate Apify Status (TIMED-OUT -> partial_or_failed -> fetch dataset) | Implemented |
| EC-010 | Evaluate Apify Status (FAILED -> scrape_failed), Handle Scrape Failure | Implemented |
| EC-011 | Process and Validate Leads (email empty check), Email Validation (Bouncer) | Implemented |
| EC-012 | Process and Validate Leads (regex + garbage list), Email Validation (Bouncer) | Implemented |
| EC-013 | Process and Validate Leads (LinkedIn URL format check) | Implemented |
| EC-014 | Process and Validate Leads (sanitize function), Process About Text | Implemented |
| EC-015 | Extract Apify Run ID (maxPolls=20), Evaluate Apify Status (pollCount check) | Implemented |
| EC-016 | Check Apify Trigger Response, Handle Apify Trigger Error | Implemented |
| EC-017 | Evaluate Website Status (404 -> Invalid) | Implemented |
| EC-018 | Website Verification (followRedirects=3), Evaluate Website Status (parking domains) | Implemented |
| EC-019 | Website Verification (timeout=10000) | Implemented |
| EC-020 | Evaluate Website Status (parking domain check on redirect target) | Partial -- redirect domain check covers most cases; body content check for "coming soon" would require a GET instead of HEAD |
| EC-021 | Process and Validate Leads (company page detection), Evaluate LinkedIn Status | Implemented |
| EC-022 | LinkedIn Verification (UA spoofing, followRedirects), Evaluate LinkedIn Status (999 handling) | Implemented |
| EC-023 | Process and Validate Leads (URL format validation, dangerous protocol blocking) | Implemented |
| EC-024 | Process Bouncer Response (unknown/accept_all -> pipeline "Needs Review") | Implemented |
| EC-025 | Process Bouncer Response (undeliverable -> Invalid), Prepare AI Generation (emailOnlyLinkedIn) | Implemented |
| EC-026 | Process Bouncer Response (disposable -> Disposable), Prepare AI Generation (emailOnlyLinkedIn) | Implemented |
| EC-027 | Call Bouncer API (retryOnFail=3), Wait 1s (Rate Limit Buffer) | Implemented |
| EC-028 | Call Bouncer API (timeout=15s, retryOnFail=3, continueOnFail=true) | Implemented |
| EC-029 | Email Validation (Bouncer) (empty check), Should Call Bouncer? | Implemented |
| EC-030 | Process Bouncer Response (role address list check) | Implemented |
| EC-031 | Prepare AI Generation (hasGoodContext check), Generate Messages (fallback prompt) | Implemented |
| EC-032 | Process AI Response (word count + character count checks, LinkedIn truncation) | Implemented |
| EC-033 | Process AI Response (company name reference check) | Implemented |
| EC-034 | Generate Messages (timeout=30s, retry=3, continueOnFail), Process AI Response (try/catch) | Implemented |
| EC-035 | Process AI Response (placeholder pattern detection) | Implemented |
| EC-036 | Prepare AI Generation (industry blocklist scan) | Implemented |
| EC-037 | Process and Validate Leads (sanitize), Prepare AI Generation (injection line removal), Generate Messages (company_context delimiters) | Implemented |
| EC-038 | Dedup Check: Search by Email (filterByFormula on Email) | Implemented |
| EC-039 | Dedup Check: Search by Email (filterByFormula includes LinkedIn URL) | Implemented |
| EC-040 | Pipeline Status updates at every stage, Process AI Response (preserves existing data on failure) | Implemented |
| EC-041 | Set Execution Context (executionId), Create Run Log Record (execution correlation) | Implemented |
| EC-042 | Pipeline Status checks prevent re-processing of terminal-state leads | Implemented |
| EC-043 | Process and Validate Leads (cap at 50), Trigger Apify Lead Scraper (maxResults=50) | Implemented |
| EC-044 | Check No Contact Channels, Has Contact Channels?, Update Lead: No Contact | Implemented |
| EC-045 | Error Handler (Global), Log Global Error | Implemented |

---

## Known Limitations

1. **EC-020 (placeholder page body detection):** The workflow uses HTTP HEAD for website verification (faster), which means it cannot inspect the response body for "coming soon" / "domain for sale" text. It does detect parking domains via redirect URL analysis. For full placeholder detection, the request would need to be changed to GET, which is slower and heavier. This is a deliberate trade-off.

2. **Exponential backoff:** n8n's built-in retry uses linear wait intervals. True exponential backoff would require custom Code node loops. The linear retry (1s between attempts) is adequate for the expected workload but may be insufficient under heavy load.

3. **About scraper polling:** The About page scraper uses a single 10-second wait rather than a full polling loop. For very slow scrapes, this could return no results when data would have been available after more time. This is a simplicity trade-off -- the About text is nice-to-have, not critical.

4. **Concurrent execution race conditions (EC-041):** While each execution operates independently and uses dedup checks, there is a narrow race window where two executions could both find "no duplicate" for the same email and both insert. The Airtable dedup check is not atomic. This is a known Airtable limitation. The impact is minimal -- duplicate records would be caught on the next run.

5. **Global error handler reliability (EC-045):** If n8n kills the execution due to timeout, the error trigger may not fire. The recovery query approach (finding leads stuck in intermediate states) serves as the safety net.

---

## How to Deploy

1. Import `workflow.json` into n8n via Settings > Import Workflow.
2. Configure the four credential objects (Airtable API, Apify API, Bouncer API, OpenAI) with valid API keys.
3. Set the environment variable `AIRTABLE_BASE_ID` in n8n's `.env` file or via the Settings UI.
4. Activate the workflow.
5. In Airtable, create a Scripting Automation on the Target Personas table that triggers when Status changes to "Ready to Run". The script should POST to the webhook URL with `{ "record_id": record.id }`.
6. Test with a persona that has all required fields filled in.
