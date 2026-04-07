# Reflection Questions — Week 5: Lead Generation and Outreach Automation

**Author:** Ayodele Oluwafimidaraayo
**Project:** WK5-LeadGen
**Date:** 2026-04-04

---

## Question 1: In a business setting, what clarifying questions would you ask when assigned this project?

Before writing a single node, I'd need answers to eight things:

**1. How do we define a "good" lead — and who decides?**
The PRD says "founders, operations leads, and agency owners," but that's still wide. Does a 2-person startup count? What about someone who changed roles six months ago and their LinkedIn still shows an old title? I need to know whether the quality bar is set by whoever runs the campaign or if there's a shared rubric. Otherwise I'm optimizing a pipeline for a target nobody agrees on.

**2. What's the acceptable false-positive rate for Bouncer email verification?**
Bouncer returns multiple verdicts: Deliverable, Invalid, Unknown, Accept-All, Disposable, Role-Address. "Unknown" is the gray zone — in my test runs, about 20-30% of leads came back Unknown. Do we send to Unknown addresses? In my implementation, I chose to generate messages for all leads regardless of Bouncer result, because the reviewer might find a better email later and OpenAI generation costs fractions of a cent. But this is a business decision that should come from whoever owns sender reputation.

**3. Do we have existing Apify credits, or do we need to budget for new ones?**
This turned out to be critical. I burned through two Apify accounts during testing — a free plan ($5/month) and an organization Starter plan ($140/month). A single test run with the wrong actor or wrong input format can cost $10+ and return garbage. The budget question isn't theoretical — it directly determines how many test runs you can afford and which Apify actor you should use.

**4. How do we handle leads that already exist in the CRM or a previous Airtable run?**
This is an idempotency question, but it's also a business decision. I built cross-run deduplication that checks by email and LinkedIn URL before creating each lead. But I learned the hard way that the dedup logic has edge cases — when a lead has no email, an empty-string match can falsely flag unrelated leads as duplicates. The business needs to decide: skip all duplicates, update them with fresh data, or only add net-new ones?

**5. Is there a maximum leads-per-run expectation, and what happens to the rest?**
I capped results at 50 per run. The Apify actor can return up to 50,000. Without a cap, a single run could cost $50+ in Apify credits and take hours to process through Bouncer and OpenAI. The cap is a cost control mechanism, but the business should know that overflow leads are discarded, not queued.

**6. What does the AI-generated outreach need to avoid saying?**
I added an industry blocklist (weapons, gambling, adult entertainment, etc.) that skips AI generation entirely. But the business might have additional constraints — competitor names, pricing promises, legal claims. The AI prompt explicitly avoids words like "revolutionary" and "game-changing," but a legal review of the output templates would be smart before sending anything.

**7. Which fields are required for a lead to be "usable," and what's the threshold for discarding it?**
In my implementation, I generate messages for every lead regardless of email status — even leads with Invalid emails get full 3-email sequences. This was a deliberate trade-off: the cost of generating is near zero, and a human reviewer might source a better email. But the business might prefer a stricter filter to reduce noise in the review queue.

**8. What's the expected latency tolerance for a full pipeline run?**
My pipeline takes 15-30 minutes for 50 leads. That includes Apify scraping (2-5 minutes), Bouncer verification (1-2 seconds per lead), and OpenAI generation (2-3 seconds per lead). The bottleneck is processing leads one at a time to respect API rate limits. If the SLA is under 5 minutes, I'd need to parallelize — but that increases complexity and rate limit risk.

---

## Question 2: What was the most significant challenge you faced while building this automation, and what was its root cause?

The hardest challenge was not technical — it was misdiagnosing an external service failure as a code problem.

On April 2nd, the Apify actor suddenly started returning 0 results for every search. The same queries that returned 40+ leads the day before now returned nothing. I spent hours rewriting the Apify input expression — first as an inline IIFE, then as a separate Code node, then switching to a completely different Apify actor. I reimported and restarted the n8n workflow over a dozen times.

The actual problem: a single test run with the wrong body format had cost $10 and pushed the Apify account over its monthly spending limit. Every subsequent run returned 0 results not because the code was wrong, but because the account was broke. I didn't check the account balance until hours later.

The root cause is a diagnostic bias — when something stops working, developers instinctively look at the code they just changed. But the failure had nothing to do with code changes. It was an external dependency (Apify billing) that failed silently. The API returned HTTP 200 with 0 results instead of an error code, which made it look like a search problem, not a billing problem.

The lesson: when an external API suddenly returns empty results after previously working, check the account balance and usage limits before touching the code. A 30-second API call to check billing would have saved hours of unnecessary refactoring.

