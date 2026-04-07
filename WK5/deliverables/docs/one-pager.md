# WK5 Lead Generation & Outreach Automation

**Owner:** Ayodele Oluwafimidaraayo
**Last Updated:** 2026-04-04
**Key Links:** [Airtable Base](https://airtable.com/appVBk6JworOjO0Gh) | [Lead Search Form](https://airtable.com/appVBk6JworOjO0Gh/pagvTmosE1QDgmy6n/form) | n8n Workflow ID: `YQm8HDWrS2ebZEde`

---

## Purpose & Success Criteria

**Who it's for:** The outbound sales team at a service that connects early-stage founders with trained AI automation assistants.

**The problem:** Running outbound campaigns is entirely manual — defining target personas, searching for leads, researching companies, verifying emails, and writing personalized cold emails from scratch. A single campaign targeting 50 leads takes hours.

**What it does:** Automates the entire lead generation and outreach preparation pipeline. A team member fills in 4 fields (Job Title, Location, Company Size, Keywords), submits a form, and receives 50 verified leads with personalized 3-step email sequences and LinkedIn messages — stored in Airtable, ready for human review.

**What changes if it works:** Campaign preparation drops from hours to 15 minutes. Outreach quality improves because every email references actual company context. Email deliverability improves because addresses are verified before use.

**How success is measured:**
- Leads returned match the target persona (title, location)
- 70%+ of emails verified as Deliverable by Bouncer
- All Complete leads have personalized 3-email sequence + LinkedIn message
- Pipeline completes without manual intervention
- Safe to run repeatedly without creating duplicates

---

## How It Works

```
Airtable Form (4 fields: Job Title, Location, Company Size, Keywords)
        |
  n8n Schedule Trigger (polls every 30 seconds)
        |
  Validate inputs + check for duplicate runs
        |
  Apify Lead Scraper → poll until complete → fetch results
        |
  Process, validate, sanitize, deduplicate (cap at 50)
        |
  Per-Lead Processing Loop:
   +-- Create lead record in Airtable
   +-- Cross-run deduplication (email + LinkedIn)
   +-- Website verification (HTTP HEAD, redirect following)
   +-- LinkedIn profile verification
   +-- Company About page scraping (Apify)
   +-- Email validation (Bouncer API)
   +-- AI message generation (OpenAI gpt-4o-mini)
   +-- Update lead with messages + final status
        |
  Mark persona Complete → close Run Log
```

**Tech Stack:**

| Tool | Role |
|---|---|
| **n8n** | Workflow orchestration (83 nodes, 7 phases) |
| **Airtable** | Data store (Target Personas, Leads, Run Logs) + Form interface |
| **Apify** | Lead scraping (code_crafter actor, 90M+ person database) |
| **Bouncer** | Email deliverability verification |
| **OpenAI** | Personalized message generation (gpt-4o-mini) |

---

## How to Use It

1. Open the [Lead Search Form](https://airtable.com/appVBk6JworOjO0Gh/pagvTmosE1QDgmy6n/form).
2. Fill in **Job Title** (e.g., "CFO"), **Location** (e.g., "Lagos, Nigeria"), **Company Size** (e.g., "51-200"), and **Keywords** (e.g., "finance").
3. Click **Submit**.
4. The pipeline starts automatically within 30 seconds.
5. Wait 15-30 minutes for processing.
6. Open the **Leads** table in Airtable. Filter by **Pipeline Status = "Complete"**.
7. Click any lead to view:
   - Contact details (email, LinkedIn, company website)
   - Email verification result (Deliverable, Invalid, Unknown)
   - 3 personalized cold emails (Intro, Follow-up, Break-up) with subject lines
   - LinkedIn connection message
8. Review, edit if needed, and send.

**Requirements:**
- n8n must be running locally: `source ~/.zshrc && n8n start`
- Apify, Bouncer, and OpenAI accounts must have available credits

---

## Pipeline Results (Verified Test Runs)

| Test Run | Leads | Deliverable | With Messages | Duration |
|---|---|---|---|---|
| CFO / Lagos, Nigeria / 51-200 | 50 | 41 (81%) | 46 | ~25 min |
| CTO / Accra, Ghana / 11-50 | 48 | 16 (33%) | 38 | ~30 min |
| Security Analyst / London / 51-200 | 8 | 5 (63%) | 8 | ~10 min |
| CEO / Nairobi, Kenya / 11-50 | 9 | 0 (Bouncer down) | 9 | ~8 min |

---

## Production Safeguards

**Validation (done early, before any API spend):**
- Email format regex + garbage filter ("n/a", "none") before Bouncer
- LinkedIn URL validation (personal vs company page detection)
- Website URL validation (blocks dangerous protocols)
- Persona input validation (Job Title required)

**Duplicate Protection:**
- In-batch deduplication (email Set within same run)
- Cross-run deduplication (Airtable query by email + LinkedIn URL)
- Duplicate trigger check (prevents re-running same persona)
- Status-as-lock (Running prevents re-pickup by schedule trigger)

**Error Handling:**
- Apify failure → persona marked "Error" with details
- Bouncer failure → defaults to "Unknown", pipeline continues
- OpenAI failure → lead marked "Partial"
- Global error handler catches unexpected crashes
- Auto-recovery: stuck "Running" personas retried after 30 minutes

**Cost Controls:**
- Bouncer only called for valid-format emails
- About page scraper only fires for verified-live websites
- Persona status re-checked before OpenAI spend
- Industry blocklist skips AI for excluded sectors
- Results capped at 50 leads per run

**Security:**
- API keys stored in n8n credential manager, not hardcoded
- Scraped text sanitized for prompt injection patterns
- Company context wrapped in delimiters with explicit data-only instruction

---

## Appendix

**Assumptions:**
- n8n runs locally on the user's machine (not cloud-deployed)
- Apify actor availability and pricing may change without notice
- Bouncer free plan provides 100 verifications; paid plan needed for sustained use

**Limitations:**
- Pipeline processes leads one at a time (rate limit compliance) — 50 leads takes 15-30 minutes
- Apify results depend on database coverage; smaller cities/niche titles may return fewer leads
- n8n must be started with `N8N_RUNNERS_TASK_TIMEOUT=300` to avoid code node timeouts
- Schedule trigger polling (30s) is near-instant but not true real-time

**Troubleshooting:**

| Symptom | Cause | Fix |
|---|---|---|
| Persona stays "Ready to Run" | n8n not running or workflow inactive | Run `n8n start`, check workflow is active |
| Persona stuck in "Running" | Pipeline crashed mid-run | Auto-recovers after 30 min, or manually reset Status |
| 0 leads returned | Apify account out of credits | Check Apify billing dashboard |
| All emails "Unknown" | Bouncer account out of credits | Top up Bouncer or use new API key |
| Code node timeout | N8N_RUNNERS_TASK_TIMEOUT not set | Add `export N8N_RUNNERS_TASK_TIMEOUT=300` to ~/.zshrc |
| "No Results" persona | Search too narrow for Apify's database | Broaden job title or location |
