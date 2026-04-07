# Implementation Breakdown

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo
**Stack:** 2 n8n workflows + React/Tailwind frontend + Supabase
**Date:** 2026-03-25

---

## Workflow Overview

The system runs as two n8n workflows triggered by POST webhooks from a React frontend.

**Workflow 1 (Content Intake & Draft Generation):** Frontend submits a content idea or URL to `/content-submit`. The workflow validates the input, checks for duplicates, extracts URL content if needed, generates three SEO-optimized drafts sequentially, stores everything in Supabase, and returns draft previews to the frontend.

**Workflow 2 (Draft Selection & Publishing):** Manager selects a draft in the frontend, which POSTs to `/draft-select`. The workflow validates the selection, locks the submission, adapts the chosen draft for LinkedIn, X/Twitter, and email newsletter, then either publishes immediately or saves for scheduling.

The two workflows share no execution state. Supabase is the only connection between them.

---

## Node-by-Node Breakdown

### Workflow 1: Content Intake & Draft Generation

#### "Validate Input Payload" (Code node)
**Purpose:** First line of defense. Rejects bad data before any API calls or database writes happen.
**Key configuration:** Checks that the request body exists and is non-null. Verifies at least one of `rawIdea` or `url` is present and non-empty after trimming. Coerces inputs with `.toString().trim()`. Strips HTML tags from `rawIdea` using `.replace(/<[^>]*>/g, '')`. Checks total payload size against a 1MB limit.
**Why it's here:** Input validation is the first node after the webhook -- not after extraction, not after any processing. If the payload is garbage, I want to reject it before spending any resources. This saves API calls, keeps the database clean, and gives the manager instant feedback with a named error ("Either rawIdea or url must be provided" rather than a generic 500 later).
**Failure mode:** Returns 400 to the frontend with a specific error message naming exactly what's wrong.

#### "Generate Submission ID & Dedup Hash" (Code node)
**Purpose:** Creates a unique submission ID (`sub_xxx` format) and a content hash from the input for duplicate detection.
**Key configuration:** The submission ID uses a random string generator. The content hash is derived from the raw input text (or URL string), creating a fingerprint that can be compared against recent submissions.
**Why it's here:** The ID needs to exist before the Supabase insert so it can be used as the primary key. The hash needs to exist before the duplicate check.
**Failure mode:** If this node throws (shouldn't -- it's pure computation), the workflow errors before any external calls.

#### "Check Duplicate in Supabase" (HTTP Request node)
**Purpose:** Queries the submissions table for any record with the same content hash created within the last 10 minutes.
**Key configuration:** GET request to Supabase REST API with query parameters filtering on `content_hash` and `created_at` within a 10-minute window. Returns at most 1 result (`limit=1`).
**Why it's here:** Catches accidental double-clicks or browser retries. The 10-minute window is intentional -- it catches the common "manager clicked Submit twice" scenario without blocking legitimate resubmissions of the same topic days later.
**Failure mode:** If Supabase is unreachable, retries 3 times with exponential backoff. After that, the workflow errors. I chose not to silently skip the duplicate check because processing a duplicate is more expensive than failing fast.

#### "Fetch URL Content" (HTTP Request node)
**Purpose:** Downloads the HTML content from a submitted URL.
**Key configuration:** 15-second timeout (URLs should respond fast; if they don't, they're probably broken or paywalled). 3 retries with exponential backoff. Only executes if the URL branch is taken (IF node routes based on whether `url` field is populated).
**Why it's here:** Placed on the URL branch only. If the manager submitted a raw idea without a URL, this node never fires -- no wasted HTTP calls.
**Failure mode:** On failure after retries, the workflow checks if a `rawIdea` was also provided. If yes, it falls back to the raw idea and logs the URL failure. If the URL was the only input, it returns 422: "Couldn't extract content from this URL."

