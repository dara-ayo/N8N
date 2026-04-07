# Week 5 Presentation: Lead Generation & Outreach Automation
**Presenter:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-29
**Duration:** 5–8 minutes

---

## Slide 1 — Who I Am & What I Built

**Content:**

- **Ayodele Oluwafimidaraayo** — Week 5: Lead Generation & Outreach Automation
- Replaced a 3-hour manual outreach process with a 15-minute automated pipeline
- Input: four fields in Airtable (job title, location, company size, keywords)
- Output: validated leads with a 3-step cold email sequence and a LinkedIn message, ready for review
- Stack: Airtable → n8n → Apify → Bouncer → OpenAI → back to Airtable
- 78 nodes, 34 test cases, 26 passing

**Speaker Notes:**

Hi, I'm Ayodele. This week I built a lead generation and outreach automation. The pitch is simple: you fill in four fields in Airtable, set a status to "Ready to Run," and by the time you come back, you have a table full of validated leads each with a personalized 3-step email sequence and a LinkedIn message, all written with context about that company. I want to walk you through the problem this solves, how I built it, what breaks, and what I'd do differently.

---

## Slide 2 — The Business Problem

**Content:**

- The manual process for one lead:
  1. Define persona
  2. Search LinkedIn for matching profiles
  3. Research the company (find About page, read it)
  4. Validate the email address
  5. Write a cold email sequence from scratch
- Time cost: ~15 minutes per lead
- For 50 leads: **12.5 hours of manual work per campaign**
- That's a full two business days — before you've sent a single message
- This process doesn't scale, and it doesn't repeat well

**Speaker Notes:**

Before you can even think about sending a campaign, someone has to do this work for every single lead. Define who you're targeting. Go find them on LinkedIn. Go read their company website. Verify the email actually works. Then sit down and write something that doesn't sound like a template. For one lead, fifteen minutes is annoying. For fifty leads, it's two full days of work that resets every time you run a new campaign. That's the problem. It's not that the task is hard — it's that it's completely repetitive, and repetitive work is exactly what automation is for.

---

## Slide 3 — The Solution Architecture

**Content:**

```
[Airtable: Target Personas]
  User sets Status = "Ready to Run"
         |
         v
[n8n Webhook Trigger]
  Re-reads record, validates inputs, checks for duplicate runs
         |
         v
[Apify: Lead Scraper]
  Async job -- polls every 15s until SUCCEEDED (up to 5 min)
         |
         v
[n8n: Dedup + Airtable Insert]
  Email-first, LinkedIn URL fallback dedup check
         |
         v
[Apify: Company About Scraper]
  Tries website first, falls back to LinkedIn
         |
         v
[Bouncer: Email Validation]
  Skipped for malformed or missing emails
         |
         v
[OpenAI: Message Generation]
  Full context prompt vs. fallback prompt based on about text quality
         |
         v
[Airtable: Leads Table]
  Complete record: 3 emails + LinkedIn message + all statuses
```

**Why each tool:**
- **Airtable** — human-readable input/output, no ops overhead, one base for everything
- **n8n** — stateful workflow orchestration with built-in retry, branching, and error handling
- **Apify** — managed scraping infrastructure, handles LinkedIn bot protection
- **Bouncer** — purpose-built email verification, fast API, reliable verdict values
- **OpenAI (gpt-4o-mini)** — fast, cheap, good enough for structured outreach copy

**Speaker Notes:**

Every tool here was chosen for a reason, not just because it was on the list. Airtable is the interface for the human on both ends — the person configuring campaigns and the person reviewing leads before outreach. n8n sits in the middle and handles all the orchestration. Apify handles the scraping because LinkedIn actively blocks bots, and Apify's actors deal with that so I don't have to build and maintain that myself. Bouncer is purpose-built for email validation — it returns clear verdict values like "Deliverable," "Unknown," and "Invalid" which map directly to downstream decisions. And gpt-4o-mini for message generation because it's fast and cheap for structured output, and I'm not writing ad copy — I'm writing cold emails where "good enough and personalized" beats "perfect and generic."

---

## Slide 4 — How It Actually Works (System Behavior)

**Content:**

