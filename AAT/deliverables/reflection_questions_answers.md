# Reflection Question Answers

**Builder:** Ayodele Oluwafimidaraayo
**Project:** Content Generation & Publishing Automation for Fetemi Marketing Agency
**Date:** 2026-03-25

---

## 1. In a business setting, what clarifying questions would you ask when assigned this project?

Before touching n8n, I'd need answers to these:

**On the content pipeline itself:**
- When the PRD says "3 article drafts from different angles" — who defines what counts as a valid angle? Is there a taxonomy the team already uses (e.g., thought leadership vs. how-to vs. data-driven), or am I designing that classification from scratch? This matters because the AI prompt engineering is completely different depending on whether angles are freeform or constrained.
- The PRD mentions SEO Best Practices and predefined formatting rules living in Google Docs. Are those documents stable, or do they get updated frequently? If they change often, I need to decide whether to hardcode the rules into prompts or build a node that fetches them dynamically — and each choice has real cost and maintenance implications.
- What's the expected turnaround time from idea submission to published content? If the manager is supposed to review drafts within minutes, the webhook callback pattern needs to be tight and the frontend needs to poll or subscribe. If review happens over hours or days, I can use a simpler queue-and-wait approach and store state in a database rather than keeping the workflow execution alive.

**On the human-in-the-loop review step:**
- Does the manager review drafts on their own schedule, or is there an SLA? This directly affects whether I need timeout handling. If a manager submits an idea and then goes on holiday without selecting a draft, the system needs to know what to do — expire the drafts, send a reminder, or just wait indefinitely.
- Can a manager reject all three drafts and request regeneration? The PRD says they "select one to move forward," but it doesn't say what happens if none of them are good enough. That's a whole additional branch in the workflow.

**On publishing:**
- "Published immediately or saved for scheduling" — scheduling to what? Does Fetemi already use a scheduling tool like Buffer, Hootsuite, or native platform scheduling? Or am I building the scheduling queue myself? This is the difference between one integration node and an entire scheduling subsystem.
- For LinkedIn and X publishing, am I posting through official APIs with OAuth credentials the agency already has, or am I generating the formatted text and dropping it somewhere for a human to copy-paste? Real API publishing means I need to handle token refresh, rate limits, and platform-specific content validation. Copy-paste means I just need to format text correctly.
- Does the email newsletter go through an ESP like Mailchimp or ConvertKit, or is this a direct send? The integration complexity is wildly different.

**On operational boundaries:**
- How many content submissions per day should the system handle? If it's 2-3, I don't need to worry much about queuing or rate limiting. If it's 20+, I need to think about concurrent AI generation calls, API rate limits, and cost controls.
- Who has access to the frontend? Just one content manager, or a team? If multiple people can submit simultaneously, I need to handle concurrent submissions and make sure draft reviews don't get crossed.

---

## 2. What was the most significant challenge you faced while building this automation, and what was its root cause?

The hardest part was the human-in-the-loop draft review step — specifically, making the workflow pause mid-execution while the manager reviews three drafts, then resume cleanly when they pick one.

The root cause is that n8n workflows are designed to run start-to-finish. They're not naturally built for "generate some output, wait an indefinite amount of time for a human decision, then continue." You essentially have to split what feels like one logical pipeline into two separate execution contexts connected by a callback mechanism.

Here's what made it genuinely difficult:

**State management across the pause.** When the manager submits an idea and three drafts are generated, I need to persist those drafts plus the original submission context somewhere — the submission ID, the source URL or raw idea, the generated drafts, metadata. Then when the manager selects a draft via the frontend, the callback webhook needs to carry enough information to reconstruct the full context for the second half of the pipeline. If I store too little, the adaptation step doesn't have what it needs. If I store too much in the webhook payload, I'm passing large content blobs through URLs, which is fragile.

I ended up using a database (in my case, a simple data store keyed by submission ID) to hold the full state between the two halves. The webhook callback only carries the submission ID and the selected draft index. The second-half workflow fetches the full state from the store. This keeps the callback clean and the state recoverable.

**Handling the resume reliably.** The webhook that receives the manager's selection has to trigger the right downstream logic for the right submission. If two content ideas are in-flight simultaneously — one waiting for review, another being adapted — the system can't mix them up. I used unique submission IDs generated at intake time and validated them on the callback side. If a callback comes in with an ID that doesn't match any pending submission, it returns an error instead of silently proceeding with bad data.

**Timeout and stale state.** What happens if the manager never selects a draft? The state sits in the store forever. I added a TTL concept — submissions older than 72 hours without a selection get flagged, and the system can send a reminder or auto-expire them. Without this, the data store would accumulate orphaned submissions indefinitely.

The real lesson: any time you introduce a human decision point into an automated pipeline, you're no longer building a workflow — you're building a state machine. And n8n doesn't give you a state machine out of the box, so you have to build one yourself with webhooks, external storage, and careful ID management.

---

## 3. If you were to start this project again with your current knowledge, what is the one thing you would do differently?

I'd restructure the content generation step to be sequential-with-early-validation instead of parallel-and-hope-for-the-best.

In my initial approach, I fired off three AI generation calls in parallel to produce the three article drafts. It felt efficient — why wait for one to finish before starting the next? But this created problems:

