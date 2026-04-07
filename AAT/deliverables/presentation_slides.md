# Content Generation & Publishing Automation

**Built by Ayodele Oluwafimidaraayo**
**Fetemi Marketing | Week 4 Project**
**March 2026**

---

# The Problem

- Content creation is **manual and slow** -- 2-4 hours per topic, per platform
- Adapting one article for LinkedIn, X, and email means **3x the effort**
- SEO quality is **inconsistent** across team members
- Publishing is **disconnected** -- copy-paste into each platform separately
- Creative energy goes to **reformatting**, not strategy

> The team needs a system that turns one idea into publish-ready content for 3 platforms -- fast.

---

# Solution Overview

**One idea in. Three platforms out.**

```
  +------------------+       +---------------------+       +--------------------+
  |   CONTENT IDEA   |       |   3 SEO-OPTIMIZED   |       |  PLATFORM-READY    |
  |   or URL input   | ----> |   ARTICLE DRAFTS    | ----> |  ADAPTED CONTENT   |
  |   (YouTube,      |       |                     |       |                    |
  |   Instagram,     |       |   1. Contrarian     |       |   LinkedIn post    |
  |   blog, raw)     |       |   2. How-To         |       |   X/Twitter tweet  |
  +------------------+       |   3. Data & Trends  |       |   Email newsletter |
                              +---------------------+       +--------------------+
                                       |                             |
                                Human selects                  One-click
                                 best draft                    publish
```

- AI generates, **humans decide** -- every draft is reviewed before publishing
- 3 distinct angles ensure **creative variety**, not 3 versions of the same take

---

# Tech Stack

| Layer           | Technology                     | Role                                    |
|-----------------|--------------------------------|-----------------------------------------|
| Automation      | **n8n** (2 workflows, 107+ nodes) | Content pipeline + operations           |
| Frontend        | **React 18** + Tailwind CSS    | Dark/Light theme system (ThemeContext + CSS custom properties) -- fixed sidebar, glass-morphism cards, Command-K search, full-width draft reader, gradient CTAs, skeleton loading |
| Database + Auth | **Supabase** (PostgreSQL)      | Data storage, RLS, magic link auth      |
| AI              | **OpenAI** GPT-4o-mini         | Draft generation + platform adaptation  |
| Email           | **Resend**                     | Newsletter delivery                     |
| Social          | **LinkedIn API** (OAuth 2.0)   | Direct post publishing                  |

---

# How It Works: Content Intake

**Submit an idea or paste a URL -- the system does the rest.**

- Accepts **raw ideas** ("Remote work reshaping real estate") or **URLs**
  - Blog posts (any website) -- semantic HTML extraction: targets `<article>`, `<main>`, `role="main"` to find actual content; strips nav, sidebars, sign-up forms, and cookie banners; falls back to the section with the most `<p>` tags
  - YouTube videos (youtube.com/watch, /shorts, youtu.be) -- Python microservice extracts the actual spoken transcript from caption tracks; falls back to video description only if no captions exist
  - Instagram posts/reels (/p/, /reel/) -- caption extraction from meta tags
  - Medium articles -- content extraction
  - Any public webpage with text content
- System generates **3 unique drafts**, each from a different angle:
  - **Contrarian** -- challenges assumptions, provocative counter-take
  - **How-To** -- actionable, step-by-step guide
  - **Data & Trends** -- statistics-backed analysis
- Drafts generated **sequentially** -- each one aware of previous angles to ensure genuine diversity
- Built-in **deduplication** -- prevents resubmitting the same idea within 10 minutes

---

# How It Works: SEO Integration

**Every draft follows strict SEO best practices -- automatically.**

- Primary keyword placed in **title + first 100 words**
- Proper heading hierarchy: **H1 -> H2 -> H3** (no skipping levels)
- Written at **Grade 7 readability** -- clear, accessible language
- Internal and external **link suggestions** included
- **Image placeholders** with alt-text recommendations
- Each draft validated: minimum **300 words**, no meta-commentary
- Content grounded in source material, not hallucinated