#### "Extract Text from URL Response" (Code node)
**Purpose:** Strips HTML tags, script blocks, style blocks, and navigation elements from the fetched page. Extracts clean plain text. Truncates to 5,000 characters.
**Key configuration:** Regex-based stripping (not a full DOM parser -- n8n Code nodes don't have access to cheerio by default). The 5,000 character truncation prevents oversized prompts to the AI. If the extracted text is too thin (under 100 chars after stripping), returns 422.
**Why it's here:** Raw HTML is unusable as AI input. The extraction needs to happen before the content reaches the draft generation prompts.
**Failure mode:** If extraction produces empty or near-empty text, returns 422 rather than sending garbage to the AI.

#### "Generate Draft 1 -- Contrarian Angle" (HTTP Request node)
**Purpose:** First AI generation call. Produces an SEO-optimized article from a contrarian/challenge-assumptions angle.
**Key configuration:** POST to OpenAI API using gpt-4o. The prompt includes: the extracted content base, the specific angle instruction ("Write a contrarian take that challenges the conventional wisdom on this topic"), full SEO rules (keyword placement, header structure, meta description format), and output format requirements (title, body, minimum 300 words). 60-second timeout.
**Why it's first:** Contrarian angle is the hardest to generate well, so it goes first when the AI has no prior context to anchor on. The subsequent drafts build on knowing what angle Draft 1 took.
**Failure mode:** Retries 3 times. If all fail, the submission status is set to "error" in Supabase and the workflow returns 500.

#### "Validate Draft 1" / "Validate Draft 2" / "Validate Draft 3" (Code nodes)
**Purpose:** Quality gate after each AI generation. Checks the draft isn't empty, meets the 300-word minimum, strips any AI meta-commentary ("Here's your article:", "I hope this helps"), and extracts the title.
**Key configuration:** Word count via `.split(/\s+/).length`. Meta-commentary detection via regex patterns matching common AI preambles and postscripts. Title extraction looks for the first H1 or the first line if no H1.
**Why after each draft:** Validation between drafts (not after all three) means a failed Draft 1 stops the pipeline before Draft 2 and 3 are attempted. This saves tokens and API calls on a batch that would be unusable anyway.
**Failure mode:** If validation fails, the draft is regenerated with a more explicit prompt (one retry). If the retry also fails, the submission goes to error state.

#### "Generate Draft 2 -- Practical How-To" and "Generate Draft 3 -- Data & Trends" (HTTP Request nodes)
**Purpose:** Second and third AI generation calls, each producing a draft from a distinct angle.
**Key configuration:** Same base configuration as Draft 1, but the prompt includes a summary of the previous draft(s) angle: "Draft 1 took a contrarian approach arguing [summary]. Now write a practical how-to that takes a completely different angle." Draft 3's prompt includes both Draft 1 and Draft 2 summaries. This inter-draft context is the key mechanism for forcing genuine diversity.
**Failure mode:** Same retry and error pattern as Draft 1.

### Workflow 2: Draft Selection & Publishing

#### "Validate Submission State" (Code node)
**Purpose:** Ensures the submission exists, has status `pending_review`, and hasn't expired (72-hour TTL from creation).
**Key configuration:** Checks three conditions: (1) the Supabase query returned a result, (2) status equals exactly `pending_review`, (3) `created_at` is within 72 hours. Each condition has a specific error message.
**Why it matters:** This prevents processing expired submissions (manager left a review sitting for days), already-processed submissions (browser retry after a successful selection), and submissions that don't exist (malformed callback URL).
**Failure mode:** Returns 400/404/410 with specific error messages depending on which check failed.

#### "Lock Submission" (HTTP Request node)
**Purpose:** Updates the submission status from `pending_review` to `processing`. This is the optimistic lock.
**Key configuration:** PATCH to Supabase REST API. The status transition serves double duty: it prevents a second selection from being processed (the Validate node will reject anything with status != `pending_review`), and it tells the frontend that adaptation is in progress.
**Why it's separate from validation:** The validation read and the lock write need to be separate operations. If they were combined, a race condition could let two concurrent requests both read `pending_review` and both proceed. By making the lock a separate write, the second request's validation will see `processing` and reject.
**Failure mode:** If the PATCH fails (Supabase down), the workflow errors. The submission stays in `pending_review` state, which means a retry will work.

#### "Adapt for LinkedIn" (HTTP Request node)
**Purpose:** Takes the selected draft and rewrites it for LinkedIn using the PAS (Problem-Agitate-Solution) technique.
**Key configuration:** OpenAI call with a prompt specifying: PAS format, professional but conversational tone, 3,000-character limit, include a call-to-action, formatting for LinkedIn's text renderer (line breaks, no markdown headers). The full selected draft text is included as source material.
**Failure mode:** Retries 3 times. A subsequent validation node checks the output is under 3,000 characters and contains a CTA.

#### "Enforce X Character Limit" (Code node)
**Purpose:** Hard-enforces the 280-character limit on the X/Twitter adaptation. The AI is told about the limit in the prompt, but LLMs don't count characters reliably.
**Key configuration:** If the AI output exceeds 280 characters, the node truncates to the last complete sentence that fits under 280. It splits the text by sentence boundaries (`.`, `!`, `?` followed by a space), iterates from longest to shortest, and picks the longest version that fits. If no sentence boundary produces text under 280, it hard-cuts at 277 characters and appends "...". Sets a `truncated: true` flag.
**Why a dedicated Code node:** The AI consistently produces tweets over 280 characters. Rather than adding more emphasis to the prompt (which doesn't reliably work), a deterministic Code node guarantees compliance. The AI writes the best tweet it can; the Code node makes it fit.
**Failure mode:** This is pure string manipulation -- it can't fail unless the input is null, which is caught by upstream validation.

#### "Validate Newsletter Content" (Code node)
**Purpose:** Extracts the SUBJECT line from the AI-generated newsletter, validates the body is between 250-600 words, and checks for a CTA.
**Key configuration:** Subject line extraction looks for a `SUBJECT:` prefix in the first line. Word count uses the same `.split(/\s+/).length` pattern. The 250-600 word range is a soft target -- content slightly outside the range (say, 610 words) gets flagged but not rejected.
**Failure mode:** Missing subject line triggers a regeneration attempt. Word count violations are logged as warnings, not errors.

---

## Data Flow

```
Frontend (React/Tailwind)
    |
    |-- POST /content-submit (raw idea or URL)
    |       |
    |       v
    |   [Workflow 1]
    |       |-- Validate input
    |       |-- Check duplicate (Supabase query)
    |       |-- Extract URL content OR pass raw idea
    |       |-- Save submission record (status: "generating")
    |       |-- Generate Draft 1 -> Validate -> Generate Draft 2 -> Validate -> Generate Draft 3 -> Validate
    |       |-- Update submission (drafts + status: "pending_review")
    |       |-- Return draft previews (200 chars each)
    |       v
    |   Supabase: submissions table updated with 3 drafts
    |
    |-- Frontend polls submission status, displays drafts when ready
    |
    |-- POST /draft-select (submission_id, selected_draft: 1/2/3)
    |       |
    |       v
    |   [Workflow 2]
    |       |-- Validate selection
    |       |-- Fetch submission from Supabase
    |       |-- Validate state (pending_review, not expired)
    |       |-- Lock submission (status: "processing")
    |       |-- Adapt for LinkedIn -> Validate
    |       |-- Adapt for X/Twitter -> Enforce 280 chars
    |       |-- Adapt for Newsletter -> Validate (subject + word count)
    |       |-- Save adapted content to Supabase
    |       |-- Publish or save for scheduling
    |       |-- Update status ("published" or "scheduled")
    |       v
    |   Supabase: adapted_content table populated, submission status updated
    |
    |-- Frontend reads final status and adapted content from Supabase
```

Data never flows directly between the two workflows. Supabase is the only shared state. This means Workflow 1 can complete, n8n can restart, and Workflow 2 still has everything it needs when it triggers later.

---

## Error Handling

### Where failures occur and how they surface

**Input validation failures (Workflow 1, nodes 1-2):** Return 400 immediately with a specific error message. No database writes, no API calls. The frontend displays the error and the manager can fix and resubmit.

**Duplicate detection (Workflow 1, node 4-5):** Return 409 with "This idea was already submitted recently." The manager checks their pending reviews instead of resubmitting.

**URL extraction failures (Workflow 1, nodes 8-9):** If the URL can't be fetched or the content is too thin after extraction, the workflow either falls back to the raw idea (if provided) or returns 422 with "Couldn't extract content from this URL." The manager can resubmit with a raw idea instead.

**AI generation failures (Workflow 1, nodes 13-18):** Each AI call retries 3 times with exponential backoff. If all retries fail, the submission status is set to "error" in Supabase with details about which draft failed. The frontend polls and displays the error. The manager can resubmit -- the 10-minute dedup window allows resubmissions after failures.

**State validation failures (Workflow 2, node 4):** Submission doesn't exist, is in wrong status, or is expired. Returns 400/404/410 with a specific message. No side effects.

**Platform adaptation failures (Workflow 2, nodes 7-12):** Same retry pattern as draft generation. If adaptation fails after retries, the submission goes to error state. Already-adapted content for other platforms is preserved in Supabase for potential manual recovery.

**Publish failures (Workflow 2, nodes 16-18):** Platform API errors (rate limits, auth failures, server errors) trigger retries. After all retries fail, the adapted content is still saved -- it's the publish step that failed, not the content creation. The submission gets an error status with details about which platform failed.

### Error response design

Pre-submission errors (validation failures before a submission ID exists) return just the error message and a suggested fix. Post-submission errors include the `submission_id` so the frontend can track what failed and offer retry options. The frontend handles both patterns.

---

## Duplicate Protection

The system has three layers of duplicate protection, each catching a different failure mode:

### Layer 1: Content hash dedup (Workflow 1)
**What it catches:** Accidental double-submissions (manager clicks Submit twice).
**How it works:** The "Generate Submission ID & Dedup Hash" node creates a hash from the input content. The "Check Duplicate in Supabase" node queries for matching hashes within a 10-minute window. If found, the submission is rejected with 409.
**Why 10 minutes:** Short enough to catch accidental double-clicks, long enough that a manager who intentionally resubmits the same topic the next day isn't blocked.

### Layer 2: Optimistic lock (Workflow 2)
**What it catches:** Duplicate draft selections (double-click on "Select Draft", browser retry on slow response).
**How it works:** The "Lock Submission" node updates status from `pending_review` to `processing`. The second request's "Validate Submission State" node sees `processing` and rejects it.
**Why optimistic:** A pessimistic lock (database-level row lock) would work but adds complexity. For a single-tenant tool with one manager, the optimistic approach is sufficient and simpler to debug.

### Layer 3: Idempotency keys on publish operations (Workflow 2)
**What it catches:** Duplicate publish calls from workflow retries or re-executions.
**How it works:** Every publish operation (LinkedIn, X, newsletter) includes an idempotency key formatted as `{submission_id}-{platform}` (e.g., `sub_abc123-linkedin`). If the same key is sent twice, the platform either deduplicates it or the system checks "was this already published?" before sending.
**Why it matters:** Without idempotency keys, a workflow retry after a timeout could post the same content twice to LinkedIn. The manager wouldn't know until they saw the duplicate on the feed.

---

## Cost Awareness

Every design decision considered API cost:

- **Sequential draft generation** means a failure on Draft 1 doesn't waste tokens on Drafts 2 and 3. Parallel generation would always burn 3x the tokens, even on partial failures.
- **URL extraction is cached in Supabase.** If draft generation fails and the manager resubmits, the extracted content is already in the database. The system doesn't re-fetch and re-extract the URL.
- **Duplicate detection prevents redundant AI calls.** A double-click that would have cost 6+ AI calls (3 drafts + 3 adaptations) is caught at the database query level, which costs nothing.
- **Input validation before any AI calls.** Bad payloads are rejected at the Code node level. A missing field doesn't trigger an AI generation that would fail downstream anyway.
- **SEO rules hardcoded in prompts** rather than fetched from Google Docs at runtime. This eliminates a Google Docs API call per execution. The tradeoff is that prompt updates require manual workflow edits, but for rules that change infrequently, this is the right call.
- **Draft previews (200 chars) returned in webhook response** rather than full drafts. The frontend fetches full drafts from Supabase only when the manager actually wants to read them. This doesn't save AI costs, but it keeps webhook payloads small and responses fast.
- **Token usage is logged per submission** in the Supabase record. The agency can track cost per content piece and identify if certain types of submissions (URLs vs. raw ideas, specific angles) consistently cost more.
