# Reflection Question Answers

**Builder:** Ayodele Oluwafimidaraayo
**Project:** Content Generation & Publishing Automation for Fetemi Marketing Agency
**Date:** 2026-03-25

---

## 1. In a business setting, what clarifying questions would you ask when assigned this project?

Before writing a single node, I'd need to pin down the things the PRD left open.

**On the content pipeline:**

The PRD says "three article drafts from different angles." Different how? Is there an existing taxonomy the agency uses -- thought leadership, how-to, case study, opinion piece? Or am I defining what counts as a valid angle from scratch? This matters because the entire prompt engineering strategy depends on whether angles are constrained categories or freeform. I ended up defining three specific angles myself (Contrarian, How-To, Data & Trends), but in a real engagement, those would come from the client's content strategy.

The PRD references SEO Best Practices and formatting rules living in external Google Docs. How often do those docs change? If they're updated weekly, I should build a node that fetches them at runtime so the prompts stay current. If they're stable for months, hardcoding them into prompts saves an API call and a failure point per execution. I went with hardcoded because the rules appeared stable, but I'd want the client to confirm that assumption before committing to it.

What's the expected turnaround from idea submission to published content? If the manager needs to review drafts within minutes, the frontend needs aggressive polling or WebSocket subscriptions, and the generation pipeline needs to be fast. If review happens over hours or days, I can use simpler status polling and don't need to optimize generation latency. This affects whether I prioritize speed (parallel generation) or quality (sequential generation with inter-draft context).

**On the human review step:**

Is there an SLA on draft review? If a manager submits an idea on Friday and doesn't select a draft until Monday, should the system remind them? Auto-expire the drafts? Just wait? Without this answer, I had to make my own call -- I went with a 72-hour TTL and expiration, which is reasonable but could easily be wrong for a specific team's workflow.

Can the manager reject all three drafts and request regeneration? The PRD says they "select one to move forward," but doesn't cover the case where all three are bad. That's an additional branch with its own UX, its own error states, and its own cost implications (another 3 AI calls). I didn't build it, but I'd want to know if it's needed.

**On publishing:**

When the PRD says "published immediately or saved for scheduling" -- scheduling to what? Does the agency use Buffer, Hootsuite, native platform scheduling? Or am I building a scheduling queue? That's the difference between a single API integration and an entire scheduling subsystem with a calendar interface. I built "save for later" as a stored state, not a full scheduling system, because the PRD was ambiguous here.

For LinkedIn and X publishing, am I integrating with real platform APIs using OAuth credentials the agency already has? Or generating formatted text for a human to copy-paste? Real API publishing means handling token refresh, rate limits, platform-specific content validation, and error states for each platform. Copy-paste means I just need to format text correctly. The implementation complexity is wildly different.

**On operational boundaries:**

How many submissions per day? If it's 2-3, I don't need to worry about queuing or cost controls. If it's 20+, I need concurrent execution handling, API rate limit management, and spending caps. The system currently handles burst traffic (tested at 20 concurrent), but it isn't designed for sustained high volume.

Who has access? One content manager or a team? If multiple people can submit and review simultaneously, I need multi-user concurrency handling and potentially draft ownership so people don't review each other's submissions by mistake.

---

## 2. What was the most significant challenge you faced while building this automation, and what was its root cause?

The human-in-the-loop draft review step. Specifically, making the automation pause mid-pipeline for an indefinite human decision, then resume cleanly with full context.

The root cause is that n8n workflows are designed to run start-to-finish. They're not built for "generate output, wait an unknown amount of time for a human to act, then continue where you left off." There's no native mechanism for this. You have to split one logical pipeline into two separate execution contexts connected by a shared data store and a callback webhook, and you have to design the state handoff yourself.

Three things made it genuinely difficult:

**State management across the gap.** When Workflow 1 finishes generating three drafts, it needs to persist everything that Workflow 2 will need later -- the submission ID, the source content, the three draft texts, the angles, metadata. The callback webhook from the frontend can't carry all of this. I tried passing the selected draft text directly in the callback payload early on, and it broke immediately because content strings in webhook URLs hit length limits and encoding issues. The solution was to use Supabase as the full state store and have the callback carry only the `submission_id` and `selected_draft` index. Workflow 2 fetches everything else from Supabase.

**Reliable resume with concurrent submissions.** If two content ideas are in-flight simultaneously, the callback system can't mix them up. The submission ID generated at intake time is the key. Every Supabase read, write, and status check is scoped to that ID. A callback with ID "sub_abc123" can only affect the "sub_abc123" row, regardless of what other submissions are doing.

**Timeout and stale state.** Without the 72-hour TTL, submissions that never get reviewed would accumulate in Supabase indefinitely. The "Validate Submission State" node in Workflow 2 checks the creation timestamp and rejects expired submissions. Without this, a manager could trigger adaptation on week-old content that's no longer relevant, and the adapted versions would reference outdated topics.

The takeaway that applies beyond this project: putting a human decision point inside an automated pipeline means you're building a state machine. n8n gives you a workflow engine. The gap between those two things is yours to fill, and it's where most of the engineering complexity lives.

---

## 3. If you were to start this project again with your current knowledge, what is the one thing you would do differently?

I'd build the sequential-with-early-validation draft generation pattern from the start instead of discovering it through failure.