This lesson extends beyond Apify. Any production system that depends on metered APIs — OpenAI, Bouncer, Twilio, SendGrid — can fail this way. The failure mode isn't an error. It's silence. And silence looks like a bug.

---

## Question 3: If you were to start this project again with your current knowledge, what is the one thing you would do differently?

I'd lock down the Apify actor choice and input format on day one, and never change it mid-project.

I switched actors three times during this project:
1. Started with pipelinelabs PPE actor (`kVYdvNOefemtiDXO5`) — worked but throttled after multiple runs
2. Switched to peakydev actor (`T1XDXWc1L92AfIJtd`) — had a 100-lead monthly cap for free users
3. Switched to code_crafter actor (`IoSHqwTR9YGhzccez`) — different field names, different pricing, different behavior

Each switch required updating the input body format, the output field mapping in the Process and Validate Leads node, and testing the entire pipeline end-to-end. Every switch introduced bugs. The code_crafter actor uses `full_name` and `job_title` instead of `fullName` and `position`. It returns `company_size` as a number instead of a string. Its `company_description` field provides company context that pipelinelabs doesn't have.

If I started over, I would:
1. Pick one actor and commit to it
2. Run 3-5 manual test runs via curl to understand its exact input schema, output format, rate limits, and pricing
3. Build the field mapping once, test it in isolation, then integrate
4. Never switch actors unless the current one is fundamentally broken

The broader lesson: treat external API integrations as contracts. Understand the contract fully before building on top of it. Switching mid-project is expensive because every downstream node depends on the upstream data format.

---

## Question 4: What edge cases did you account for and how did you account for them?

**Empty Apify results.** When the actor returns zero items, the workflow detects this in the Process and Validate Leads node, sets the persona status to "No Results," and exits cleanly. Without this check, the SplitInBatches node would receive an empty array and the persona would stay stuck in "Running" forever.

**Malformed lead data.** Not every lead from Apify has clean fields. Emails might be "n/a" or "none". LinkedIn URLs might point to company pages instead of personal profiles. Website URLs might use dangerous protocols like `javascript:`. The Process node validates all of these before any API calls — email regex plus garbage filter, LinkedIn URL format check with company page detection, URL protocol validation. This happens early, before Bouncer or OpenAI spend.

**Cross-run duplicate leads.** Before inserting any new lead, the workflow queries Airtable for an existing record with a matching email. If no email exists, it falls back to matching by LinkedIn URL. I discovered a bug in this logic: when a lead has no email, the Airtable formula `LOWER({Email})=LOWER('')` matches every record that also has no email — creating false duplicates. I fixed this by wrapping the check in `AND(email != '', ...)` so empty fields don't trigger false matches.

**Personas stuck in "Running."** If the pipeline crashes mid-execution (API timeout, n8n restart, code error), the persona status stays "Running" and the schedule trigger never re-picks it up. I added auto-recovery: the schedule trigger's Airtable query now also finds personas stuck in "Running" for more than 30 minutes and retries them automatically.

**Bouncer API failure.** When Bouncer returns an error (402 Payment Required — out of credits), the workflow catches it, records the raw error response, sets Email Status to "Unknown," and continues the pipeline. Messages still get generated. The lead is flagged but not blocked.

**Thin company context for AI.** When the About page scraper returns less than 50 characters (or nothing), the AI prompt switches to a fallback version that only uses job title, company name, and keywords. The prompt explicitly tells OpenAI not to fabricate company details. The lead is marked with "Limited Context" so the reviewer knows the messaging may be less personalized.

**Prompt injection via scraped content.** Company About text comes from scraped websites. A malicious site could embed text like "Ignore previous instructions." The scraped text is wrapped in `<company_context>` delimiters with an explicit system instruction to treat it as data only. Obvious injection patterns are stripped before reaching the prompt.

**n8n Code node timeout.** The n8n task runner has a default 60-second timeout on Code nodes. With the code_crafter Apify actor (which takes longer than pipelinelabs to return), the Evaluate Apify Status code node would timeout and crash the pipeline. Fixed by setting `N8N_RUNNERS_TASK_TIMEOUT=300` in the shell profile so every n8n start gets a 5-minute timeout.

**Apify billing exhaustion.** The most painful edge case. When the Apify account exceeds its monthly budget, runs complete with HTTP 200 but return 0 results — no error code, no warning. The pipeline processes 0 leads and marks the persona as "No Results" even though the real problem is billing. There's no programmatic fix for this beyond monitoring the account balance before each run, which I didn't implement but would in a production version.
