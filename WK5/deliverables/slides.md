# WK5 Lead Generation & Outreach Automation
## Ayodele Oluwafimidaraayo

---

## Slide 1: The Problem

**Manual outbound is slow, expensive, and doesn't scale.**

Today, generating leads for our AI automation assistant service requires:
- Manually defining target personas
- Searching for matching leads one by one
- Researching each company for context
- Verifying email addresses
- Writing personalized cold emails from scratch

A single campaign targeting 50 leads takes **hours of manual work**.

The goal: automate the entire process so a team member fills in 4 fields, clicks submit, and gets 50 verified leads with personalized outreach ready to review — in under 15 minutes.

---

## Slide 2: The Solution

**An end-to-end automation pipeline triggered from an Airtable form.**

Input: Job Title, Location, Company Size, Keywords
Output: Verified leads with 3-step email sequences + LinkedIn messages, stored in Airtable

The pipeline:
1. User submits a form with 4 fields
2. n8n picks it up within 30 seconds
3. Apify scrapes matching leads from a 90M+ person database
4. Each lead is verified (website, LinkedIn, email via Bouncer)
5. OpenAI generates personalized 3-email sequence + LinkedIn message
6. Everything stored in Airtable ready for review

No manual research. No manual writing. No sending — just review-ready outreach.

---

## Slide 3: Live Demo Results

**Test Run: CFO / Lagos, Nigeria / 51-200 / Finance**

| Metric | Result |
|---|---|
| Leads found | 50 |
| With verified emails | 46 |
| Deliverable emails (Bouncer) | 41 (81%) |
| With AI message drafts | 46 |
| Pipeline completion | 46 Complete, 4 Skipped (duplicates) |
| Time to complete | ~15 minutes |

Every Complete lead has:
- 3 personalized cold emails (Intro, Follow-up, Break-up) with subject lines
- 1 LinkedIn connection message
- Bouncer email verification result
- Website and LinkedIn verification status

---

## Slide 4: How It Works (Architecture)

```
Airtable Form (4 fields)
       |
   n8n Schedule Trigger (polls every 30s)
       |
   Validate persona inputs + duplicate check
       |
   Apify Lead Scraper (code_crafter actor)
       |
   Process & Validate (sanitize, dedup, cap at 50)
       |
   Per-Lead Loop:
    +-- Website verification (HTTP HEAD)
    +-- LinkedIn verification
    +-- Company About page scraping
    +-- Bouncer email validation
    +-- OpenAI message generation (gpt-4o-mini)
       |
   Airtable Leads table (ready for review)
```

**Tech Stack:** n8n (orchestration), Airtable (data + interface), Apify (lead scraping), Bouncer (email verification), OpenAI (message generation)

---

## Slide 5: Production Readiness

**Error Handling:**
- Apify failure: detected, logged, persona marked "Error"
- Bouncer failure: defaults to "Unknown", pipeline continues
- Timeouts: configured per node (10s website, 30s Apify, 300s code runner)
- Global error handler catches unexpected crashes
- Run Logs table records every pipeline execution

**Data Quality & Validation (done early, before any API spend):**
- Email regex + garbage filter before Bouncer
- LinkedIn URL format validation (detects company pages vs personal)
- Website URL validation (blocks dangerous protocols)
- In-batch + cross-run deduplication by email and LinkedIn URL

**Cost Awareness:**
- Bouncer only called for valid-format emails
- About page scraper only fires for verified websites
- Persona status re-checked before OpenAI calls
- Industry blocklist skips AI for excluded sectors

**Safe to run repeatedly:**
- Duplicate trigger check prevents re-running same persona
- Status-as-lock prevents race conditions
- Cross-run dedup prevents contacting same person twice

---

## Slide 6: Edge Cases & Beyond the PRD

**Edge Cases Handled:**
- Empty Apify results: persona set to "No Results", exits cleanly
- No email + no LinkedIn: lead still gets AI messages (user's choice)
- Thin company context: fallback AI prompt that doesn't fabricate details
- Prompt injection: scraped text sanitized, wrapped in delimiters
- False duplicate matches: fixed dedup formula to skip empty email matching

**Beyond PRD Scope:**
- Airtable Form as the trigger interface (shareable link)
- 30-second polling (near-instant pickup)
- Run Logs table for audit trail
- Industry blocklist (weapons, gambling, adult)
- Prompt injection protection
- Cross-run deduplication
- Parking page detection for website verification

---

## Slide 7: Trade-offs & Improvements

**Trade-offs Made:**
- Messages generated for ALL leads regardless of email status — deliberate choice because OpenAI is cheap ($0.001/lead) and the reviewer might find a better email later
- 30-second polling instead of instant webhook — n8n runs locally, Airtable can't push to localhost
- 50-lead cap per run — controls API costs while providing enough leads for a campaign

**If I Had More Time:**
- Deploy n8n to cloud (Railway/Render) for 24/7 uptime + instant webhook triggering
- Build Airtable Interfaces for visual dashboard (Lead Review, Persona Manager)
- Add email sending integration (after human review/approval)
- A/B test email variants by generating multiple versions per lead
- Add lead scoring based on company size, email deliverability, and context quality

**Key Lesson:**
When an external API suddenly returns empty results, check the account balance before rewriting code. I spent hours debugging a "code problem" that was actually an Apify billing issue.
