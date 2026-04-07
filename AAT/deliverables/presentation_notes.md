# Content Generation & Publishing Automation — Speaker Notes

**Presenter:** Ayodele Oluwafimidaraayo
**Duration:** 10-15 minutes
**Date:** March 2026

---

## Slide 1: Title (30 seconds)

Welcome everyone. I'm Ayodele Oluwafimidaraayo and today I'll be walking you through the Content Generation and Publishing Automation system I built.

This project turns a single content idea into fully formatted, SEO-optimized posts across LinkedIn, X/Twitter, and email newsletters — with human oversight, role-based team collaboration, and one-click multi-platform publishing.

**Key point to land:** This is end-to-end automation with human oversight and team collaboration, not full autopilot.

---

## Slide 2: Problem Statement (45 seconds)

The core problem: content creation is manual and time-consuming.

- A single blog topic takes **2-4 hours** when you factor in LinkedIn formatting, Twitter's character limits, and newsletter layout.
- That's effectively **3x the effort** for every content idea.
- There's no centralized system for team collaboration — everyone works in silos.
- Publishing is disconnected across platforms — manual copy-paste into each one.
- SEO optimization is inconsistent, and creative energy is wasted on reformatting.

**Transition:** "So the question became: how do we automate the repetitive parts while keeping humans in control and enabling team collaboration?"

---

## Slide 3: Solution Overview (45 seconds)

The solution is an AI-powered content system with six key capabilities:

1. AI-powered generation from ideas or URLs
2. Three distinct draft angles per submission for variety
3. Automatic platform adaptation for LinkedIn, X, and Newsletter
4. One-click publishing to all connected platforms
5. Role-based team collaboration with four permission levels
6. Human-in-the-loop: AI generates options, humans make the final call

**Point to the flow diagram** at the bottom to show the five-step process from idea to published content.

---

## Slide 4: System Architecture (1 minute)

The architecture has four layers connected together:

- **React Frontend** — the user interface for content management and team collaboration
- **4 n8n workflows** — each handling a specific responsibility (intake, adaptation, OAuth, publishing)
- **Supabase** — the central database handling state management, authentication, RBAC via Row Level Security, and encrypted credential storage
- **Platform APIs** — Twitter v2, LinkedIn, and Resend for newsletters

This is a deliberate separation of concerns. Each workflow has a single responsibility, and Supabase as the shared state store means they operate independently.

---

## Slide 5: Workflow 1 — Content Intake & Draft Generation (1 minute)

Workflow 1 receives an idea or URL and produces three SEO-optimized drafts.

The process: validate the input (size, format, injection protection), check for duplicates using content hashing with a 10-minute dedup window, extract content from URLs if provided, then generate three drafts **sequentially** — Contrarian, How-To, and Data & Trends.

**Why sequential?** Each draft gets context from previous ones, ensuring genuinely different angles. It also manages API costs and avoids rate limits.

The whole process takes about 15-20 seconds using GPT-4o-mini.

---

## Slide 6: Workflow 2 — Platform Adaptation (45 seconds)

After a human selects the best draft, Workflow 2 adapts it for all three platforms.

First, the submission is locked to prevent concurrent modifications. Then it adapts for:
- **LinkedIn** using Problem-Agitation-Solution format for engagement
- **X/Twitter** within 280 characters with relevant hashtags
- **Newsletter** with a compelling subject line and HTML body

Point to the sample outputs on the right — each maintains the same core message but is optimized for its platform's format and best practices.

Takes about 10-15 seconds.

---

## Slide 7: Workflows 3 & 4 — OAuth & Publishing (1 minute)

These are the two newest workflows that complete the end-to-end pipeline.

**Workflow 3** handles OAuth token exchange. It manages both OAuth 2.0 for LinkedIn and OAuth 1.0a for Twitter — which is significantly more complex due to signature-based authentication. Tokens are encrypted and stored in Supabase, with automatic refresh on expiry.

**Workflow 4** handles the actual publishing. It fetches adapted content and platform tokens, publishes to all three APIs, and updates per-platform status.

**Key features to highlight:**
- Idempotency keys prevent duplicate posts
- Partial failure handling means one platform going down doesn't block the others
- Real-time status updates flow back to the frontend via Supabase

---

## Slide 8: Frontend — User Experience (45 seconds)

The frontend is designed for simplicity and security.

- **Magic link authentication** — no passwords, just a secure email link via Supabase Auth
- **Role-based UI** — features are shown or hidden based on the user's role
- **Dashboard** with real-time submission status updates
- **Draft review** with expand/collapse to compare all three angles
- **Adapted content preview** before publishing — you see exactly what will go live
- **Approval gate** — only Admin or Owner can trigger publishing

This ensures quality control while keeping the workflow fast.

---

## Slide 9: Frontend — Team & Platform Management (45 seconds)

Two key management areas:

**Team Management:** Invite members by email, assign roles (Owner, Admin, Editor, Viewer), update or remove roles. Changes take effect immediately because they're enforced at the database level through RLS policies.

