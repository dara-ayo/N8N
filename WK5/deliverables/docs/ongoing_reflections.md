# Ongoing Reflections — WK5 Lead Gen Pipeline

**Author:** Ayodele Oluwafimidaraayo
**Last updated:** 2026-03-29

---

## Why Airtable webhooks didn't make it and the status field trigger did

I spent longer than I expected on this decision. The obvious starting point is a form submission — someone fills in a persona, hits submit, and the workflow kicks off. Clean, event-driven, no polling. But that model breaks down the moment you want any flexibility in the input process. What if the team wants to draft a persona, save it, tweak the keywords, come back tomorrow, and only then say "okay, go"? A form trigger fires the moment the record is created. You can't stage it.

The status field approach solves this gracefully. The record can sit in "Draft" for as long as needed. When someone is confident in the inputs, they flip it to "Ready" and that's the signal. It mirrors how real operations teams actually work — there's a review step before anything expensive runs. Burning Apify credits on a half-formed persona is exactly the kind of waste that kills trust in automation tools.

Raw Airtable webhooks were on the table too, but they come with reliability concerns that polling doesn't. Webhooks can be silently dropped, delayed by minutes, or fire twice due to infrastructure hiccups on Airtable's end. n8n's built-in Airtable polling trigger is a lot more predictable in practice. Yes, there's latency — polling every 2 minutes means up to a 2-minute delay from "Ready" to "pipeline running." For a tool like this where leads are being generated for async human review, that's completely acceptable. If this were a real-time user-facing product I'd feel differently, but it's not.

---

## Synchronous vs async Apify polling — why a Wait node beats a webhook callback here

This debate took me a while to land on, and I think the answer is context-specific enough to be worth writing down.

The theoretically "correct" architecture for async jobs is: trigger the job, register a callback URL, and let the job notify you when it's done. Apify does support webhooks on actor runs. So why not use them?

The problem is state. If I fire an Apify run and register a webhook, the n8n execution that triggered the run has to terminate. The webhook hits a separate n8n webhook node, which starts a brand new execution with no memory of the original persona context, the run ID, or anything else. I'd have to reconstruct all of that from the webhook payload or store it somewhere externally. That's a lot of wiring for what is fundamentally a "wait for this thing to finish" problem.

Polling with a Wait node keeps everything in a single execution context. The persona data, the run ID, the lead accumulator — it's all right there in the flow. The Wait node pauses execution for a defined interval without blocking n8n workers, then resumes from exactly where it left off. On a well-behaved Apify run (under 5 minutes), this results in a self-contained execution with linear, readable state. Debugging is dramatically simpler.

The tradeoff is that n8n workflow executions have a timeout. If Apify takes longer than expected and the polling loop runs too many times, the execution could theoretically time out. The mitigation is straightforward: cap the polling loop at a sensible number of attempts (say, 15 attempts at 30-second intervals = 7.5 minutes max) and exit with a structured "timeout" error if the run hasn't completed. In practice, Apify actor runs for a bounded persona query finish well within that window.

---

## The idempotency ordering: why email first, LinkedIn URL second

Checking for duplicates by email address before LinkedIn URL seems obvious, but the reasoning is worth being explicit about.

Email is the output we actually care about for outreach. It's also the field most likely to be globally unique — two people at different companies can have the same LinkedIn URL pattern (both named "john-smith-123") but they can't have the same email. Email is a better primary key for this use case than any other field Apify returns.

LinkedIn URL as a fallback exists for cases where the email is absent from the Apify results but we still want to catch a lead we've seen before under a slightly different data shape. It's also useful for company-level dedup: if we've already scraped a company via a different persona run, the LinkedIn company page URL will match even if the contact person is different.

The ordering matters in a subtle way. If I checked LinkedIn URL first and email second, I'd potentially skip a valid new contact at a company we've seen before. That's too aggressive. By checking email first, I'm deduplicating at the person level, not the company level. LinkedIn URL as a fallback is a soft guard for the "no email present" edge case, not the primary identity check.

---

## Graceful degradation — what happens when things go wrong at each layer

One thing I wanted to get right was that failures at one layer shouldn't cascade into failures everywhere downstream. The pipeline needed to be something like fault-tolerant at each boundary.

When website scraping fails — 4xx, timeout, bot block — the lead doesn't die. Website data is enrichment, not a blocker. The About text field just ends up empty or with a "blocked" note, and the AI generation step uses the fallback prompt. The reviewer can see from the website_status field exactly what happened. A dead website also often tells you something useful on its own: if the company's site is returning 404, that's a signal worth surfacing rather than hiding.

