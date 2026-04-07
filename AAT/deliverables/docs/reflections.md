# Engineering Reflections

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-25

---

## How the Approach Evolved

The first version of this system in my head was one big n8n workflow. Content goes in, articles come out the other end, published to three platforms. Simple, linear, done.

That lasted about an hour into actual planning. The problem is the human review step in the middle. A content manager needs to read three drafts and pick one before the system can adapt and publish. That gap between "drafts ready" and "draft selected" could be five minutes or five hours. Keeping a single workflow execution alive for that long in n8n is asking for trouble -- any restart kills the execution, and the submission is gone.

So the system became two workflows. Workflow 1 handles everything up to draft generation and storage. Workflow 2 handles everything from draft selection onward. Supabase sits between them holding the state. This split was the single most important architectural decision in the project. It made the system resilient to n8n restarts, gave each half independent error handling, and made testing dramatically easier (I could test draft generation without needing to test publishing, and vice versa).

The draft generation strategy also changed. My initial plan was to fire three AI calls in parallel -- fast, simple, and most people's instinct. I switched to sequential generation after testing showed that parallel drafts overlapped too much. Three AI calls operating in isolation don't know what each other are saying. They'd produce articles that looked different on the surface but made the same core argument with slightly different wording. Sequential generation with inter-draft context -- where each prompt includes what the previous drafts covered -- produces genuinely distinct articles. The extra 30-45 seconds is invisible when the next step is a human reading three full articles.