- **Trigger**: Airtable automation POSTs persona record ID to n8n webhook
- **First thing the workflow does**: Re-read the record from Airtable — never trust the trigger payload
- **Apify async problem**: Scraper jobs take 1–5 minutes. n8n can't await them. Solution: poll Apify's run status API every 15 seconds, up to 20 times, then route on the result (SUCCEEDED / FAILED / TIMED-OUT)
- **Per-lead loop (batch size = 1)**:
  - Dedup check by email first, LinkedIn URL fallback
  - Website and LinkedIn verification (HEAD request, 10s timeout, `continueOnFail`)
  - About page scrape: website first, LinkedIn fallback, None if both fail
  - Bouncer email verification: skipped if email is malformed, missing, or already flagged
  - AI generation: full-context prompt if about text > 50 chars, fallback prompt otherwise
- **Pipeline status as a state machine**: Queued → Verifying → Scraping → Validating Email → Generating Messages → Complete / Partial / Error / Needs Review

**Speaker Notes:**

The most interesting engineering problem in this build was the Apify async gap. When you trigger a scraper job, Apify doesn't respond with results immediately — it responds with a run ID and you have to come back later. n8n doesn't have a native "wait for external job" primitive, so I built a polling loop: wait 15 seconds, check the run status, if it's still RUNNING wait again, up to 20 polls. That's a five-minute budget for the scraper. After that you route on the result. This is also why the pipeline status field exists — at any point in time, you can look at a lead record in Airtable and know exactly what stage it's in and whether it completed or failed.

---

## Slide 5 — Demo: Happy Path

**Content:**

- User fills in Target Persona: "Head of Operations / New York, USA / 11–50 / SaaS, automation"
- Sets Status = "Ready to Run"
- n8n picks up the webhook, validates inputs, sets Status = "Running"
- Apify returns leads, each lead goes through the full pipeline
- Final lead record in Airtable:

| Field | Example Value |
|---|---|
| Full Name | Sarah Chen |
| Company | Relay App |
| Email | sarah@relay.app |
| Email Status | Deliverable |
| Website Status | Valid |
| LinkedIn Status | Valid |
| Company About Text | "Relay is a workflow automation platform for ops teams..." |
| About Source | Website |
| Email Subject 1 | "How Relay could automate the manual work your ops team hates" |
| Email Body 1 | 3-paragraph intro email referencing Relay's automation focus |
| Email Subject 2 | Follow-up subject |
| Email Body 2 | Follow-up body |
| Email Subject 3 | Break-up email |
| LinkedIn Message | 280-character connection message |
| Pipeline Status | Complete |
| Usable | TRUE |

- "Usable" formula: `Email Status = Deliverable AND Pipeline Status = Complete`

**Speaker Notes:**

The happy path is what you'd hope to see every time. Persona goes in, fifty leads come out, each one enriched with company context and a personalized message sequence. The "Usable" formula field in Airtable is the key output — it's TRUE only when both the email is verified deliverable and the pipeline completed fully. That's the field a salesperson or reviewer would filter on. Everything else in the record is context and audit trail. I won't click through every node in the workflow — the point is what shows up in Airtable at the end.

---

## Slide 6 — Demo: Edge Case (This Is the Real Test)

**Content:**

**Scenario: Bouncer returns "Unknown" — the email couldn't be verified**

