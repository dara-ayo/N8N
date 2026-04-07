# Platform Credentials Setup Guide

This guide walks through obtaining API keys and OAuth credentials for each platform integration in the AAT content automation system.

---

## 1. Resend (Newsletter / Email)

Resend is used to send newsletter emails to your subscribers.

### Step 1: Create a Resend Account

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Sign up with your email or GitHub account
3. Verify your email address

### Step 2: Verify a Sending Domain (Recommended)

1. In the Resend dashboard, go to **Domains** in the left sidebar
2. Click **Add Domain** and enter your domain (e.g., `yourdomain.com`)
3. Add the DNS records (TXT, CNAME) that Resend provides to your domain registrar
4. Wait for verification (usually a few minutes)

> **Note:** You can skip domain verification and send from Resend's shared domain (`onboarding@resend.dev`) for testing, but deliverability will be limited.

### Step 3: Generate an API Key

1. In the Resend dashboard, go to **API Keys** in the left sidebar
2. Click **Create API Key**
3. Give it a name (e.g., `aat-newsletter`)
4. Select permission: **Full access** (or **Sending access** if you prefer minimal permissions)
5. Click **Add** and copy the key (starts with `re_`)

### Step 4: Configure in AAT

- **Environment variable:** Add the API key to `/deliverables/.env`:
  ```
  RESEND_API_KEY=re_your_actual_key_here
  ```
- **Frontend Settings page:** Navigate to `/settings` in the AAT dashboard, select **Newsletter**, choose **Resend** as the provider, and enter:
  - API Key
  - Sender Email (must match a verified domain, e.g., `hello@yourdomain.com`)
  - Sender Name (e.g., `Fetemi Marketing`)

---

## 2. LinkedIn (Social Publishing)

LinkedIn uses OAuth 2.0 for authentication. You need a LinkedIn Developer App.

### Step 1: Create a LinkedIn Developer App

1. Go to [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in the required fields:
   - **App name:** e.g., `AAT Content Publisher`
   - **LinkedIn Page:** Select or create a LinkedIn Company Page to associate with the app
   - **App logo:** Upload a logo image
   - **Legal agreement:** Check the box
4. Click **Create app**

### Step 2: Configure Products

1. On your app page, go to the **Products** tab
2. Request access to:
   - **Share on LinkedIn** -- required to publish posts
   - **Sign In with LinkedIn using OpenID Connect** -- required for user authentication
3. Wait for approval (Share on LinkedIn is usually instant)

### Step 3: Configure OAuth 2.0

1. Go to the **Auth** tab on your app page
2. Under **OAuth 2.0 settings**, add an **Authorized redirect URL**:
   ```
   http://localhost:5173/auth/linkedin/callback
   ```
   (For production, use your actual domain)
3. Note down:
   - **Client ID**
   - **Client Secret** (click the eye icon to reveal)

### Step 4: Configure in AAT

- **Environment variables:** Add to `/deliverables/.env`:
  ```
  LINKEDIN_CLIENT_ID=your_client_id_here
  LINKEDIN_CLIENT_SECRET=your_client_secret_here
  ```
- **Frontend environment variable:** Add to `/deliverables/frontend/.env`:
  ```
  VITE_LINKEDIN_CLIENT_ID=your_client_id_here
  ```
- **Frontend Settings page:** Navigate to `/settings` and connect your LinkedIn account via the OAuth flow.

---

## 3. Twitter / X (Social Publishing)

Twitter/X uses OAuth 2.0 with PKCE for user authentication.

### Step 1: Create a Twitter Developer Account

1. Go to [https://developer.x.com/en/portal/dashboard](https://developer.x.com/en/portal/dashboard)
2. Sign up for a developer account if you don't already have one
3. Choose the **Free** tier (sufficient for basic posting) or **Basic** ($100/month for higher limits)
4. Complete the application by describing your use case

### Step 2: Create a Project and App

1. In the Developer Portal, go to **Projects & Apps** in the sidebar
2. Click **+ Add Project**, give it a name, select a use case, and provide a description
3. Within the project, create an **App** (or use the default one created with the project)

### Step 3: Configure OAuth 2.0

1. Click on your App, then go to **Settings** > **User authentication settings** > **Set up**
2. Configure:
   - **App permissions:** Select **Read and write** (needed to post tweets)
   - **Type of App:** Select **Web App, Automated App or Bot**
   - **Callback URI / Redirect URL:**
     ```
     http://localhost:5173/auth/twitter/callback
     ```
   - **Website URL:** Your website or `http://localhost:5173`
3. Click **Save**

### Step 4: Get Your Keys

1. Go to the **Keys and tokens** tab of your App
2. Under **OAuth 2.0 Client ID and Client Secret**, note down:
   - **Client ID**
   - **Client Secret**

> **Important:** Twitter OAuth 2.0 Client ID is different from the API Key (v1.1). Make sure you use the OAuth 2.0 credentials.

### Step 5: Configure in AAT

- **Environment variables:** Add to `/deliverables/.env`:
  ```
  TWITTER_CLIENT_ID=your_client_id_here
  TWITTER_CLIENT_SECRET=your_client_secret_here
  ```
- **Frontend environment variable:** Add to `/deliverables/frontend/.env`:
  ```
  VITE_TWITTER_CLIENT_ID=your_client_id_here
  ```
- **Frontend Settings page:** Navigate to `/settings` and connect your Twitter/X account via the OAuth flow.

---

## Quick Reference: Where Each Credential Goes

| Credential | Backend `.env` | Frontend `.env` | Settings Page |
|---|---|---|---|
| Resend API Key | `RESEND_API_KEY` | -- | Yes (Newsletter config) |
| Resend Sender Email | -- | -- | Yes (Newsletter config) |
| Resend Sender Name | -- | -- | Yes (Newsletter config) |
| LinkedIn Client ID | `LINKEDIN_CLIENT_ID` | `VITE_LINKEDIN_CLIENT_ID` | Auto (OAuth flow) |
| LinkedIn Client Secret | `LINKEDIN_CLIENT_SECRET` | -- | Auto (OAuth flow) |
| Twitter Client ID | `TWITTER_CLIENT_ID` | `VITE_TWITTER_CLIENT_ID` | Auto (OAuth flow) |
| Twitter Client Secret | `TWITTER_CLIENT_SECRET` | -- | Auto (OAuth flow) |

### File Locations

- Backend environment: `/deliverables/.env`
- Frontend environment: `/deliverables/frontend/.env`
- Frontend Settings page: Accessible at `/settings` in the running application
- n8n workflows: Credentials are configured within n8n and reference environment variables

---

## Testing the Newsletter Without a Real ESP

A placeholder newsletter connection has been pre-inserted into the `platform_connections` table with:
- **Provider:** Resend
- **API Key:** `re_placeholder_configure_in_settings`
- **Sender Email:** `daraayodaniel@gmail.com`
- **Sender Name:** `Fetemi Marketing`

To send real emails, replace the placeholder API key with your actual Resend API key via the Settings page or by updating the database record directly.