**Platform Connections:** Connect LinkedIn via OAuth 2.0, Twitter via OAuth 1.0a, and Newsletter via Resend API key. View connection status, disconnect or reconnect at any time. Only the Owner can manage platform connections — this is a security measure to protect API credentials.

---

## Slide 10: RBAC — Role Permissions (45 seconds)

The RBAC system has four tiers in a strict hierarchy.

Walk through the table:
- **Everyone** can view content
- **Editors and above** can submit ideas and select drafts — they're the content creators
- **Admins and Owners** can approve, publish, and manage team members — they're the gatekeepers
- **Only Owners** can connect platform credentials — the highest security action

**Key point:** This is enforced at the database level via Supabase Row Level Security, not just in the UI. Even if someone bypasses the frontend, the database rejects unauthorized actions.

---

## Slide 11: Edge Cases & Error Handling (1 minute)

Eight categories of edge cases handled:

1. **Input validation** — size limits, unicode, injection protection
2. **Duplicate detection** — content hash + 10-minute window returns 409
3. **AI failures** — 3x exponential backoff before graceful error
4. **Partial publish failure** — per-platform handling, others continue
5. **Mid-execution recovery** — stale workflow cleanup
6. **Token expiry** — automatic OAuth refresh
7. **Twitter overflow** — smart sentence-boundary truncation
8. **Concurrent access** — optimistic locking prevents race conditions

Plus a dedicated error-trigger workflow that captures and logs all failures.

---

## Slide 12: Pressure Testing Results (45 seconds)

Five pressure test scenarios:

- **Burst:** 20 concurrent submissions — 90% success rate
- **Sustained:** 100 over 60 seconds — 93% success rate
- **Poison payloads:** 15 adversarial inputs — 100% handled correctly
- **Cascading failure:** When a platform API goes down, partial success is preserved
- **Data integrity:** Zero corruption across all scenarios

**27 test cases** pass in total. The system degrades gracefully under extreme load rather than failing catastrophically.

---

## Slide 13: Tech Stack (30 seconds)

Quick walk through the stack — point to each row:
- React 18 + Tailwind + Vite for the frontend
- n8n with 4 workflows and 80+ nodes for automation
- Supabase for database, auth, and RLS
- GPT-4o-mini for cost-optimized AI generation
- Twitter API v2, LinkedIn API, and Resend for publishing
- Magic Links + custom RBAC for authentication

---

## Slide 14: What I Learned (1 minute)

Five key learnings:

1. **n8n expressions** are powerful but require careful JSON escaping across node boundaries
2. **OAuth 1.0a** (Twitter) is fundamentally different from 2.0 (LinkedIn) — the signature-based auth adds real complexity
3. **Supabase RLS** is a game-changer for enforcing roles at the database level without building backend middleware
4. **Sequential AI generation** with context passing produces genuinely diverse drafts
5. Building **end-to-end** taught me how to connect all the pieces into a cohesive SaaS-like product

---

## Slide 15: Future Enhancements (30 seconds)

Seven future enhancements prioritized by impact:

1. Content scheduling with a calendar view
2. Analytics dashboard for engagement tracking
3. AI prompt optimization from performance data
4. Webhook security with HMAC signatures
5. Multi-organization support
6. Second approval gate after platform adaptation
7. Token cost tracking per submission

---

## Slide 16: Demo (2-3 minutes)

Live walkthrough of the complete flow:

1. Submit the idea "Remote work reshaping real estate"
2. View all 3 generated drafts — point out the different angles
3. Select the best draft
4. Show the adapted content for each platform
5. Walk through the approval gate — demonstrate role restriction
6. Publish and verify on each platform

**Tips:**
- Keep the demo moving — don't pause too long on any step
- Highlight the human-in-the-loop decision points
- If something fails, use it as an opportunity to show error handling

---

## Slide 17: Thank You (30 seconds)

Thank you for your time. This system demonstrates a complete end-to-end content automation pipeline with 4 n8n workflows, 3 publishing platforms, a 4-tier RBAC system, and a 93% success rate under load.

**Close:** "I'm happy to take any questions about the architecture, design decisions, or implementation."

---

## General Presentation Tips

- **Pace:** Aim for 10-15 minutes total. Spend more time on slides 5-7 (workflows) and the demo.
- **Emphasis:** RBAC and team collaboration are differentiators — highlight them.
- **Architecture:** The 4-workflow split shows mature system design thinking.
- **Trade-offs:** Be confident about sequential generation, magic links over passwords, RLS over middleware.
- **Numbers to remember:** 4 workflows, 80+ nodes, 3 platforms, 4 RBAC roles, 27 test cases, 93% success rate.
- **Anticipate questions about:**
  - Why n8n over other orchestration tools?
  - Why OAuth 1.0a for Twitter (it's their API requirement)?
  - How does RLS enforce role permissions?
  - What happens if the AI generates inappropriate content?
  - How would you add more platforms (e.g., Instagram, blog)?
  - Why sequential generation instead of parallel?
  - How are API credentials secured?
