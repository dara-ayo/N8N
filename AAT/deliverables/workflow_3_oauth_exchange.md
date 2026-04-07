# Workflow 3: OAuth Token Exchange

**Project:** Content Generation & Publishing Automation
**Builder:** Ayodele Oluwafimidaraayo

---

## Purpose

This n8n workflow handles the server-side OAuth token exchange for LinkedIn and Twitter/X. When a user clicks "Connect LinkedIn" or "Connect Twitter" in the frontend, the browser redirects to the platform's authorization page. After the user grants permission, the platform redirects back to the frontend with an authorization code. The frontend then sends that code to this workflow, which:

1. Exchanges the authorization code for an access token (and refresh token)
2. Fetches the user's profile from the platform API
3. Saves the connection (tokens, user ID, username) to the Supabase `platform_connections` table
4. Returns the connected username to the frontend for display

---

## Endpoint

**POST** `http://localhost:5678/webhook/oauth-callback`

### Request Body

```json
{
  "platform": "linkedin",
  "code": "AQR7x...",
  "redirect_uri": "http://localhost:3000/oauth/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `platform` | string | Yes | `"linkedin"` or `"twitter"` |
| `code` | string | Yes | Authorization code from OAuth redirect |
| `redirect_uri` | string | Yes | Must match the redirect URI used in the authorization request |
| `code_verifier` | string | Twitter only | PKCE code verifier (required for Twitter OAuth 2.0) |

### Response

```json
{
  "success": true,
  "platform": "linkedin",
  "username": "Ayodele Oluwafimidaraayo",
  "message": "linkedin account connected successfully"
}
```

---

## Node Flow

```
Receive OAuth Callback (Webhook POST /oauth-callback)
  -> Validate OAuth Input (Code)
  -> Route by Platform (IF: linkedin or twitter)
  -> [LinkedIn branch]
       Exchange LinkedIn Token (HTTP POST linkedin.com/oauth/v2/accessToken)
       -> Parse LinkedIn Token Response (Code)
       -> Get LinkedIn Profile (HTTP GET linkedin.com/v2/userinfo)
       -> Prepare LinkedIn Connection Data (Code)
  -> [Twitter branch]
       Exchange Twitter Token (HTTP POST api.twitter.com/2/oauth2/token)
       -> Parse Twitter Token Response (Code)
       -> Get Twitter Profile (HTTP GET api.twitter.com/2/users/me)
       -> Prepare Twitter Connection Data (Code)
  -> Save Connection to Supabase (HTTP POST - UPSERT)
  -> Format Success Response (Code)
  -> Return Success (Respond to Webhook)
```

---

## Required Environment Variables

Set these in your n8n instance under Settings > Environment Variables (or in your `.env` file / Docker environment):

| Variable | Description | Example |
|---|---|---|
| `LINKEDIN_CLIENT_ID` | LinkedIn app client ID from [LinkedIn Developer Portal](https://www.linkedin.com/developers/) | `86abc123def456` |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app client secret | `sG8k...` |
| `TWITTER_CLIENT_ID` | Twitter app OAuth 2.0 client ID from [Twitter Developer Portal](https://developer.twitter.com/) | `dXlzMk...` |
| `TWITTER_CLIENT_SECRET` | Twitter app OAuth 2.0 client secret | `r4nd0m...` |

---

## Configuration Steps

### 1. Create platform OAuth apps

**LinkedIn:**
- Go to https://www.linkedin.com/developers/apps
- Create an app, request the `openid`, `profile`, `email`, and `w_member_social` scopes
- Add your redirect URI (e.g., `http://localhost:3000/oauth/callback`)
- Copy the Client ID and Client Secret

**Twitter/X:**
- Go to https://developer.twitter.com/en/portal/projects-and-apps
- Create a project and app with OAuth 2.0 enabled
- Set User authentication with Type: Web App, Confidential client
- Request scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- Add your redirect URI
- Copy the Client ID and Client Secret

### 2. Set n8n environment variables

Add the four environment variables listed above to your n8n instance.

### 3. Create the Supabase table

The `platform_connections` table must exist with at minimum these columns:

```sql
CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, platform_user_id)
);
```

### 4. Import and activate the workflow

Import `workflow_3_oauth_exchange.json` into n8n and activate it. The webhook will be available at:

```
http://localhost:5678/webhook/oauth-callback
```

---

## How the Frontend Uses This

1. User clicks "Connect LinkedIn" in the settings page
2. Frontend constructs the OAuth authorization URL with the correct scopes and redirect URI
3. Browser redirects to LinkedIn/Twitter authorization page
4. User grants permission
5. Platform redirects back to frontend with `?code=...` in the URL
6. Frontend extracts the code and POSTs it to this workflow's `/oauth-callback` endpoint
7. Workflow exchanges the code, saves credentials, returns the username
8. Frontend displays "Connected as {username}" in the UI

---

## Error Handling

- Missing or invalid fields return 400 with a descriptive error message
- Token exchange failures (invalid code, expired code) return 401
- Profile fetch failures return 500 with details
- All HTTP Request nodes retry 3 times with exponential backoff
- The Supabase upsert uses `ON CONFLICT (platform, platform_user_id)` so reconnecting an existing account updates the tokens instead of creating a duplicate

---

## Security Notes

- Authorization codes are single-use and short-lived (typically 10 minutes)
- Access tokens are stored encrypted at rest in Supabase (configure Supabase column-level encryption if needed)
- The service role key is used for Supabase writes -- never expose it to the frontend
- Twitter uses PKCE (Proof Key for Code Exchange) which prevents authorization code interception attacks
- Consider adding rate limiting to the webhook endpoint in production