---

# How It Works: Platform Adaptation

**One draft becomes three platform-ready pieces.**

| Platform      | Format                                                     |
|---------------|------------------------------------------------------------|
| **LinkedIn**  | PAS technique (Problem-Agitation-Solution), plain text, strong CTA, max 3000 chars |
| **X/Twitter** | 280-character hard limit, 1-2 hashtags, sentence-boundary truncation |
| **Newsletter**| HTML email with subject line, 250-600 words, skimmable layout, clear CTA |

- Each adaptation uses **platform-specific prompts** -- not just trimmed versions
- Optimistic locking prevents **duplicate processing** during adaptation

---

# How It Works: Publishing

**One-click publish to all connected platforms.**

| Platform      | Status                | Details                                    |
|---------------|-----------------------|--------------------------------------------|
| **LinkedIn**  | Live                  | OAuth 2.0, Fetemi's account connected      |
| **X/Twitter** | Built, paused         | OAuth + PKCE complete -- API credits depleted |
| **Newsletter**| Live                  | Resend API, delivery confirmed             |

- Per-platform **status tracking** -- see what published and what failed
- **Idempotency keys** prevent duplicate posts on retry
- Automatic **token refresh** when OAuth credentials expire
- Partial failure handled gracefully -- one platform failing doesn't block others

---

# Live Demo Flow

**What a user sees, step by step:**

1. **Dashboard** -- Fixed left sidebar navigation; glass-morphism stat cards show pipeline status at a glance
2. **New Submission** -- Command-K style search with filter pills; enter a content idea or paste a URL
3. **Wait for Drafts** -- Skeleton loading state while the pipeline runs; background polling refreshes status with no UI flash
4. **Read Drafts One at a Time** -- Full-width draft reader with tab navigation (not 3 cramped cards); users read each draft sequentially and pick the strongest angle
5. **Select Draft** -- Choose the angle to move forward with
6. **Review Adapted Content** -- Tabs show LinkedIn | X | Newsletter versions of the selected draft, each adapted to platform format
7. **Edit** -- Inline editing before publish
8. **Publish** -- Unified publish section: check platforms (LinkedIn, X, Newsletter), optionally pick a schedule date/time, then "Publish Now" or "Schedule"; after publishing the section shows "Republish Selected" with last-published date
9. **Verify** -- Check published content live on each platform

---

# Advanced Features

**Ten additional capabilities built beyond the core pipeline.**

| Feature | What It Does |
|---------|-------------|
| **AI Content Score** | Each draft displays real-time quality metrics: SEO score (0-100), readability grade, keyword density -- calculated client-side, no API calls |
| **Tone Selector** | Users choose content tone before generation: Professional, Casual, Bold, Educational, Storytelling -- passed directly into AI prompts |
| **Multi-Language Support** | Output language selector: English, Spanish, French, German, Portuguese, Arabic, Chinese, Hindi -- AI generates drafts in the chosen language |
| **Content Analytics** | Dashboard panel showing weekly submission trends, average word count per week, and platform publishing split |
| **Content Calendar** | Monthly calendar view with published (purple dots) and scheduled (amber dots) content -- click any day to see what was published |
| **Duplicate Content Warning** | While typing a new idea, the system checks existing submissions for similar topics and warns the user before they submit |
| **Post Scheduling** | datetime-local picker lets users schedule posts for a future date and time -- scheduled time saved to `adapted_content` table |
| **Unified Publish/Republish UX** | Single publish section with platform checkboxes (LinkedIn, X, Newsletter) + optional schedule date; before publishing shows "Publish Now" or "Schedule"; after publishing transforms to "Republish Selected" with last-published date shown |
| **Dark/Light Mode** | Full theme system with ThemeContext and CSS custom properties; three options: Dark, Light, System; toggle in sidebar and Settings page |
| **One-Click Republish** | Published submissions can be republished to specific platforms -- select target platforms and hit "Republish Selected" |

