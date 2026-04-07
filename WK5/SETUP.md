# Content Generation & Publishing Automation - Setup Guide

**Builder:** Ayodele Oluwafimidaraayo
**Date:** 2026-03-25

## Quick Start

Everything is already configured and running:

- **Frontend:** http://localhost:3000
- **n8n:** http://localhost:5678
- **Supabase:** https://your-project.supabase.co

## What's Running

1. **Frontend (React + Vite)** - Port 3000
   - Location: `deliverables/frontend/`
   - Command: `npm run dev`

2. **n8n Workflows** - Port 5678
   - Workflow 1: Content Intake & Draft Generation
   - Workflow 2: Draft Selection & Platform Adaptation
   - Command: `n8n start`

3. **Supabase Database**
   - Tables: `submissions`, `adapted_content`
   - All RLS policies and indexes configured

## Test the Demo

1. Open http://localhost:3000 in your browser
2. Click "New Submission" or similar button
3. Enter a content idea (e.g., "Why email marketing beats social media")
4. Wait ~40 seconds for 3 AI-generated drafts
5. Select a draft to see it adapted for LinkedIn, X, and newsletter

## Environment Variables

Already configured in:
- `deliverables/frontend/.env` - Frontend Supabase connection
- Workflows have hardcoded Supabase credentials (service role key)
- OpenAI API key configured in n8n credentials

## Database Schema

Tables created in Supabase:
- `submissions` - Stores content ideas and generated drafts
- `adapted_content` - Stores platform-specific adaptations

## Credentials Used

- **Supabase Project:** your-project-id
- **OpenAI API Key:** Configured in n8n (ID: openai-api-cred)
- **Service Role Key:** Embedded in workflows for write operations

## Notes

- Platform publishing (LinkedIn, X, SendGrid) won't actually post since those API credentials aren't configured
- The full draft generation + adaptation pipeline works end-to-end
- All data persists in Supabase between restarts

## Stopping Services

```bash
# Stop frontend
lsof -i :3000 -t | xargs kill

# Stop n8n
lsof -i :5678 -t | xargs kill
```

## Restarting

```bash
# Start frontend
cd deliverables/frontend && npm run dev

# Start n8n (from project root)
n8n start
```
