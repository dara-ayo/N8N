# Airtable Schema Specification -- WK5 Lead Generation & Outreach Automation

**Version:** 1.0
**Date:** 2026-03-29
**Owner:** Ayodele Oluwafimidaraayo
**Base Name:** WK5-LeadGen

This document is the single source of truth for the Airtable base structure. The n8n workflow, any frontend tooling, and all documentation reference this schema. Do not rename, reorder, or delete fields without updating the workflow and this document simultaneously.

---

## Table of Contents

1. [Base Architecture](#1-base-architecture)
2. [Table 1: Target Personas](#2-table-1-target-personas)
3. [Table 2: Leads](#3-table-2-leads)
4. [Table 3: Run Logs](#4-table-3-run-logs)
5. [Record Flow Map](#5-record-flow-map)
6. [Views Configuration](#6-views-configuration)
7. [Idempotency Design](#7-idempotency-design)
8. [Field Validation Rules](#8-field-validation-rules)
9. [API Field Name Reference](#9-api-field-name-reference)
10. [Single-Select Option Catalog](#10-single-select-option-catalog)

---

## 1. Base Architecture

The base contains three tables with the following relationships:

```
Target Personas (1) ----< (many) Leads
Target Personas (1) ----< (many) Run Logs
```

- **Target Personas** is the trigger table. A human fills in a persona definition, sets the Status to "Ready to Run," and the n8n webhook fires.
- **Leads** stores every lead record discovered by Apify, enriched and scored through the pipeline. One record per person.
- **Run Logs** stores one record per pipeline execution for auditing, debugging, and cost tracking.

All linked record fields use Airtable's native "Link to another record" type, which enforces referential integrity within the base.

---

## 2. Table 1: Target Personas

**Table name (exact):** `Target Personas`
**Purpose:** Input table where users define who they want to find. Each record represents one search persona. Setting the Status field to "Ready to Run" triggers the n8n automation.

### Fields

| # | Field Name | Field Type | Required | Description | Default |
|---|---|---|---|---|---|
| 1 | **Job Title** | Single line text | Yes | The target job title to search for. Example: "Head of Operations", "Founder", "CEO" | -- |
| 2 | **Location** | Single line text | Yes | Geographic target. Example: "New York, USA", "London, UK", "Remote" | -- |
| 3 | **Company Size** | Single select | Yes | Size range of the target companies. See options below. | -- |
| 4 | **Keywords** | Long text | No | Comma-separated keywords or tags to refine the search. Example: "SaaS, automation, AI, operations" | -- |
| 5 | **Status** | Single select | Yes | Current state of this persona record. Controls workflow trigger. See options below. | Draft |
| 6 | **Run Date** | Date | No | Timestamp of when the automation last ran for this persona. Written by n8n, not the user. Date format: ISO (YYYY-MM-DD). Include time field: Yes. | -- |
| 7 | **Lead Count** | Number (integer, no decimal) | No | Total number of leads found and inserted into the Leads table for this persona. Written by n8n at the end of a run. | 0 |
| 8 | **Error Notes** | Long text | No | Human-readable error details if the run failed. Written by n8n. Should include timestamp, failing stage, and error message. | -- |
| 9 | **Created At** | Created time | Auto | Automatically set when the record is created. Date format: ISO. Include time: Yes. | Auto |

### Single-Select Options for Status

| Option | Color (suggested) | Meaning |
|---|---|---|
| Draft | Light gray | Record is being filled in. Not ready for automation. |
| Ready to Run | Blue | User has reviewed the inputs and wants the pipeline to execute. This is the trigger state. |
| Running | Yellow | n8n has picked up this record and the pipeline is in progress. Set by n8n immediately upon trigger. |
| Complete | Green | The pipeline finished successfully. All leads have been processed. |
| Error | Red | The pipeline encountered a fatal error. Check Error Notes for details. |
| No Results | Orange | The Apify scraper returned zero leads for this persona's criteria. |
| Input Error | Pink | One or more required fields were missing or invalid when the trigger fired. Check Error Notes. |

### Single-Select Options for Company Size

| Option |
|---|
| 1-10 |
| 11-50 |
| 51-200 |
| 201-500 |
| 500+ |

---

## 3. Table 2: Leads

**Table name (exact):** `Leads`
**Purpose:** Central repository for all lead data. One record per person. Tracks every stage of the pipeline from initial scrape through email verification and message generation.

### Fields -- Core Identity

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 1 | **Lead ID** | Auto-number | Auto | Unique numeric identifier. Prefix: `LEAD-`, starting value: 1. Example: LEAD-1, LEAD-2. |
| 2 | **Full Name** | Single line text | Yes | The lead's full name as returned by the scraper. |
| 3 | **Email** | Email | Yes | The lead's email address. Primary deduplication key. Must pass basic format validation before any API call. |
| 4 | **Job Title** | Single line text | No | The lead's current job title. |
| 5 | **Company Name** | Single line text | Yes | The company the lead works at. Used as a tertiary dedup key in combination with Full Name. |
| 6 | **Company Website** | URL | No | The company's website. Must begin with `http://` or `https://`. |
| 7 | **LinkedIn URL** | URL | No | The lead's personal LinkedIn profile URL. Must match pattern `https://www.linkedin.com/in/...` or `https://linkedin.com/in/...`. Secondary deduplication key. |
| 8 | **Location** | Single line text | No | The lead's geographic location as returned by the scraper. |
| 9 | **Company Size** | Single line text | No | Company size as returned by the scraper. Stored as free text (not single-select) because scraper data may not match our predefined ranges exactly. |

### Fields -- Enrichment

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 10 | **Website Status** | Single select | No | Result of the HTTP verification of the company website. See options below. |
| 11 | **LinkedIn Status** | Single select | No | Result of the LinkedIn profile verification. See options below. |
| 12 | **Company About Text** | Long text | No | Scraped text from the company's About page (website or LinkedIn). Used as context for AI message generation. Enable rich text formatting: No. |
| 13 | **About Source** | Single select | No | Where the Company About Text was sourced from. See options below. |

### Fields -- Email Validation

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 14 | **Email Status** | Single select | No | Result of the Bouncer email verification API call. See options below. |
| 15 | **Bouncer Raw Response** | Long text | No | Full JSON response from the Bouncer API. Stored for debugging and audit purposes. Enable rich text: No. |

### Fields -- Message Generation

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 16 | **Email Subject Line 1** | Single line text | No | Subject line for email step 1 (intro email). |
| 17 | **Email Body 1** | Long text | No | Body content for email step 1 (intro email). Enable rich text: No. |
| 18 | **Email Subject Line 2** | Single line text | No | Subject line for email step 2 (follow-up email). |
| 19 | **Email Body 2** | Long text | No | Body content for email step 2 (follow-up email). Enable rich text: No. |
| 20 | **Email Subject Line 3** | Single line text | No | Subject line for email step 3 (break-up email). |
| 21 | **Email Body 3** | Long text | No | Body content for email step 3 (break-up email). Enable rich text: No. |
| 22 | **LinkedIn Message** | Long text | No | LinkedIn connection request / InMail message. Enable rich text: No. Max recommended length: 300 characters (LinkedIn connection request limit). |
| 23 | **Message Generation Status** | Single select | No | Status of the AI content generation step. See options below. |

### Fields -- Pipeline Tracking

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 24 | **Pipeline Status** | Single select | Yes | Current stage of this lead in the processing pipeline. Acts as a state machine. See options below. |
| 25 | **Error Stage** | Single select | No | If the lead errored, which pipeline stage failed. See options below. |
| 26 | **Error Detail** | Long text | No | Human-readable error message. Should include timestamp, the failing node/step, and the raw error. Enable rich text: No. |
| 27 | **Retry Count** | Number (integer, no decimal) | No | How many times processing has been retried for this lead. Incremented by n8n on each retry attempt. |
| 28 | **Source Persona** | Link to another record (Target Personas) | Yes | Links this lead back to the Target Persona record that generated it. Allow linking to multiple records: No (each lead belongs to exactly one persona run). |
| 29 | **Created At** | Created time | Auto | Automatically set when the record is created. Date format: ISO. Include time: Yes. |
| 30 | **Last Updated** | Last modified time | Auto | Automatically updated whenever any field in the record changes. Date format: ISO. Include time: Yes. |
| 31 | **Is Duplicate** | Checkbox | No | Set to `true` if this lead was detected as a duplicate of an existing record during processing. Duplicate leads are not re-processed. |
| 32 | **Usable** | Formula | Auto | Evaluates to `true` (1) if the lead is ready for outreach. Formula: `IF(AND({Email Status} = "Deliverable", {Pipeline Status} = "Complete"), TRUE(), FALSE())` |

### Single-Select Options for Website Status

| Option | Meaning |
|---|---|
| Valid | HTTP request returned 200 and the domain resolves to a real website. |
| Invalid | HTTP request returned 4xx/5xx or DNS did not resolve. |
| Timeout | HTTP request did not complete within 10 seconds. |
| Redirected | HTTP request followed redirects; final destination differs from original domain. |
| Blocked | Website returned 403 or presented a bot challenge (Cloudflare, CAPTCHA). |
| Parked | Final URL resolved to a known domain parking service (GoDaddy, Sedo, etc.). |
| Missing | No website URL was provided for this lead. |
| Unknown | Verification has not been attempted yet or returned an unexpected result. |

### Single-Select Options for LinkedIn Status

| Option | Meaning |
|---|---|
| Valid | LinkedIn profile URL resolves and the profile is accessible. |
| Invalid | LinkedIn URL does not resolve or returns a 404. |
| Bot-Blocked | LinkedIn returned a challenge page or blocked the request. |
| Missing | No LinkedIn URL was provided for this lead. |
| Unknown | Verification has not been attempted yet. |

### Single-Select Options for About Source

| Option | Meaning |
|---|---|
| Website | About text was scraped from the company website's About page. |
| LinkedIn | About text was scraped from the company's LinkedIn page. |
| Both | About text was obtained from both sources (merged). |
| None | No about text could be obtained from any source. |

### Single-Select Options for Email Status

| Option | Meaning |
|---|---|
| Deliverable | Bouncer confirmed the email is deliverable. Safe to send. |
| Invalid | Bouncer confirmed the email is invalid / does not exist. |
| Unknown | Bouncer could not determine deliverability. Flag for manual review. |
| Accept-All | The mail server accepts all addresses (catch-all). Deliverability uncertain. |
| Disposable | The email uses a disposable/temporary email service. |
| Role-Address | The email is a role address (e.g., info@, admin@, support@). Not a personal inbox. |
| Skipped | Email validation was skipped (e.g., email field was empty or malformed). |
| Error | The Bouncer API call failed. Check Bouncer Raw Response for details. |

### Single-Select Options for Message Generation Status

| Option | Meaning |
|---|---|
| Generated | All 4 message fields (3 emails + 1 LinkedIn) were successfully generated. |
| Failed | AI generation was attempted but returned an error. |
| Incomplete | AI generation partially succeeded -- some fields are populated, others are not. |
| Skipped | AI generation was not attempted (e.g., email was invalid, lead was a duplicate). |
| Limited Context | Generated with minimal context (about text was under 50 characters). Quality may be lower. |

### Single-Select Options for Pipeline Status

| Option | Color (suggested) | Meaning |
|---|---|---|
| Queued | Light gray | Lead record has been created and is waiting to be processed. |
| Scraping | Light blue | Website and LinkedIn verification / about page scraping is in progress. |
| Verifying | Blue | URL verification step is in progress. |
| Validating Email | Purple | Bouncer email validation is in progress. |
| Generating Messages | Indigo | AI content generation is in progress. |
| Complete | Green | All pipeline stages succeeded. Lead is ready for review. |
| Partial | Yellow | Some stages succeeded but at least one non-critical stage failed. Lead may still be usable. |
| Error | Red | A critical stage failed. See Error Stage and Error Detail. |
| Skipped | Gray | Lead was identified as a duplicate and was not processed. |
| Needs Review | Orange | Pipeline completed but the email verdict was "Unknown" or "Accept-All" -- requires human judgment. |

### Single-Select Options for Error Stage

| Option | Meaning |
|---|---|
| Scraping | Failure occurred during website/LinkedIn scraping or about page extraction. |
| Website Verification | Failure occurred during the HTTP website check. |
| LinkedIn Verification | Failure occurred during the LinkedIn profile check. |
| Email Validation | Failure occurred during the Bouncer API call. |
| Message Generation | Failure occurred during the AI content generation step. |
| Airtable Write | Failure occurred while writing results back to Airtable. |

---

## 4. Table 3: Run Logs

**Table name (exact):** `Run Logs`
**Purpose:** Audit table. One record per full pipeline execution. Provides a high-level summary of each run for debugging, performance tracking, and cost estimation.

### Fields

| # | Field Name | Field Type | Required | Description |
|---|---|---|---|---|
| 1 | **Run ID** | Auto-number | Auto | Unique identifier for each run. Prefix: `RUN-`, starting value: 1. Example: RUN-1, RUN-2. |
| 2 | **Persona** | Link to another record (Target Personas) | Yes | The persona record that triggered this run. Allow linking to multiple records: No. |
| 3 | **Start Time** | Date | Yes | When the n8n workflow execution began. Date format: ISO. Include time: Yes. Use GMT/UTC: Yes. |
| 4 | **End Time** | Date | No | When the n8n workflow execution completed (success or failure). Same format as Start Time. Null if the run is still in progress or crashed without completing. |
| 5 | **Leads Found** | Number (integer) | No | Total number of leads returned by Apify before deduplication. |
| 6 | **Leads Processed** | Number (integer) | No | Number of leads that were new (not duplicates) and went through the pipeline. |
| 7 | **Leads Skipped Duplicate** | Number (integer) | No | Number of leads skipped because they already existed in the Leads table. |
| 8 | **Leads Errored** | Number (integer) | No | Number of leads that encountered an error during any pipeline stage. |
| 9 | **Total Cost Estimate** | Currency (USD, 2 decimal places) | No | Rough cost estimate based on API calls made during this run. Calculation: (Apify compute units used x unit cost) + (Bouncer verifications x $0.008) + (AI API calls x estimated token cost). This is an approximation for budgeting purposes. |
| 10 | **Status** | Single select | Yes | Overall run outcome. Options: Running, Complete, Partial, Failed, No Results. |
| 11 | **Notes** | Long text | No | Free-form notes. n8n writes summary information here (e.g., "50 leads found, 3 duplicates skipped, 2 email validations failed"). Enable rich text: No. |

### Single-Select Options for Status (Run Logs)

| Option | Meaning |
|---|---|
| Running | Pipeline execution is in progress. |
| Complete | All leads were processed successfully. |
| Partial | Some leads succeeded, some failed. |
| Failed | The run failed before processing any leads (e.g., Apify actor error). |
| No Results | Apify returned zero leads for the given criteria. |

---

## 5. Record Flow Map

This section documents exactly how data moves through the system, step by step. Every state transition is defined.

### 5.1 Trigger Phase

```
User creates a Target Persona record
    |
    v
User fills in: Job Title, Location, Company Size, Keywords
    |
    v
User sets Status = "Ready to Run"
    |
    v
n8n webhook / polling trigger detects the status change
    |
    v
n8n sets Persona Status = "Running"
n8n sets Run Date = NOW()
n8n creates a new Run Log record (Status = "Running", Start Time = NOW())
```

### 5.2 Input Validation

```
n8n checks required fields on the Persona record:
    - Job Title: must be non-empty
    - Location: must be non-empty
    - Company Size: must be one of the defined options

If validation fails:
    - Set Persona Status = "Input Error"
    - Set Error Notes = "Missing fields: [list of missing fields]"
    - Update Run Log Status = "Failed"
    - STOP execution

If validation passes:
    - Continue to Lead Scraping
```

### 5.3 Lead Scraping Phase

```
n8n calls Apify Leads Scraper with parameters:
    - jobTitle: from Persona record
    - location: from Persona record
    - companySize: from Persona record
    - keywords: from Persona record
    - maxResults: 50 (hard cap per run)
    |
    v
n8n polls Apify actor status until SUCCEEDED / FAILED / TIMED-OUT
    (timeout after 5 minutes of polling)
    |
    v
If actor FAILED or TIMED-OUT:
    - Set Persona Status = "Error"
    - Set Error Notes = "Apify scraper failed: [error message]"
    - Update Run Log Status = "Failed"
    - STOP execution
    |
    v
If actor returned 0 results:
    - Set Persona Status = "No Results"
    - Update Run Log Status = "No Results"
    - Set Lead Count = 0
    - STOP execution
    |
    v
Apify returns lead array. For each lead:
```

### 5.4 Deduplication Phase (per lead)

```
For each lead returned by Apify:
    |
    v
Step 1: Does this lead have an email address?
    - YES -> Query Leads table: SEARCH({Email}, "lead_email_here")
        - If match found -> Mark as duplicate (see below)
        - If no match -> Continue to Step 2
    - NO -> Continue to Step 2
    |
    v
Step 2: Does this lead have a LinkedIn URL?
    - YES -> Query Leads table: SEARCH({LinkedIn URL}, "lead_linkedin_here")
        - If match found -> Mark as duplicate (see below)
        - If no match -> Continue to Step 3
    - NO -> Continue to Step 3
    |
    v
Step 3: Query Leads table by Company Name + Full Name combination
    - If match found -> Mark as duplicate (see below)
    - If no match -> Lead is NEW. Proceed to record creation.
    |
    v
DUPLICATE HANDLING:
    - Create the record in the Leads table (so we have a trace)
    - Set Is Duplicate = true
    - Set Pipeline Status = "Skipped"
    - Do NOT process through the pipeline
    - Increment Run Log "Leads Skipped Duplicate" counter
    |
    v
NEW LEAD HANDLING:
    - Create record in Leads table with all available fields from scraper
    - Set Pipeline Status = "Queued"
    - Set Source Persona = link to the triggering Persona record
    - Set Retry Count = 0
```

### 5.5 Pipeline Processing (per new lead)

```
STAGE 1: Website & LinkedIn Verification
    Pipeline Status -> "Scraping"
    |
    +---> Website Verification (parallel branch A)
    |     - If Company Website is empty: set Website Status = "Missing"
    |     - If Company Website is present:
    |         - Send HTTP HEAD request (timeout: 10s, follow up to 3 redirects)
    |         - 200 response -> Website Status = "Valid"
    |         - 3xx final URL on parking domain -> Website Status = "Parked"
    |         - 3xx final URL on different domain -> Website Status = "Redirected"
    |         - 4xx/5xx response -> Website Status = "Invalid"
    |         - 403 / challenge page -> Website Status = "Blocked"
    |         - Timeout -> Website Status = "Timeout"
    |
    +---> LinkedIn Verification (parallel branch B)
    |     - If LinkedIn URL is empty: set LinkedIn Status = "Missing"
    |     - If LinkedIn URL is present:
    |         - Send HTTP HEAD request or Apify LinkedIn check
    |         - Profile accessible -> LinkedIn Status = "Valid"
    |         - 404 / not found -> LinkedIn Status = "Invalid"
    |         - Challenge / block page -> LinkedIn Status = "Bot-Blocked"
    |
    +---> About Page Scraping (parallel branch C)
          - Attempt website About page scrape (if Website Status will be Valid)
          - Attempt LinkedIn company page scrape
          - If website about text found: About Source = "Website"
          - If LinkedIn about text found: About Source = "LinkedIn"
          - If both found: merge texts, About Source = "Both"
          - If neither found: About Source = "None"
          - Store result in Company About Text
    |
    v
STAGE 2: Email Validation
    Pipeline Status -> "Validating Email"
    |
    - If Email is empty or malformed (fails regex):
        Email Status = "Skipped"
        Skip Bouncer API call
    - If Email is valid format:
        - Call Bouncer API: POST /v1/email/verify
        - Store full JSON response in Bouncer Raw Response
        - Map Bouncer verdict to Email Status:
            "deliverable" -> "Deliverable"
            "undeliverable" -> "Invalid"
            "unknown" -> "Unknown"
            "accept_all" -> "Accept-All"
            "disposable" -> "Disposable"
            "role" -> "Role-Address"
        - On API error: Email Status = "Error", store error in Bouncer Raw Response
    |
    v
STAGE 3: AI Content Generation
    Pipeline Status -> "Generating Messages"
    |
    - Check if lead should receive messages:
        - If Email Status = "Invalid" or "Disposable":
            Message Generation Status = "Skipped"
            Skip generation
        - If Company About Text length < 50 chars:
            Use fallback prompt (job title + company name only)
            Flag as "Limited Context"
        - Otherwise: use full prompt with company context
    |
    - Call AI API with prompt containing:
        - Lead's Full Name
        - Lead's Job Title
        - Company Name
        - Company About Text
        - Target persona Keywords (from Source Persona)
    |
    - Parse AI response into:
        - Email Subject Line 1, Email Body 1
        - Email Subject Line 2, Email Body 2
        - Email Subject Line 3, Email Body 3
        - LinkedIn Message
    |
    - Validate each field is non-empty and > 50 characters (bodies only)
    - If all valid: Message Generation Status = "Generated"
    - If partial: Message Generation Status = "Incomplete"
    - If all failed: Message Generation Status = "Failed"
    |
    v
STAGE 4: Final Status Resolution
    |
    - If all stages succeeded:
        Pipeline Status -> "Complete"
    - If Email Status = "Unknown" or "Accept-All":
        Pipeline Status -> "Needs Review"
    - If any non-critical stage failed but lead has usable data:
        Pipeline Status -> "Partial"
        Set Error Stage to the first failing stage
        Set Error Detail with specifics
    - If a critical stage failed:
        Pipeline Status -> "Error"
        Set Error Stage and Error Detail
```

### 5.6 Run Completion

```
After ALL leads have been processed:
    |
    v
n8n updates the Persona record:
    - Status -> "Complete" (if no errors) or "Error" (if >50% leads errored)
    - Lead Count = total new leads inserted (excluding duplicates)
    |
    v
n8n updates the Run Log record:
    - End Time = NOW()
    - Leads Found = total from Apify
    - Leads Processed = new leads that went through the pipeline
    - Leads Skipped Duplicate = count of duplicates
    - Leads Errored = count of leads with Pipeline Status "Error"
    - Total Cost Estimate = calculated sum
    - Status = "Complete" or "Partial" or "Failed"
    - Notes = summary string
```

---

## 6. Views Configuration

### 6.1 Target Personas Views

| View Name | Type | Filter | Sort | Purpose |
|---|---|---|---|---|
| **All Personas** | Grid | None | Created At descending | Default view. Shows everything. |
| **Ready to Run** | Grid | Status = "Ready to Run" | Created At descending | Quick check for personas waiting to be processed. |
| **Running** | Grid | Status = "Running" | Run Date descending | Monitor active runs. |
| **Complete** | Grid | Status = "Complete" | Run Date descending | Review finished runs with their lead counts. |
| **Errors** | Grid | Status IS ANY OF "Error", "Input Error", "No Results" | Run Date descending | Triage failed runs. |

### 6.2 Leads Views

| View Name | Type | Filter | Sort | Group By | Purpose |
|---|---|---|---|---|---|
| **All Leads** | Grid | None | Created At descending | -- | Default view. Shows everything. |
| **Ready for Review** | Grid | Pipeline Status = "Complete" AND Email Status = "Deliverable" | Company Name ascending | -- | The money view. These leads have verified emails and generated messages. Ready for human review and outreach. |
| **Needs Attention** | Grid | Pipeline Status IS ANY OF "Error", "Partial", "Needs Review" | Last Updated descending | Error Stage | Triage view. Leads that need human intervention. |
| **Duplicates** | Grid | Is Duplicate = true | Created At descending | -- | Review detected duplicates. |
| **By Persona** | Grid | None | Created At descending | Source Persona | See leads grouped by the persona run that generated them. |
| **Usable Leads** | Grid | Usable = true | Company Name ascending | -- | Filtered to only leads where the Usable formula returns true. The cleanest export view. |
| **Email Issues** | Grid | Email Status IS ANY OF "Invalid", "Unknown", "Accept-All", "Disposable", "Role-Address", "Error" | Email Status ascending | Email Status | Diagnose email validation problems. |

### 6.3 Run Logs Views

| View Name | Type | Filter | Sort | Purpose |
|---|---|---|---|---|
| **All Runs** | Grid | None | Start Time descending | Default view. Full audit trail. |
| **Recent Runs** | Grid | Start Time is within the past 7 days | Start Time descending | Focus on recent activity. |
| **Failed Runs** | Grid | Status IS ANY OF "Failed", "Partial" | Start Time descending | Debug failed executions. |

---

## 7. Idempotency Design

### 7.1 Deduplication Strategy

The system must be safe to run multiple times for the same persona without creating duplicate lead records. Deduplication happens **before** a new lead record is created in the Leads table.

**Deduplication Key Priority (checked in order):**

| Priority | Key | Logic | Why |
|---|---|---|---|
| 1 (Primary) | **Email** | Exact match, case-insensitive. Query: `LOWER({Email}) = LOWER("new_email")` | Email is the most reliable unique identifier for a person. Two records with the same email are definitively the same lead. |
| 2 (Secondary) | **LinkedIn URL** | Exact match after normalization (strip trailing slash, force lowercase, remove query parameters). Query: `{LinkedIn URL} = "normalized_url"` | If a lead has no email but has a LinkedIn URL, the URL uniquely identifies the person. |
| 3 (Tertiary) | **Company Name + Full Name** | Both fields must match (case-insensitive). Query: `AND(LOWER({Company Name}) = LOWER("company"), LOWER({Full Name}) = LOWER("name"))` | Last resort for leads with neither email nor LinkedIn URL. Less reliable -- two "John Smith" records at "Acme Corp" could be different people, but this is the best we can do. |

### 7.2 Duplicate Handling Rules

1. **Within a single Apify result set:** Deduplicate by email address in memory (n8n Code node) before any Airtable writes. Keep the first occurrence, discard subsequent duplicates.

2. **Against existing Airtable records (cross-run):** For each new lead, query the Leads table using the priority keys above. If a match is found at any priority level:
   - Create the record anyway (for audit trail), but set `Is Duplicate = true` and `Pipeline Status = "Skipped"`.
   - Do NOT process the duplicate through the pipeline (no verification, no email validation, no message generation).
   - Increment the "Leads Skipped Duplicate" counter on the Run Log.

3. **Persona-level idempotency:** Before starting the scraping phase, n8n checks if leads already exist for this persona in a terminal state (Complete, Error, Skipped). If the persona was already fully processed, n8n logs a "duplicate trigger skipped" event and does not re-run.

### 7.3 LinkedIn URL Normalization

Before comparing LinkedIn URLs, apply these normalization steps:
1. Convert to lowercase.
2. Remove any query parameters (everything after `?`).
3. Remove any fragment (everything after `#`).
4. Remove trailing slash.
5. Ensure the URL starts with `https://www.linkedin.com/in/` (normalize `http://` to `https://`, add `www.` if missing).

Example: `HTTP://LinkedIn.com/in/JohnDoe/?ref=search` normalizes to `https://www.linkedin.com/in/johndoe`

---

## 8. Field Validation Rules

These rules must be enforced by the n8n workflow **before** making external API calls. The Airtable field types provide basic type checking, but the workflow is responsible for business logic validation.

### 8.1 Target Personas Validation (on trigger)

| Field | Rule | On Failure |
|---|---|---|
| Job Title | Must be non-empty. Trimmed length > 0. | Set Status = "Input Error". Error Notes = "Job Title is required." |
| Location | Must be non-empty. Trimmed length > 0. | Set Status = "Input Error". Error Notes = "Location is required." |
| Company Size | Must be one of: 1-10, 11-50, 51-200, 201-500, 500+. | Set Status = "Input Error". Error Notes = "Company Size must be selected." |
| Keywords | No validation required. Empty is acceptable. | -- |

### 8.2 Lead Record Validation (before pipeline processing)

| Field | Rule | On Failure |
|---|---|---|
| Email | Must match regex: `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$` | Set Email Status = "Skipped". Skip Bouncer API call. Do not discard the lead -- it may still be useful for LinkedIn outreach. |
| LinkedIn URL | Must match regex: `^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-%.]+\/?$` | Set LinkedIn Status = "Invalid". Skip LinkedIn verification. |
| Company Website | Must match regex: `^https?:\/\/.+\..+$` (basic URL with protocol and domain) | Set Website Status = "Invalid". Skip website verification and about page scrape. |
| Full Name | Must be non-empty. | If empty, log a warning but do not discard. Use "Unknown" as placeholder. |
| Company Name | Must be non-empty. | If empty, flag lead as "incomplete" in Error Detail. Lead is still processed but with reduced personalization quality. |

### 8.3 Bouncer Response Mapping

The Bouncer API returns a `result` field with these possible values. Map them to the Email Status single-select as follows:

| Bouncer `result` Value | Maps to Email Status |
|---|---|
| `deliverable` | Deliverable |
| `undeliverable` | Invalid |
| `unknown` | Unknown |
| `accept_all` | Accept-All |
| `disposable` | Disposable |
| `role` | Role-Address |
| API error / timeout | Error |

### 8.4 Data Sanitization

Before storing any scraped text in Airtable:
1. Strip HTML tags from Company About Text.
2. Trim leading/trailing whitespace.
3. Truncate Company About Text to 10,000 characters (Airtable long text limit is 100,000 but excessively long text wastes AI tokens).
4. Sanitize URLs by removing characters not valid in URLs before making HTTP requests.
5. Encode special characters in scraped names to prevent injection when used in AI prompts.

---

## 9. API Field Name Reference

Airtable API uses field names exactly as they appear in the table. This reference ensures the n8n workflow uses the correct strings when reading/writing records.

### Target Personas API Names

```json
{
  "Job Title": "Job Title",
  "Location": "Location",
  "Company Size": "Company Size",
  "Keywords": "Keywords",
  "Status": "Status",
  "Run Date": "Run Date",
  "Lead Count": "Lead Count",
  "Error Notes": "Error Notes",
  "Created At": "Created At"
}
```

### Leads API Names

```json
{
  "Lead ID": "Lead ID",
  "Full Name": "Full Name",
  "Email": "Email",
  "Job Title": "Job Title",
  "Company Name": "Company Name",
  "Company Website": "Company Website",
  "LinkedIn URL": "LinkedIn URL",
  "Location": "Location",
  "Company Size": "Company Size",
  "Website Status": "Website Status",
  "LinkedIn Status": "LinkedIn Status",
  "Company About Text": "Company About Text",
  "About Source": "About Source",
  "Email Status": "Email Status",
  "Bouncer Raw Response": "Bouncer Raw Response",
  "Email Subject Line 1": "Email Subject Line 1",
  "Email Body 1": "Email Body 1",
  "Email Subject Line 2": "Email Subject Line 2",
  "Email Body 2": "Email Body 2",
  "Email Subject Line 3": "Email Subject Line 3",
  "Email Body 3": "Email Body 3",
  "LinkedIn Message": "LinkedIn Message",
  "Message Generation Status": "Message Generation Status",
  "Pipeline Status": "Pipeline Status",
  "Error Stage": "Error Stage",
  "Error Detail": "Error Detail",
  "Retry Count": "Retry Count",
  "Source Persona": "Source Persona",
  "Created At": "Created At",
  "Last Updated": "Last Updated",
  "Is Duplicate": "Is Duplicate",
  "Usable": "Usable"
}
```

### Run Logs API Names

```json
{
  "Run ID": "Run ID",
  "Persona": "Persona",
  "Start Time": "Start Time",
  "End Time": "End Time",
  "Leads Found": "Leads Found",
  "Leads Processed": "Leads Processed",
  "Leads Skipped Duplicate": "Leads Skipped Duplicate",
  "Leads Errored": "Leads Errored",
  "Total Cost Estimate": "Total Cost Estimate",
  "Status": "Status",
  "Notes": "Notes"
}
```

---

## 10. Single-Select Option Catalog

This is a consolidated reference of every single-select field and its options across all tables. Use this when configuring the Airtable base to ensure no options are missed.

### Target Personas

| Field | Options |
|---|---|
| Status | Draft, Ready to Run, Running, Complete, Error, No Results, Input Error |
| Company Size | 1-10, 11-50, 51-200, 201-500, 500+ |

### Leads

| Field | Options |
|---|---|
| Website Status | Valid, Invalid, Timeout, Redirected, Blocked, Parked, Missing, Unknown |
| LinkedIn Status | Valid, Invalid, Bot-Blocked, Missing, Unknown |
| About Source | Website, LinkedIn, Both, None |
| Email Status | Deliverable, Invalid, Unknown, Accept-All, Disposable, Role-Address, Skipped, Error |
| Message Generation Status | Generated, Failed, Incomplete, Skipped, Limited Context |
| Pipeline Status | Queued, Scraping, Verifying, Validating Email, Generating Messages, Complete, Partial, Error, Skipped, Needs Review |
| Error Stage | Scraping, Website Verification, LinkedIn Verification, Email Validation, Message Generation, Airtable Write |

### Run Logs

| Field | Options |
|---|---|
| Status | Running, Complete, Partial, Failed, No Results |

---

## Appendix: Quick Setup Checklist

Use this checklist when creating the Airtable base to ensure nothing is missed.

- [ ] Create base named "WK5-LeadGen"
- [ ] Create table "Target Personas" with 9 fields
- [ ] Configure Status single-select with 7 options and colors
- [ ] Configure Company Size single-select with 5 options
- [ ] Create table "Leads" with 32 fields
- [ ] Configure all 7 single-select fields on Leads with their respective options
- [ ] Set up the Usable formula field: `IF(AND({Email Status} = "Deliverable", {Pipeline Status} = "Complete"), TRUE(), FALSE())`
- [ ] Create "Source Persona" linked record field pointing to Target Personas
- [ ] Create table "Run Logs" with 11 fields
- [ ] Create "Persona" linked record field pointing to Target Personas
- [ ] Configure all views per Section 6 (5 views on Target Personas, 7 views on Leads, 3 views on Run Logs)
- [ ] Verify Auto-number fields have correct prefixes (LEAD-, RUN-)
- [ ] Test: create a persona record, change status to "Ready to Run", confirm the n8n trigger fires
- [ ] Test: verify the Usable formula returns correct results for sample data