I also switched from Airtable to Supabase mid-planning. Airtable was familiar, but Supabase made more sense for three reasons: the frontend needed a database anyway, Supabase's REST API is more predictable from n8n's HTTP Request node (Airtable's native node returns empty output on zero results, which is a pain to handle), and Row Level Security gave me access control without building a separate auth layer. That switch cost a few hours of schema design but saved days of workaround code.

---

## Biggest Challenge

The human-in-the-loop webhook callback pattern. By far.

n8n workflows are built to run start-to-finish. They're not designed for "do some work, wait an unbounded amount of time for a human decision, then do more work." You have to build that yourself.

The core difficulty is state management across the pause. When Workflow 1 finishes generating three drafts, it needs to persist everything -- the submission ID, the source content, the three draft texts, the angles used, metadata -- so that Workflow 2 has full context when it triggers later. If you persist too little, the adaptation step doesn't have what it needs. If you try to pass everything through the webhook callback URL, you're stuffing large content blobs into query parameters, which breaks at any real content length.

I landed on a clean split: Supabase holds all the content and context, the webhook callback carries only the `submission_id` and the `selected_draft` index. Workflow 2 fetches everything it needs from Supabase using the submission ID. This keeps the callback URL small and the state fully recoverable.

Then there's the concurrency problem. If two content ideas are in-flight simultaneously -- one waiting for review, another being adapted -- the system can't mix them up. Unique submission IDs generated at intake time solve this. Every Supabase read and write is scoped to a specific submission ID. Workflow executions don't share mutable state.

And the timeout problem. What if the manager never selects a draft? The state sits in Supabase indefinitely. I added a 72-hour TTL -- the "Validate Submission State" node in Workflow 2 checks `created_at` and rejects expired submissions. This prevents the adaptation pipeline from running on stale, possibly irrelevant content.

The real lesson: any time you put a human decision point inside an automated pipeline, you're building a state machine, not a workflow. n8n doesn't give you a state machine out of the box. You build one yourself with webhooks, external storage, status transitions, and careful ID management.

---

## Trade-offs

### Sequential vs. parallel draft generation
**Chose:** Sequential with inter-draft context.
**Alternative:** Parallel generation (3 simultaneous AI calls).
**Tradeoff:** 30-45 seconds slower. But parallel drafts overlap in angle and argument because each call operates in isolation. Sequential lets each prompt reference what the previous drafts covered, forcing genuine diversity. For a pipeline where the next step is human review (minutes to hours), the extra half-minute is invisible. Sequential also avoids cost waste -- a failed Draft 1 in parallel mode still burns tokens on Drafts 2 and 3.

### Hardcoded SEO/formatting rules vs. fetched at runtime
**Chose:** Hardcoded in prompts.
**Alternative:** Fetch Google Docs containing the rules via API on every execution.
**Tradeoff:** If someone updates the Google Doc, the prompts become stale until manually updated in n8n. But fetching adds a Google Docs API call per execution (latency, cost, and a new failure point). The rules are short and change infrequently. For an agency running 2-3 submissions per day, updating prompts when rules change is a 5-minute manual task. The staleness risk is manageable.

### Polling vs. WebSockets for frontend status updates
**Chose:** Polling with exponential backoff (5s, 10s, capped at 30s).
**Alternative:** Supabase Realtime subscriptions (WebSocket-based).
**Tradeoff:** WebSockets would give instant status updates. But they add a dependency (Supabase Realtime) and complexity (connection management, reconnection logic) for a feature used maybe 2-3 times per day. Polling is simple, reliable, and easy to debug. If the frontend ever needed to support 50 concurrent users watching live status, I'd switch to WebSockets. For one manager, polling is the right call.

### JSONB drafts in submissions table vs. separate drafts table
**Chose:** JSONB column in the submissions table.
**Alternative:** Normalized `drafts` table with one row per draft.
**Tradeoff:** JSONB makes it harder to query individual draft fields (e.g., "find all submissions where Draft 1 has more than 500 words"). But drafts are always read together -- you never query a single draft without its siblings. The update pattern is "write all 3 at once," not "update Draft 2 independently." A separate table would triple the row count for no practical query benefit.

### Permissive RLS vs. strict access control
**Chose:** Permissive RLS (any anon-key holder can read all submissions).
**Alternative:** Team-scoped RLS with a `team_id` column.
**Tradeoff:** This is a single-tenant internal tool for one agency. Adding team-scoped access control would be engineering for a multi-tenant future that may never arrive. If the tool goes multi-tenant, adding `team_id` and scoped policies is straightforward. Not worth the complexity now.

---

## Edge Cases Considered

**Empty payloads and missing fields:** The "Validate Input Payload" node rejects null bodies, missing `rawIdea`/`url` fields, wrong types, and oversized payloads with specific error messages before any downstream processing. This is the cheapest possible failure point -- a Code node returning 400 costs nothing.

**URL extraction failures:** Not every URL is scrapable. Some return 403s, some are paywalled, some need JavaScript rendering. The "Fetch URL Content" node has a 15-second timeout and 3 retries. If extraction still fails, the system checks whether a `rawIdea` was also provided and falls back to it. If the URL was the only input, it returns 422.

**AI meta-commentary in drafts:** The AI sometimes wraps articles in commentary ("Here's your article:", "I hope this meets your requirements"). The "Validate Draft" nodes detect and strip these patterns using regex. The manager sees clean drafts, not AI artifacts.

**Twitter over 280 characters:** LLMs can't count characters reliably. The prompt tells the AI about the 280-char limit, but the "Enforce X Character Limit" Code node is the real enforcement. It truncates at the last sentence boundary under 280 characters. If no sentence fits, it hard-cuts at 277 and adds "...". The `truncated: true` flag lets the frontend signal this to the manager.

**Duplicate submissions:** A content hash compared within a 10-minute window catches double-clicks. The window is short enough to not block intentional resubmissions of the same topic on different days.

**Concurrent draft selections:** The optimistic lock via status transitions (`pending_review` to `processing`) ensures the first selection wins and the second gets rejected. No duplicate adaptation, no duplicate publishing.

**Expired submissions:** The 72-hour TTL in "Validate Submission State" prevents the system from processing stale submissions where the content might no longer be relevant or the drafts might reference outdated information.

**Platform rate limits:** Every publish node retries with exponential backoff on 429 responses. The adapted content is already saved in Supabase before publishing begins, so rate-limited content isn't lost -- it just hasn't been published yet.

---

## What Could Still Break

Being honest about the gaps:

**n8n's single-threaded execution model under high load.** Burst testing showed 90% success at 20 concurrent submissions. That 10% failure rate comes from n8n's execution queue filling up. For an internal tool with 2-3 daily submissions, this is fine. For anything approaching real scale, n8n would need multiple workers or a queue system in front of it.

**The optimistic lock has a small race window.** Between the "Validate Submission State" read and the "Lock Submission" write, there's a gap where a second request could read `pending_review` before the first writes `processing`. In practice, this window is milliseconds and the scenario requires precise timing. For a single-manager tool, the risk is negligible. For a multi-user system, I'd need a database-level conditional update (`UPDATE ... WHERE status = 'pending_review'` returning the updated row count).

**AI output quality is non-deterministic.** The validation nodes catch structural problems (too short, missing title, meta-commentary), but they can't catch a factually wrong article or a tonally inappropriate tweet. The manager is the quality gate for content accuracy. If the AI has a bad day and produces low-quality drafts, the manager's only option is to resubmit and hope for better output.

**No post-adaptation approval gate.** The PRD doesn't require one, but in a real agency, someone should probably review the LinkedIn post and tweet before they go live. Right now, selecting a draft triggers adaptation and (if immediate publish is chosen) publishing without a second human checkpoint. A misadapted tweet goes live automatically.

**External API dependencies are opaque.** If OpenAI changes their response schema, the validation nodes might break. If LinkedIn changes their posting API, publishes fail silently until someone checks. There's no automated health check for external APIs -- failures are only visible when a submission actually fails.

**No cost ceiling.** There's no maximum spend per day or per submission. A bug that causes retry loops could burn through API credits. Token usage is logged, but there's no circuit breaker that says "stop after $X spent today."

---

## Improvements for Production

If this system were going into real production serving a team (not just a prototype), here's what I'd add:

**Monitoring and alerting.** A dashboard showing: submissions per day, success/failure rate, average generation time, token cost per submission, platform publish success rates. Alerts when: error rate exceeds 10%, generation time exceeds 2 minutes, any platform API returns persistent errors.

**Cost tracking with circuit breaker.** Token usage per submission is logged, but I'd add daily and monthly cost aggregation with configurable spending limits. If the daily limit is hit, new submissions queue instead of processing. The manager gets notified that the queue is paused due to cost limits.

**Content versioning.** Right now, rejected drafts are stored but not surfaced. A proper versioning system would let the manager view previous submissions, compare drafts across submissions on the same topic, and potentially re-adapt a previously rejected draft.

**Post-adaptation approval gate.** Before publishing, show the manager the adapted LinkedIn post, tweet, and newsletter side by side. Let them approve, edit, or reject individual platform versions. This adds one more click to the process but prevents embarrassing auto-published content.

**Queue depth indicator.** Pressure testing showed that concurrent submissions degrade response time. The frontend currently shows "Generating..." with no indication of queue position. Adding a simple "3 submissions ahead of yours" message would manage expectations.

**Retry queue for failed publishes.** Currently, a failed publish marks the submission as error. A proper retry queue would hold failed publish jobs and retry them on a schedule (every 5 minutes for the first hour, then hourly). The manager would see "Published to LinkedIn and newsletter. X publish pending retry."

**Scheduled publishing with calendar view.** The "save for scheduling" path exists but lacks a scheduling interface. A calendar view in the frontend where the manager can drag content to specific dates and times would make the scheduling feature actually usable.

**Webhook authentication.** The n8n webhooks are currently open. In production, they'd need API key authentication or signed requests to prevent unauthorized submissions. The frontend would include the key in headers; any request without it gets rejected at the webhook level.
