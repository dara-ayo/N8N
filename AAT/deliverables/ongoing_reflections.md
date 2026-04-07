# Ongoing Reflections

**Builder:** Ayodele Oluwafimidaraayo
**Project:** Content Generation & Publishing Automation — Fetemi Marketing Agency
**Started:** 2026-03-25

---

## Entry 1: Initial Architecture Thinking

### The hardest parts of this build

**The two-phase workflow split.** This system isn't one workflow — it's at least two, stitched together by a webhook callback and shared state. Phase one: intake, URL extraction, draft generation. Phase two: draft selection, platform adaptation, publishing. The gap between them is unbounded time (a human reviewing drafts). n8n doesn't have native support for long-running workflow pauses, so I need to design the handoff myself. The state store between phases is the single most critical piece of infrastructure in this entire build. If it breaks, both halves of the pipeline are useless.

**Prompt engineering that actually produces distinct drafts.** The PRD says "three drafts from different angles." Getting an LLM to produce three outputs that are genuinely different — not just rephrased versions of the same argument — requires careful prompting. I'll likely need to define the angle taxonomy myself (e.g., contrarian take, practical how-to, data/trend-driven analysis) and inject the angle explicitly into each prompt. Letting the AI "choose" three angles will produce mush.

**Platform adaptation fidelity.** Turning a 1,200-word article into a 280-character tweet that preserves the core message isn't summarization — it's a different writing task entirely. The formatting rules doc from Fetemi presumably defines the tone and structure for each platform, but the AI will need very specific instructions to produce output that doesn't feel like a lazy summary. This is where prompt iteration will eat the most time.

### Architectural decisions I'm leaning toward

**Separate workflows connected by webhook, not one monolith.** I could technically build this as a single workflow with a "Wait" node, but that keeps an execution hanging in n8n's memory for however long the manager takes to review. If n8n restarts, that execution might die. Separate workflows are more resilient — the first completes fully after persisting state, the second triggers fresh from the callback. Each workflow has its own error handling, its own retry logic, and its own execution logs.

**A lightweight data store (Airtable or a simple JSON store) as the state bridge.** I need somewhere to put submission context between the two workflow phases. I've worked with Airtable in previous n8n projects and know its quirks — the native node can return empty output on zero results, and HTTP Request nodes are more predictable. I'll probably use HTTP Request nodes with the Airtable API directly so I can handle empty states explicitly. Each submission gets a row with: ID, input type (URL vs. raw idea), extracted content, three draft texts, selection status, timestamps.

**Input validation as the very first node after the trigger.** Not after extraction, not after any processing — immediately. If the input is bad, I want to reject it before anything else runs. This saves API calls, keeps the data store clean, and gives the user instant feedback. The validation node checks for presence of at least one input field, trims whitespace, and verifies URL format if a URL is provided (basic regex — starts with http/https, has a domain).

**Sequential draft generation with inter-draft context.** I know parallel generation is faster, but I want each draft to know what angles the previous drafts took. Draft 2's prompt includes a summary of Draft 1's angle. Draft 3's prompt includes summaries of both. This forces genuine diversity. The latency penalty is acceptable because the next step is human review, not another automated process.

**Idempotency keys on all external writes.** Every publish action (LinkedIn post, X tweet, newsletter send) should carry an idempotency key derived from the submission ID plus the platform name. If a retry fires or the workflow re-executes, the platform either deduplicates the request or I can check "was this already published?" before sending. This is the difference between a minor hiccup and accidentally posting the same content three times.

### Risks the PRD doesn't address

**No mention of content approval beyond draft selection.** The manager selects a draft, and the system adapts it for three platforms. But does anyone review the adapted versions before they go live? If the AI produces a LinkedIn post with a weird tone or a tweet that cuts off mid-thought, it gets published without a second look. In a real agency setting, there should probably be a second approval checkpoint after platform adaptation. I might build this as an optional gate — the adapted content gets shown in the frontend for a quick approve/reject before publishing.

**No rollback or unpublish mechanism.** Once content is published to LinkedIn, X, or a newsletter, there's no automated way to pull it back. The PRD treats publishing as a terminal action. In practice, agencies sometimes need to retract content (factual error, client disapproval, PR issue). I can't automate unpublishing across platforms easily, but I should at least log what was published where and when, so a human can manually intervene with full context.

**The SEO rules and formatting rules live in external Google Docs.** If someone edits those docs, the AI prompts that reference them become stale. The PRD doesn't define a sync mechanism. I have two options: (a) hardcode the rules into prompts and accept they'll drift from the docs over time, or (b) fetch the docs at runtime via the Google Docs API and inject their content into prompts. Option (b) is more correct but adds API calls, latency, and a failure point to every execution. I'm leaning toward (b) with aggressive caching — fetch once per day, store locally, use the cached version for all executions that day.