My initial approach was parallel generation -- fire three AI calls simultaneously, collect results, move on. It felt efficient. Why wait for one draft to finish before starting the next? Two problems killed this approach:

**Cost waste on partial failures.** If Draft 1 hits a rate limit or times out, Drafts 2 and 3 are already in flight. I've burned tokens on drafts that can't be used alongside a failed sibling. I need all three drafts to present a complete set to the manager. In testing, I had a run where the third call hit a rate limit -- two good drafts and one error, and the entire set was unusable.

**No diversity between drafts.** Parallel calls operate in isolation. Each AI call gets the same base prompt with a different angle label, but none of them know what the others are writing. The result is three articles that look different superficially but make overlapping arguments. Sequential generation solves this by passing each previous draft's angle summary into the next prompt: "Draft 1 argued X from a contrarian perspective. Draft 2 covered Y as a how-to. Now write Draft 3 as a data-driven analysis that doesn't repeat either angle."

If I started over, I'd structure it as: generate Draft 1, validate it (check word count, format, strip meta-commentary), then generate Draft 2 with Draft 1's context, validate it, then generate Draft 3 with both previous drafts' context, validate it. If any draft fails validation after one retry, the submission goes to error state. Only when all three pass do they get stored and shown to the manager.

The cost is 30-45 extra seconds of total generation time. For a pipeline where the human review step takes minutes to hours, that penalty is invisible. And I skip the scenario where a partial failure wastes the entire generation batch.

I'd also separate URL content extraction from draft generation more cleanly. In the current build, if draft generation fails and the manager resubmits, the URL content extraction runs again. The extracted content should be cached in Supabase the first time, so retries only redo the part that actually failed. I built this eventually, but it would have been cleaner to design it that way from the beginning.

---

## 4. What edge cases did you account for and how did you account for them?

**Empty and malformed input.**
The "Validate Input Payload" node is the first Code node after the webhook. It checks that the request body exists and is non-null, that at least one of `rawIdea` or `url` is present after trimming, that the payload doesn't exceed 1MB, and that inputs are coerced to strings safely. HTML tags in `rawIdea` are stripped to prevent XSS if the content is rendered in the frontend. Error messages are specific: "Either rawIdea or url must be provided" rather than a generic "Bad request." This specificity helps the manager fix the issue on the first try.

**URL extraction failures.**
Not every URL is scrapable. The "Fetch URL Content" node has a 15-second timeout and 3 retries. If extraction fails entirely, the workflow checks whether a `rawIdea` was also provided and falls back to it. If the URL was the only input, it returns 422 with a message suggesting the manager submit a raw idea instead. The "Extract Text from URL Response" node also handles thin content -- if the extracted text is under 100 characters after stripping HTML, it treats the extraction as failed rather than sending garbage to the AI.

**Duplicate submissions.**
The "Generate Submission ID & Dedup Hash" node creates a content hash, and "Check Duplicate in Supabase" looks for that hash within a 10-minute window. This catches the most common scenario: manager clicks Submit, doesn't see a response fast enough, clicks again. The 10-minute window is intentional -- it catches accidental double-clicks without blocking legitimate resubmissions of the same topic on a different day.

**AI generation failures.**
Each AI call retries 3 times with exponential backoff. If all retries fail, the submission goes to error state in Supabase with details about which draft failed. Partial draft sets are never shown -- if Draft 2 fails, the manager doesn't see Drafts 1 and 3 without a missing sibling. That would be a confusing experience.

**AI meta-commentary in output.**
The "Validate Draft" nodes detect and strip common AI preambles and postscripts ("Here's your article:", "I hope this helps", "Let me know if you'd like any changes"). The manager sees clean article content, not AI conversation artifacts.

**Twitter character overflow.**
The "Enforce X Character Limit" Code node runs after AI generation and hard-checks character count. If over 280, it truncates to the last complete sentence under 280 characters. If no sentence boundary exists under 280, it cuts at 277 and appends "...". A `truncated: true` flag lets the frontend indicate the post was adjusted. This deterministic enforcement is necessary because LLMs don't count characters accurately despite being told the limit.

**Expired submissions.**
The "Validate Submission State" node checks a 72-hour TTL. Submissions older than 72 hours without a selection get rejected with "This submission has expired." This prevents processing stale content and keeps the database from accumulating orphaned records that no one will ever review.

**Concurrent draft selections.**
The optimistic lock pattern handles this. "Lock Submission" updates the status from `pending_review` to `processing`. A second request hitting "Validate Submission State" sees `processing` instead of `pending_review` and gets rejected. First request wins. This prevents duplicate adaptation and duplicate publishing from a double-click or browser retry.

**Platform API rate limits.**
Every publish node (LinkedIn, X, newsletter) retries with exponential backoff on 429 responses. Adapted content is already saved in Supabase before any publish attempt, so rate-limited content isn't lost. The manager gets notified that publishing is delayed, and the content can be manually published or retried later.

**Stale webhook callbacks.**
If a manager clicks a draft selection link days after generation, the submission might have expired. "Validate Submission State" catches this with the TTL check and the status check (already processed submissions have status `published` or `scheduled`, not `pending_review`). The response tells the manager exactly what happened: expired, already processed, or not found.
