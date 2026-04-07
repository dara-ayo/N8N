# Loom Demo Video Script
**Duration:** 5-8 minutes
**Speaker:** Ayodele Oluwafimidaraayo

---

## INTRO (30 seconds)

"Hi, I'm Ayodele Oluwafimidaraayo, and this is ContentFlow — a content generation and publishing automation I built for Fetemi Marketing.

The problem is simple: creating content for multiple platforms is slow and repetitive. A content manager brainstorms an idea, writes an article, then manually reformats it for LinkedIn, X, and email newsletters. That process takes hours.

ContentFlow turns that into under 2 minutes. One idea in, three platform-ready posts out."

---

## THE SYSTEM (45 seconds)

*Show the n8n workflow at https://your-n8n-instance.app.n8n.cloud/workflow/4s1Qyu5nguAssl39*

"Here's the n8n workflow powering everything — 84 nodes across three webhook entry points:

- Content Submit: takes a raw idea or URL, generates 3 SEO-optimized drafts from different angles
- Draft Select: adapts the chosen draft for LinkedIn, X, and newsletter
- Publish: pushes content to real platforms

The workflow runs on n8n Cloud, so it's always on. The database is Supabase, and the frontend is on Vercel."

---

## DEMO: HAPPY PATH (2-3 minutes)

*Open https://frontend-mu-dusky-q22nkox9f9.vercel.app*

"Let me walk through the full flow.

**Step 1 — Dashboard.** Here's the dashboard showing all submissions with stats — total submissions, pending review, published, scheduled. There's a search bar and filter pills.

**Step 2 — New Submission.** I'll click 'New Submission.' I can submit a raw idea or paste a URL — the system handles blog posts, YouTube videos, and Instagram reels. YouTube videos get their actual transcript extracted, not just the description.

I'll type: 'Why small businesses should prioritize email marketing over social media ads.'

I can also pick the tone — Professional, Casual, Bold — and the language. I'll keep Professional and English.

*Click Generate Drafts*

**Step 3 — Waiting.** You can see the progress steps — extracting content, generating Draft 1, 2, 3. This takes about 60 seconds because each draft is generated sequentially. That's intentional — each draft includes a summary of the previous ones so the AI produces genuinely different angles, not three rephrased versions of the same thing.

**Step 4 — Review Drafts.** Three drafts are ready. I can read each one in full — this is a full-width reader, not cramped cards. Each draft shows an SEO score, readability grade, and top keyword phrases.

Draft 1 is the contrarian angle, Draft 2 is how-to, Draft 3 is data-driven.

*Click Select Draft 1*

**Step 5 — Adapted Content.** The system adapted it for all three platforms. I can switch between LinkedIn, X, and Newsletter tabs.

- LinkedIn: clean plain text with PAS structure, no markdown symbols
- X/Twitter: under 280 characters
- Newsletter: proper HTML email with headers and formatting

I can edit any of these before publishing. There's also an image recommendation section with search terms and direct links to Unsplash and Pexels.

**Step 6 — Publish.** I select which platforms to publish to, optionally set a schedule date, and hit Publish."

---

## DEMO: EDGE CASE (1 minute)

"Now let me show what happens when things go wrong.

**Duplicate detection:** If I try to submit the same idea again within 10 minutes, the system blocks it with a 409 error — 'Duplicate submission detected.' This prevents wasted API calls.

**Invalid input:** If I submit an empty form, I get a clear validation error. If I submit a broken URL, same thing.

**URL extraction:** The system uses smart article extraction — it finds the actual article content using semantic HTML tags like article and main, and strips out navigation, sidebars, cookie banners, and sign-up forms. If a URL returns a 404, it fails gracefully with an error message.

These aren't theoretical — every one of these was tested and verified."

---

## KEY DESIGN DECISIONS (1 minute)

"A few decisions worth calling out:

**Sequential draft generation** — Drafts are generated one at a time, not in parallel. Each prompt includes summaries of previous drafts. This costs about 30 seconds extra but produces genuinely distinct articles.

**Optimistic locking** — When a manager selects a draft, the submission status changes to 'processing' immediately. If someone else tries to select the same draft at the same time, they're blocked. No race conditions.

**Idempotency keys** — Every publish request has a unique key like submission_id + platform. If the same publish fires twice, the platform API ignores the duplicate.

**Cost awareness** — We use gpt-4o-mini instead of gpt-4o. Adaptation only runs after a human selects a draft, not for all three. Dedup prevents regenerating identical content."

---

## WHAT I'D IMPROVE (30 seconds)

"If I started over, I'd deploy to cloud from day one. I built locally first, then had to migrate — that caused issues with credential management and redirect URLs.

I'd also add real-time Supabase subscriptions instead of polling, and implement proper content scheduling with a cron job that publishes at the scheduled time."

---

## CLOSE (15 seconds)

"That's ContentFlow — idea to published content in under 2 minutes, with production-grade reliability. The app is live at the Vercel URL, the workflow runs on n8n Cloud, and it works whether my laptop is on or off.

Thank you."

---

## LINKS TO SHOW ON SCREEN

- Frontend: https://frontend-mu-dusky-q22nkox9f9.vercel.app
- n8n Workflow: https://your-n8n-instance.app.n8n.cloud/workflow/4s1Qyu5nguAssl39
- GitHub: https://github.com/dara-ayo/contentflow-frontend