**No content versioning.** The system generates drafts, the manager picks one, it gets adapted and published. But what if the manager wants to go back to a previous version? Or compare how the same idea was adapted last time? There's no version history in the PRD. I'll keep all generated content (including rejected drafts) in the data store with timestamps, which gives basic versioning even if the frontend doesn't expose it yet.

**Token cost accumulation is invisible.** The PRD doesn't mention budget or cost tracking. Each submission triggers at minimum: 3 draft generation calls, 3 platform adaptation calls, and possibly a URL extraction + summarization call. That's 6-7 AI calls per submission. At scale, this adds up. I want to log token usage per submission so the agency can track cost per piece of content. Not a blocker for the build, but critical for production viability.

**The Antigravity frontend is a black box to me right now.** The PRD says the frontend is built with Antigravity, but I don't know its capabilities or constraints. Can it handle real-time status updates (websockets)? Or is it polling-based? Does it support rich text preview for the adapted content? These questions affect how I design the webhook responses and what metadata I include in the state store for the frontend to display.

---

## Entry 2: Implementation Decisions (Phase 2 Complete)

### Chose Supabase over Airtable for state management
I initially leaned toward Airtable because of prior experience, but switched to Supabase for three reasons: (1) the frontend needs a database anyway for direct queries, (2) Supabase's REST API plays nicer with n8n's HTTP Request node than Airtable's (no empty-result surprises), (3) Row Level Security gives me real access control for the frontend without building a separate auth layer.

### Hardcoded SEO and formatting rules into prompts instead of fetching at runtime
I went with option (a) from Entry 1. Fetching Google Docs on every execution adds a failure point and 2-3 seconds of latency per request. The rules are short and stable. If they change, updating the prompts in n8n is a 5-minute task. The tradeoff: if someone updates the Google Doc and forgets to update the workflow, the rules drift. For an agency with 2-3 content submissions per day, that risk is manageable.

### The optimistic lock pattern worked well for draft selection
The status transition (pending_review → processing → published/scheduled) acts as a simple state machine. The "processing" state serves double duty: it prevents duplicate selections AND signals to the frontend that adaptation is in progress. One status field doing two jobs — sometimes simplicity wins.

### Error response design was trickier than expected
I wanted every error response to include the submission_id so the frontend could track what failed. But for validation errors (before a submission exists), there's no ID to return. I ended up with two error response patterns: pre-submission errors return just the error message and a suggested fix, post-submission errors include the submission_id plus the error. The frontend needs to handle both.

### Platform adaptation is the weakest link
The AI does a decent job with LinkedIn (PAS format is well-structured) and newsletter (longer format gives more room). But X/Twitter is consistently problematic — the 280-char limit means almost every AI response needs hard truncation. The sentence-boundary truncation helps, but sometimes the truncated tweet loses its punch. In production, I'd want the manager to see the adapted content before publishing — which the PRD doesn't require but should.

---

## Entry 3: Frontend and Database Decisions (Phase 5 Complete)

### Supabase schema was simpler than expected
I debated normalizing drafts into their own table (one row per draft) vs storing them as JSONB in the submissions table. Went with JSONB because: (a) drafts are always read together (you never query a single draft without its siblings), (b) the update pattern is "write all 3 at once" not "update draft 2 independently", (c) a separate drafts table would triple the row count for no query benefit. The tradeoff: JSONB makes it harder to query individual draft fields (e.g., "find all submissions where draft 1 has more than 500 words"). But we don't need that query pattern.

### RLS is permissive by design
The RLS policies allow any anon-key holder to read all submissions. This is intentional — this is a single-tenant internal tool for one agency. If it ever became multi-tenant, I'd need to add a `team_id` column and scope RLS policies per team. Not worth the complexity now.

### The frontend polling pattern for status updates
I considered three options: (a) websockets via Supabase realtime, (b) polling every N seconds, (c) long polling. Went with simple polling (option b) with exponential backoff: start at 5s, increase to 10s, cap at 30s. Websockets would be cleaner but add a dependency (Supabase realtime subscription) and complexity for a feature that's used infrequently (a manager submits maybe 2-3 times a day). The polling approach is "good enough" and dead simple to debug.

### Pressure testing revealed the real production gaps
The burst and sustained load tests confirmed what I suspected: the system doesn't crash under load, but it degrades in ways the frontend can't communicate. A submission that normally gets drafts in 40 seconds might take 3 minutes when 10 others are in the queue. The frontend shows "Generating..." the whole time with no queue position. For an internal tool with 2-3 users, this is acceptable. For anything larger, I'd need a queue depth indicator.
