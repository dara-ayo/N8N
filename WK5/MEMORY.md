# Project Memory

This file captures useful project memory copied from Claude's local project memory for `proposal-gen`.

## User Profile

- Name: Ayodele Oluwafimidaraayo
- Asset naming convention: `Ayodele - [descriptor]`
- Example asset name: `Ayodele Oluwafimidaraayo - Proposal Generation & Delivery Automation`

## Security Preference

- If credentials are shared during work on this project, store them in `.env` immediately.
- Do not repeat secrets back in conversation logs.
- Keep `.gitignore` in place for sensitive local files.

## n8n Local Setup

- `n8n` is installed globally.
- Start it with `n8n start`.
- Local URL: `http://localhost:5678`
- Data directory: `~/.n8n/`
- Community license features were previously activated.

### n8n Workflow Gotchas

- After API changes, workflows may need `n8n publish:workflow --id=XXX` followed by an `n8n` restart before changes take effect.
- REST API `PATCH` requests that set `active: true` may fail silently unless the workflow is published.
- Code node sandboxing blocks `$env` access by default.
- Prefer HTTP Request nodes with credentials over Code nodes that try to read env vars.
- Airtable's native node may return empty output when a search has zero results, which can break downstream logic.
- HTTP Request nodes are often more predictable than native Airtable nodes.
- For OAuth in HTTP Request nodes, credential typing must match the specific node credential type.
- Gmail nodes replace incoming JSON with Gmail response fields, so restore upstream context before later steps if needed.

## Google Cloud Setup

- Local `gcloud` binary path previously used: `/Users/demilade/Downloads/google-cloud-sdk/bin/gcloud`
- Google APIs previously enabled for this project flow: Docs, Gmail, Drive, IAP
- OAuth redirect URI used by `n8n`: `http://localhost:5678/rest/oauth2-credential/callback`
- OAuth consent screen was configured in external testing mode.
- Adding test users for personal Gmail accounts must be done in the browser console, not via CLI.

## Project Context

- This project is centered on proposal generation and delivery automation.
- The working stack reflected in Claude's memory is local `n8n` plus Google integrations.