- Content Score and Duplicate Warning run **entirely client-side** -- no extra API calls, no latency
- Tone and Language are passed as parameters into the existing AI prompt structure
- Analytics and Calendar are read-only views over data already stored in Supabase
- Scheduling stores the target datetime in `adapted_content`; no separate pipeline required
- Theme preference persisted via ThemeContext; accent purple unchanged across light and dark modes

---

# Technical Highlights

- **Sequential draft generation** -- each draft prompt includes previous angles, producing genuinely distinct articles instead of rephrased duplicates
- **Optimistic locking** -- submission status set to "processing" before adaptation, preventing race conditions from double-clicks or retries
- **Content deduplication** -- SHA hash + 10-minute sliding window returns 409 on duplicate submissions
- **YouTube transcript extraction** -- Python microservice pulls actual spoken transcript from caption tracks; falls back to description if no captions exist
- **Smart article extraction** -- targets semantic HTML (`<article>`, `<main>`, `role="main"`), strips boilerplate (nav, sidebars, cookie banners), falls back to section with most `<p>` tags
- **Instagram caption extraction** -- pulls captions from og:description meta tags for post/reel content
- **In-memory cache** -- instant page transitions with no re-fetch on navigation
- **Background polling** -- status refreshes silently in the background with no UI flash on update
- **Invisible auth loading** -- auth state resolved before first render; no visible loading spinner on login
- **n8n 2.13 operator compatibility** -- uses notEquals instead of isNotEmpty for reliable conditional routing
- **LinkedIn API** -- /rest/posts with urn:li:person format (not deprecated ugcPosts endpoint)
- **OAuth token management** -- server-side token exchange (LinkedIn OAuth 2.0, Twitter PKCE), automatic refresh on expiry
- **4-tier RBAC** -- Owner > Admin > Editor > Viewer, enforced at database level via Supabase RLS

---

# Results

**Working end-to-end pipeline -- from idea to published content.**

- **9/9 end-to-end tests passed** across the full pipeline
- LinkedIn publishing **LIVE** -- posted to personal account successfully
- Newsletter email **LIVE** -- sent via Resend, delivery confirmed
- All **3 URL types work**: webpage extraction, YouTube transcript, Instagram caption
- Content formatting **verified**: LinkedIn (clean plain text), X (under 280 chars), Newsletter (HTML wrapped)
- Frontend build completes in **under 1 second**

---

# Enhanced Settings Page

**Four new sections added to the Settings page.**

| Section | What It Contains |
|---------|-----------------|
| **Appearance** | Dark / Light / System theme toggle -- saves preference immediately via ThemeContext |
| **Notifications** | Toggle switches for email alerts: drafts ready, publish complete, errors |
| **Content Defaults** | Default tone and language preferences saved to localStorage and pre-populated on new submissions |
| **About** | App version, builder (Ayodele Oluwafimidaraayo), agency (Fetemi Marketing) |

- Notification toggles and content defaults persist across sessions via **localStorage** -- no backend call required
- System theme option follows the OS `prefers-color-scheme` media query automatically

---

# What's Next

- **Twitter re-enable** -- restore publishing when API credits are renewed
- **AI prompt tuning** -- optimize generation based on historical performance data
- **Parallel publishing** -- fire all three platform API calls simultaneously to reduce end-to-end publish time
- **Proactive token refresh** -- scheduled OAuth refresh every 30 minutes instead of on-demand
- **Webhook security** -- HMAC signature verification on n8n webhook endpoints
- **Queue depth feedback** -- surface n8n execution queue status in the frontend so users understand delays

---

# Thank You

**Built by Ayodele Oluwafimidaraayo**
**Fetemi Marketing | Week 4**

**React + n8n + Supabase + OpenAI**

Questions?
