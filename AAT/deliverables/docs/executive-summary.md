# Executive Summary

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo
**Client:** Fetemi Marketing Agency
**Stack:** 2 n8n workflows + React/Tailwind frontend + Supabase
**Date:** 2026-03-25

---

## Overview

This system takes a raw content idea or a URL and turns it into three distinct, SEO-optimized article drafts. A content manager picks the best one, and the system adapts it for LinkedIn, X/Twitter, and email newsletter -- then either publishes immediately or saves it for scheduling. The entire pipeline runs across two n8n workflows with a React frontend for the human review step and Supabase as the persistence layer.

---

## Business Problem

Fetemi Marketing Agency creates content for three platforms: LinkedIn, X/Twitter, and email newsletters. Before this system, the process looked like this:

1. A content manager comes up with a topic idea or finds a reference article.
2. They write (or commission) a full article manually.
3. They rewrite that article three times: once for LinkedIn's long-form format, once squeezed into 280 characters for X, and once reformatted for email with a subject line.
4. They publish to each platform separately.

This process takes hours per piece of content. The quality is inconsistent because by the third rewrite, the manager is tired and cutting corners. The messaging drifts between platforms -- the LinkedIn post says one thing, the tweet says something subtly different, and the newsletter goes in a third direction. There's no systematic quality check, no duplicate prevention, and no audit trail of what was published where.

The agency submits 2-3 content pieces per day. At that volume, the manual process is the bottleneck holding back their content output.

---

## Solution

The system automates everything after the initial idea. The content manager's job shrinks to two actions: submit an idea (or a URL), and pick which draft angle they like best. Everything else -- draft generation, platform adaptation, character limit enforcement, publishing -- is handled by the automation.

The system generates three article drafts from genuinely different angles (Contrarian, How-To, and Data & Trends), not three rephrased versions of the same argument. Each draft gets validated for minimum quality (300+ words, no AI meta-commentary, proper title extraction). The selected draft gets adapted for each platform with format-specific rules: PAS technique for LinkedIn, hard 280-character enforcement for X, and 250-600 word newsletter with an extracted subject line.

---

## System Behavior

**Phase 1 -- Intake and Draft Generation:**
The manager submits a raw idea or URL through the React frontend. The first n8n workflow validates the input, checks for duplicate submissions (content hash within a 10-minute window), and extracts article text from URLs if provided. It then generates three SEO-optimized drafts sequentially, passing each previous draft's angle into the next prompt to force diversity. All three drafts are stored in Supabase and returned to the frontend for review.

**Human Review Step:**
The manager reads the three drafts in the frontend and selects one. This is the only manual step in the pipeline. The system handles the gap between generation and selection through Supabase -- the first workflow completes fully, and the second workflow triggers independently when the manager makes their choice.

**Phase 2 -- Adaptation and Publishing:**
The second n8n workflow picks up the selected draft, locks the submission to prevent duplicate processing, and adapts the content for all three platforms. LinkedIn gets PAS-formatted content under 3,000 characters. X/Twitter gets a version with hard truncation at sentence boundaries to stay under 280 characters. The newsletter gets a 250-600 word version with an AI-generated subject line. Content is either published immediately or saved for scheduling.

---

## Key Design Decisions

### Why two separate workflows instead of one

The obvious approach is a single workflow that generates drafts, waits for the manager's selection, then adapts and publishes. The problem: n8n workflows aren't built for indefinite pauses. A manager might take 10 minutes to review drafts, or 10 hours. Keeping a workflow execution alive that whole time is fragile -- if n8n restarts, the execution dies and the submission is lost.

Two separate workflows solve this cleanly. Workflow 1 runs start-to-finish (intake through draft generation), persists everything to Supabase, and terminates. Workflow 2 triggers fresh from the manager's selection webhook, loads the full context from Supabase, and runs start-to-finish (adaptation through publishing). Each workflow has its own error handling, its own retry logic, and its own execution logs. An n8n restart between the two phases has zero impact.

### Why sequential draft generation instead of parallel

Generating three drafts in parallel would be faster by 30-45 seconds. But parallel generation means each AI call operates in isolation -- it doesn't know what angles the other drafts are taking. The result is three articles that often overlap in argument or tone.

Sequential generation lets each prompt include a summary of the previous draft's angle: "Draft 1 took a contrarian stance arguing X. Draft 2 was a practical how-to covering Y. Now write Draft 3 as a data-driven analysis that doesn't repeat either angle." This produces genuinely distinct articles. The 30-45 second penalty is invisible because the next step is a human reading three articles, which takes minutes.

Sequential generation also avoids cost waste. If Draft 1 fails (rate limit, timeout, content filter), the parallel approach has already fired off Drafts 2 and 3. Those tokens are burned on drafts that can't be used alongside a failed sibling. Sequential generation stops at the point of failure and retries only what failed.

### Why optimistic locking on draft selection

When the manager clicks "Select Draft 2," two things can go wrong: they double-click and fire two webhooks, or their browser retries on a slow response. Without protection, both requests would trigger full adaptation and potentially double-publish.

The system uses a status field as an optimistic lock. Before adaptation starts, the submission status is updated from `pending_review` to `processing`. The second request finds `status=processing` instead of `pending_review` and gets rejected with a clear message. First write wins. This is simple, requires no external locking service, and works reliably for a single-tenant internal tool.

### Why Supabase as the state bridge

The system needed somewhere to persist submission state between the two workflow phases. I considered Airtable (prior experience) and a simple JSON store. Supabase won for three reasons: the React frontend needs a database anyway for direct reads, Supabase's REST API is predictable with n8n's HTTP Request node (no empty-result surprises like Airtable), and Row Level Security provides access control without building a separate auth layer.

Supabase also gives the frontend real-time-ish status updates through polling. The frontend checks the submission's status field every few seconds and updates the UI when it changes from `generating` to `pending_review` to `processing` to `published`.

---

## Outcome

When the automation runs successfully:

- **Time per content piece drops from hours to minutes.** The manager's active involvement is reduced to two actions: submit an idea, pick a draft. Everything else is automated.
- **Platform consistency improves.** All three platform versions derive from the same selected draft, so the core message stays aligned across LinkedIn, X, and newsletter.
- **Quality has a floor.** Every draft is validated for minimum word count and format. Every X post is hard-checked against the 280-character limit. Every newsletter has a subject line and falls within the target word range.
- **Duplicate content is prevented.** Content hashing catches accidental double-submissions. Idempotency keys on publish operations prevent duplicate posts even if the workflow retries.
- **There's an audit trail.** Every submission, every generated draft (including rejected ones), every adapted version, and every publish action is recorded in Supabase with timestamps and status transitions.

Test results confirm reliability: 27 test cases passing, burst testing at 90% success rate under 20 concurrent submissions, sustained load at 93% over 100 submissions in 60 seconds, and 15 poison payloads handled without a single crash.