What happens:
1. Bouncer API responds with `verdict: "unknown"` (some mail servers don't give definitive answers)
2. `Process Bouncer Response` sets Email Status = "Unknown", stores raw Bouncer JSON
3. `Prepare AI Generation` flags `unknownEmail = true`
4. `Process AI Response` routes this to Pipeline Status = **"Needs Review"** (not "Complete")
5. Lead record is in Airtable with all messages generated but clearly flagged

What the reviewer sees in Airtable:
- Pipeline Status: "Needs Review"
- Email Status: "Unknown"
- Bouncer Raw Response: full JSON for manual inspection
- All message fields populated

**The system fails visibly, not silently.**

**Known gap I found in testing:** When Bouncer is completely down (all 3 retries fail), Email Status = "Error" but Pipeline Status = "Complete" — misleading. That lead looks fully done when it isn't.

**Speaker Notes:**

This is the slide that actually matters. The "Unknown" verdict from Bouncer is interesting because it's not a failure — Bouncer did its job, it just couldn't get a definitive answer. The workflow has to make a decision: do we mark this lead as done and risk someone emailing an unverified address, or do we flag it for review? I chose "Needs Review" — the messages are generated, everything else is done, but a human has to make the call. What I also found during testing is that when Bouncer is fully down and all retries fail, I have a gap: Email Status becomes "Error" but Pipeline Status still shows "Complete." That's misleading. A reviewer looking at that lead thinks it's ready when the email was never actually checked. I documented this in the test results and I'd fix it by adding "Error" to the statuses that trigger "Needs Review."

---

## Slide 7 — Production Readiness Highlights

**Content:**

**Five design decisions that make this production-ready:**

1. **Retry on every external API** — 3 attempts, 1-second wait, on every HTTP request node. Apify, Bouncer, Airtable writes, OpenAI — all covered.

2. **Idempotency** — Before creating a lead, the workflow queries Airtable: does this email already exist? Falls back to LinkedIn URL if email is missing. If the same persona triggers twice, a duplicate-trigger check catches it before any external API is called.

3. **Pipeline status as a state machine** — Every status transition is intentional: Queued → Verifying → Scraping → Validating Email → Generating Messages → terminal state. You can see where any lead is at any point, and you can tell what happened when it stopped.

4. **Graceful degradation** — No single failure kills the pipeline. Website verification fails? Continue. LinkedIn bot-blocked? Continue. Bouncer down? Continue with Error status and full AI generation. The lead gets as far as it can.

5. **Security** — All API keys in n8n's credential manager. Prompt injection containment: all scraped text is sanitized before it reaches the OpenAI prompt. HTML tags, n8n expression syntax, and control characters are stripped at the input layer.

**Speaker Notes:**

Each of these was a deliberate decision, not an accident. Retry exists because Apify and Bouncer both have availability issues — they're external services and they fail sometimes. Idempotency exists because Airtable automations can fire twice for the same status change, and I found that in the edge case spec before I built it. The state machine was the most important design choice — without it, you have no way to know what happened to a lead that's stuck. And prompt injection containment is there because I'm taking scraped text from arbitrary company websites and feeding it directly into an AI prompt. That's a surface that needs sanitizing.

---

## Slide 8 — What I'd Do Differently

**Content:**

**Trade-offs I'd address in production:**

- **Linear retry instead of exponential backoff** — n8n's built-in retry waits the same amount of time each attempt. True exponential backoff (2s, 4s, 8s) is better for APIs with rate limits. Doing it properly in n8n requires a custom Code node loop — I documented it as a known limitation but didn't build it.

- **50-lead batches risk timeout on n8n cloud** — At ~35 seconds per lead, 50 leads takes ~29 minutes. Most n8n cloud instances time out at 5–10 minutes. That kills the workflow at lead ~10. Fix: chunk personas into smaller batches (20 leads max), or move to self-hosted n8n with no execution timeout.

- **Email Status "Error" doesn't block "Complete" pipeline status** — When Bouncer fails entirely, the lead shows Pipeline Status = "Complete" even though the email was never verified. Needs a one-line fix in node 70.

**What I'd add in production:**

- Slack alert when any pipeline run fails or ends in "Error" status
- Per-persona cost dashboard: Apify compute units + Bouncer checks + OpenAI tokens per run
- Feedback loop from sales: which messages actually got replies? That data closes the loop between outreach generation and real-world performance

**Speaker Notes:**

The exponential backoff thing bothers me because it's the right approach and I know it, but n8n doesn't give you that out of the box without writing a retry loop in a Code node. I chose to document it honestly rather than pretend the 1-second linear retry is fine. The timeout risk on 50-lead batches is the most real production concern — this workflow would fail on cloud n8n for any full-size campaign. And the Email Status "Error" gap I found in the pressure tests is a bug, not a trade-off. I'd ship a fix for that before putting this in front of a sales team. The things I'd add — Slack alerts, cost tracking, reply feedback — are the difference between a tool that works and a tool that people actually trust and keep using.

---

*Total slides: 8 | Estimated delivery time: 6–7 minutes*