When Bouncer is inconclusive — the "unknown" verdict — I made a deliberate choice to keep the lead moving rather than parking it. The reasoning is that Bouncer's "unknown" isn't the same as "bad." It often just means the mail server is configured in a way that prevents pre-verification (many enterprise mail setups). Blocking AI generation for unknowns would mean potentially discarding a significant chunk of the list for no good reason. Better to generate the content, flag the lead clearly, and let a human make the call about whether to send.

When LinkedIn lookup fails — profile not found, 403, rate limit — the LinkedIn URL field is marked with the failure reason and the pipeline moves on. LinkedIn data in this context is mostly used for verification (does this person exist where they claim to exist?) and optionally for enrichment. If the profile's inaccessible, that's a yellow flag but not a blocker. The email is still there, the company About text is probably there, and the AI can still generate something useful.

The mental model I kept returning to was: any single data point failing should degrade quality, not kill the lead.

---

## What made the AI prompt actually work

The first version of the AI generation prompt produced content that was technically correct but unmistakably generic. "Hi [Name], I noticed [Company] is doing interesting work in [space]..." — exactly the kind of thing that gets deleted without being read.

The difference came from two changes that seem small but aren't.

First: I stopped asking the AI to "write a personalized email." That instruction is too abstract. I started giving it a very specific role and a very specific constraint — something like "You are writing on behalf of a founder who runs an AI automation agency. You have one job: make [Name] feel like this email was written specifically for what [Company] is working on, based only on what is in the provided context." Specificity in the persona instruction changed the register of the output substantially.

Second: I changed how the About text was incorporated. In the early prompt version, the About text was just appended at the end as a note. The AI treated it as an afterthought. In the final version, the About text comes first, framed as the source of truth, and the email instructions explicitly say: "Reference at least one specific detail from the company context below." That single constraint forced the model to actually use the content rather than pattern-match to a generic cold email template.

The LinkedIn message was easier once the email prompt was working, because I could reuse the context framing and just constrain the output to a single paragraph under 300 characters.

---

## Cost awareness: when to skip steps

Not every lead needs every step, and I thought carefully about where the cost gates should go.

Apify scraping is the most expensive step — both in terms of compute credits and wall-clock time. The only lever I have there is capping the number of results per run. I set this at 50 leads per persona run, which gives a useful working set without burning through a free-tier account in one execution. If a persona comes back with 200+ results, I process the first 50 and log a warning. The team can re-run with more specific parameters if they want different coverage.

Bouncer verification costs money per check. I skip the API call entirely if the email address fails basic format validation — no `@`, no domain, clearly garbage data. This is a free check in a Code node and it means I never pay to verify something that couldn't possibly be a real address. I also skip Bouncer if the website verification came back as "dead" — a lead with a dead company website and an unverified email is low enough signal that burning a Bouncer credit on it isn't justified.

Apify website scraping for the About text is skippable when the scraper returned enough company context directly (some Apify lead scrapers include a company description in the main dataset). If that field is already populated and over 100 characters, I skip the About-page scrape entirely. Re-scraping something we already have is pure waste.

AI generation is comparatively cheap, so I don't skip it based on cost. The only case where I skip it is when the lead is so incomplete (no email, no company name, nothing to work with) that any generated content would be unusable.

---

## What I'd add if this ran in production for 3 months

Three months of real usage would surface things that aren't visible in test runs, and I've been thinking about what I'd want to layer in.

The first thing is a Slack alert on pipeline failures. Right now, a failed persona run sets a status field in Airtable. That's fine if someone checks regularly, but in a busy team it'll get missed. A Slack message to a #lead-gen-alerts channel when a persona run fails — with the persona name, the failure stage, and the error message — means someone will actually see it within the hour rather than discovering it days later.

The second is a quality dashboard. After three months you'd have hundreds of leads across dozens of persona runs, and you'd start to see patterns: certain persona types have low email deliverability rates, certain keywords consistently return thin About text, certain geographies have higher Bouncer "unknown" rates. Right now none of that is surfaced anywhere. A simple Airtable view that aggregates lead quality metrics by persona would let the team optimize their inputs based on real data rather than intuition.

The third — and this is the one I think about most — is a feedback loop from sales on message quality. Right now the AI generates outreach and it goes into Airtable for human review. But there's no mechanism for the team to signal which messages actually got responses. Without that signal, the AI prompt can't improve. I'd want to add a "Message Result" field to the Leads table (Sent, Replied, Bounced, No Send) that salespeople can fill in, and then periodically feed that data back into a prompt refinement process. Even manually reviewing which messages worked and updating the prompt based on patterns would compound significantly over time.

None of this is in scope for the current build, but these are the things that turn a useful tool into an actually trusted one.
