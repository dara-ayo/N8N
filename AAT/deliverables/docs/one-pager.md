# Content Generation & Publishing Automation

| | |
|---|---|
| **Owner** | Ayodele Oluwafimidaraayo |
| **Client** | Fetemi Marketing Agency |
| **Stack** | 2 n8n workflows, React/Tailwind frontend, Supabase |
| **Last Updated** | 2026-03-25 |

---

## Purpose & Success Criteria

**Who is this for?**
Content managers at Fetemi Marketing Agency who produce and publish articles across LinkedIn, X/Twitter, and email newsletters.

**What problem does it solve?**
Creating platform-specific content from a single idea is slow and repetitive. A manager currently writes an article, then manually rewrites it for LinkedIn's format, compresses it into 280 characters for X, and reformats it again for email. This takes hours per piece, and quality degrades by the third rewrite because the messaging drifts between platforms.

**What does the system do?**
It takes a content idea (typed text or a URL) and produces three distinct article drafts. The manager picks the best one. The system then adapts that draft for LinkedIn, X/Twitter, and email newsletter -- each formatted to platform-specific rules -- and either publishes immediately or saves for scheduling.

**What changes when it's running?**
- Time per content piece drops from hours to minutes.
- Platform messaging stays consistent because all versions derive from the same selected draft.
- Every draft, adaptation, and publish action is recorded with timestamps.
- Duplicate content is automatically prevented.

**How is success measured?**
- Manager's active involvement per content piece is reduced to two actions: submit idea, pick draft.
- All three platform versions are produced from every selected draft without manual rewriting.
- Zero duplicate posts across platforms.
- System handles edge cases (bad input, API failures, expired submissions) without crashing.

---

## How It Works

1. **Content intake.** The manager submits a content idea or reference URL. The system validates the input and checks it hasn't been submitted recently.

2. **Draft generation.** Three article drafts are generated from distinct angles -- a contrarian take, a practical how-to, and a data-driven analysis. Each draft is checked for quality (word count, formatting, no AI artifacts).

3. **Human review.** The manager reads all three drafts in the web interface and selects the one they want to move forward with.

4. **Platform adaptation.** The selected draft is rewritten for three platforms:
   - **LinkedIn:** Long-form post using Problem-Agitate-Solution structure, under 3,000 characters.
   - **X/Twitter:** Condensed to 280 characters with smart truncation at sentence boundaries.
   - **Email newsletter:** 250-600 words with an auto-generated subject line.

5. **Publishing.** Adapted content is either published immediately to all platforms or saved for later scheduling. Every publish includes a safeguard against duplicate posting.

---

## How to Use It

### Step 1: Submit a content idea
Open the web interface. Enter either a raw content idea (a topic, thesis, or rough notes) or paste a URL to a reference article. Click Submit.

### Step 2: Wait for drafts
The system takes approximately 60-90 seconds to generate three drafts. The interface shows a progress indicator. You'll see three draft cards appear when generation is complete.

### Step 3: Review and select
Read all three drafts. Each takes a different angle on your topic. Click "Select" on the one you want to publish. You can only select one.

### Step 4: View adapted content
The system adapts your selected draft for LinkedIn, X, and email newsletter. This takes about 30 seconds. You'll see the adapted versions for each platform.

### Step 5: Publish or schedule
Choose "Publish Now" to post immediately to all platforms, or "Save for Later" to store the content for manual scheduling.

---

## Appendix

### Assumptions
- The agency publishes to LinkedIn, X/Twitter, and email newsletter (three platforms).
- One content manager uses the system at a time (single-tenant, single-user design).
- The manager submits 2-3 content pieces per day.
- SEO rules and platform formatting rules change infrequently (hardcoded in prompts).
- The manager can adequately judge content quality from the three generated drafts (no automated fact-checking).

### Limitations
- **No post-adaptation review.** The system adapts and can publish without a second approval step after adaptation. If the AI produces a poorly adapted tweet, it goes live if "Publish Now" is selected.
- **AI quality is non-deterministic.** Drafts are validated for structure (word count, title, formatting) but not for factual accuracy or tone. The manager is the quality gate.
- **Single-tenant only.** The database and access controls assume one agency. Supporting multiple teams would require schema and RLS changes.
- **No built-in scheduling interface.** "Save for Later" stores content but doesn't offer a calendar or time picker for scheduling. Scheduled publishing requires a separate tool or manual action.
- **No unpublish mechanism.** Once content is published, the system cannot retract it. Manual intervention is required on each platform.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "This idea was already submitted" | Duplicate submission within 10 minutes | Check pending reviews for the existing submission |
| Drafts take longer than 2 minutes | AI API under heavy load | Wait and retry; the system retries automatically 3 times |
| "Couldn't extract content from this URL" | URL is paywalled, returns 403, or requires JavaScript | Submit a raw idea instead of the URL |
| "This submission has expired" | More than 72 hours since the drafts were generated | Resubmit the original idea for fresh drafts |
| Draft selection returns an error | Submission already selected or being processed | Refresh the page; if the submission shows "processing," wait for it to complete |
| Published content looks truncated | Platform character limits enforced after AI generation | Review the adapted content in the interface; X posts are always truncated to 280 chars |