**Cost waste on failure.** If the first draft comes back malformed or the AI returns an error (rate limit, timeout, content filter), the other two calls are already in flight. I've burned tokens and API calls on drafts that might not even be usable alongside a failed sibling. In one test, the AI hit a rate limit on the third call, so I had two good drafts and one error — and the whole set was unusable because the manager needs to choose from three.

**No learning between calls.** When generating drafts in parallel, each call operates in isolation. If I generate them sequentially, I can pass the previous draft summaries into the next prompt as context: "You've already covered angles X and Y, now take angle Z." This produces more genuinely distinct drafts rather than three variations that accidentally overlap.

If I started over, I'd generate drafts one at a time. After each generation, I'd validate the output — check it's not empty, check it meets minimum length, check the format matches what the frontend expects. If a generation fails, I'd retry that specific draft (up to 2 retries) before moving to the next. Only if all three pass validation do I persist them and notify the manager.

Yes, this is slower. Three sequential AI calls plus validation add maybe 30-45 seconds compared to parallel. But for a content pipeline where the next step is a human reviewing drafts (which takes minutes to hours), that extra half-minute is invisible. And I avoid the scenario where a partial failure wastes the entire generation batch.

I'd also cache the source material extraction separately from the generation step. In my current build, if draft generation fails and I need to retry the whole thing, I re-extract the URL content too. That's wasteful. Separating extraction into its own step with cached output means retries only redo the part that actually failed.

---

## 4. What edge cases did you account for and how did you account for them?

**Empty or null inputs at submission.**
The frontend form could submit with both the raw idea and URL fields blank, or with whitespace-only content. I added an input validation node right after the webhook trigger that checks: is at least one of `rawIdea` or `url` present and non-empty after trimming? If both are missing, the workflow returns a 400 response immediately with a clear error message. No AI calls get wasted on garbage input.

**URL extraction failures.**
Not every URL is scrapable. Some return 403s, some are paywalled, some are SPAs that need JavaScript rendering. I wrapped the HTTP Request node for URL fetching in an error handler. If extraction fails (non-200 status, empty body, timeout after 15 seconds), the workflow checks whether a raw idea was also provided. If yes, it falls back to the raw idea and logs that URL extraction failed. If the URL was the only input, it returns an error to the frontend: "Couldn't extract content from this URL. Try submitting a raw idea instead." This avoids a silent failure where the system tries to generate articles from an empty string.

**AI generation failures.**
Each AI call (draft generation, platform adaptation) has error handling that catches HTTP errors, timeouts, and empty responses. For draft generation specifically, if any of the three drafts fails after retries, the system doesn't present a partial set to the manager. It reports which draft(s) failed and asks for a retry of the full set. Partial draft sets would create a confusing UX where the manager has to choose from fewer options without understanding why.

**Duplicate submissions.**
If a manager accidentally clicks "Submit" twice, I don't want two identical content pipelines running. I generate a hash from the input content (raw idea text or URL) combined with a date window. If the same hash appears within a 10-minute window, the second submission gets rejected with a message: "This idea was already submitted. Check your pending reviews." This is simple deduplication — not bulletproof, but it catches the most common accidental double-click scenario.

**Malformed AI output.**
The AI doesn't always return content in the expected format. Sometimes it wraps the article in extra commentary ("Here's your article:"), sometimes it returns markdown when I expected plain text, sometimes it truncates. After each generation call, I run the output through a validation and cleanup step: strip leading/trailing meta-commentary, verify minimum word count (I set 300 words as the floor for articles), and check that required sections exist (title, body at minimum). If validation fails, the draft gets regenerated with a more explicit prompt.

**Twitter/X character limit.**
X posts have a 280-character limit, but the adapted content might exceed that. The platform adaptation prompt specifies the limit, but AI models don't count characters reliably. After generating the X adaptation, I have a Code node that checks character count. If it exceeds 280, it truncates to the last complete sentence under 280 characters. If no complete sentence fits, it takes the first 277 characters and appends "..." — not ideal, but it prevents a publishing API call from failing due to length.

**LinkedIn and newsletter content size.**
LinkedIn posts have a ~3,000 character limit. Newsletter content doesn't have a hard platform limit but excessively long emails hurt engagement. I set soft limits — 2,800 characters for LinkedIn (with buffer), 1,500 words for newsletter — and truncate with a "Read more" link back to the full article if needed.

**Platform API rate limits.**
LinkedIn and X APIs have rate limits that vary by endpoint. If the publish call returns a 429 (rate limited), the error handler catches it and schedules a retry after the `Retry-After` header value (or a default 60-second backoff). The content gets queued for retry rather than dropped. If publishing was supposed to be immediate, the manager gets notified that publishing is delayed due to rate limiting.

**Stale webhook callbacks.**
If a manager clicks a draft selection link hours or days after it was generated, the submission state might have been cleaned up. The callback webhook validates that the submission ID still exists in the data store before proceeding. If it's gone (expired or already processed), it returns a clear message: "This submission has expired or was already processed." This prevents the second half of the pipeline from running with missing context.

**Concurrent draft selections.**
If the manager somehow triggers two selection callbacks for the same submission (double-click, browser retry), I use a simple locking mechanism — once a selection is recorded for a submission ID, subsequent selections for the same ID are rejected. First write wins. This prevents duplicate adaptation and publishing runs for the same content.
