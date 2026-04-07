# Content Generation & Publishing Automation

**Owner:** Ayodele Oluwafimidaraayo
**Agency:** Fetemi Marketing
**Key Links:**
- Frontend: https://frontend-mu-dusky-q22nkox9f9.vercel.app
- n8n Cloud: https://your-n8n-instance.app.n8n.cloud
- GitHub: https://github.com/dara-ayo/contentflow-frontend

**Last Updated:** 2026-03-27

---

## Purpose & Success Criteria

**Who it is for:** Fetemi Marketing's content team — specifically the content managers responsible for producing and publishing across LinkedIn, X, and an email newsletter.

**The problem:** Creating and publishing one piece of content required brainstorming, writing a full SEO article, manually reformatting it three times for three different platforms, and publishing each separately. This took hours per post and was hard to scale consistently.

**What it does:** A content manager submits a raw idea or a URL. The system generates three SEO-optimized article drafts from distinct angles (contrarian, practical how-to, data-driven). The manager picks one. The system adapts it for LinkedIn, X, and a newsletter. The manager reviews and publishes with one click.

**Success:** The content pipeline from idea to published goes from several hours to under 2 minutes of active work.

---

## How It Works

```
Content Manager
      |
      | submits idea or URL (blog, YouTube, Instagram)
      v
[React Frontend] ──POST──> [n8n: /content-submit]
                                    |
                            Input validation + dedup check
                                    |
                            URL? ──yes──> Extract text from page
                                    |
                            Generate Draft 1 (Contrarian angle)
                            Generate Draft 2 (Practical how-to)
                            Generate Draft 3 (Data & trends)
                                    |
                            Save to Supabase → return previews
                                    |
[Manager reviews 3 drafts in UI, selects one]
                                    |
      | selects draft
      v
[n8n: /draft-select]
      |
      Lock submission (prevents double-select)
      |
      Adapt for LinkedIn (PAS format, plain text, ≤3000 chars)
      Adapt for X/Twitter (280 chars hard limit)
      Adapt for Newsletter (HTML email, subject line, 250-600 words)
      |
      Save adapted content to Supabase
      |
[Manager reviews each platform tab, edits if needed, clicks Publish]
      |
      v
[n8n: /publish-content]
      |
      Fetch credentials from Supabase
      Refresh expired tokens if needed
      |
      Post to LinkedIn API ──> live post on Fetemi's LinkedIn
      Post to X API ──────── > tweet (API credits permitting)
      Send via Resend ──────> newsletter to subscriber list
      |
      Update submission status → "published"
```

---

## How to Use It

1. Open the app: https://frontend-mu-dusky-q22nkox9f9.vercel.app
2. Log in with your email — a magic link will be sent to your inbox
3. Click **New Submission** on the dashboard
4. Enter a raw content idea, or paste a URL (blog article, YouTube video, or Instagram post)
5. Choose your preferred tone and language, then submit
6. Wait approximately 60 seconds while the system generates 3 drafts
7. Read each draft and click **Select** on your preferred one
8. Review the adapted content in the LinkedIn, X, and Newsletter tabs
9. Edit any tab directly in the UI if adjustments are needed
10. Click **Publish** to send to all connected platforms immediately

---

## Appendix

**Assumptions:**
- OpenAI API key is active and has available credits
- Supabase project is running and accessible
- LinkedIn OAuth token is connected and not expired (check Settings page; tokens last 60 days)
- Resend API key is configured for newsletter sending

**Limitations:**
- YouTube transcript extraction requires `transcript_server.py` to be running locally on port 3456; without it the system falls back to the video description
- Twitter/X publishing is built and OAuth-connected but currently blocked by depleted free-tier API credits
- The system publishes to one LinkedIn account at a time (the one connected in Settings)

**Troubleshooting:**
- Drafts not generating: check the n8n Cloud execution log at https://your-n8n-instance.app.n8n.cloud for the failed execution — the error message will identify which node failed
- LinkedIn publishing fails: go to Settings and reconnect the LinkedIn account; the token may have expired
- Submission stuck in "generating": the Operations workflow cleanup job runs every 10 minutes and will move it to "error" status automatically
