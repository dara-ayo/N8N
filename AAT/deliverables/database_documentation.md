# Database Documentation — AAT Content Automation Platform

**Database:** Supabase PostgreSQL (AWS eu-north-1)
**Last updated:** 2026-03-26
**Schema:** `public`

---

## Table of Contents

1. [Overview](#overview)
2. [Entity-Relationship Diagram](#entity-relationship-diagram)
3. [Tables](#tables)
   - [team_members](#team_members)
   - [submissions](#submissions)
   - [adapted_content](#adapted_content)
   - [platform_connections](#platform_connections)
4. [Views](#views)
   - [platform_connections_safe](#platform_connections_safe)
5. [Custom Types](#custom-types)
6. [Functions](#functions)
7. [Triggers](#triggers)
8. [Row-Level Security (RLS) Policies](#row-level-security-rls-policies)
9. [Indexes](#indexes)
10. [Data Flow](#data-flow)
11. [Access Control Summary](#access-control-summary)

---

## Overview

The AAT platform automates content creation and multi-platform publishing. Users submit a raw idea or text, the system generates adapted content for LinkedIn, Twitter/X, and a newsletter, and then publishes to the connected platforms.

The database has four core tables:

| Table | Purpose |
|---|---|
| `team_members` | Manages user identities, roles, and invite lifecycle |
| `submissions` | Stores each content generation request and its drafts |
| `adapted_content` | Stores the final platform-specific content derived from a submission |
| `platform_connections` | OAuth tokens and API credentials for LinkedIn, Twitter, newsletter |

All four tables have Row-Level Security enabled. Access is gated by the `get_user_role()` function which reads the calling user's role from `team_members`.

---

## Entity-Relationship Diagram

```
┌─────────────────────────────────┐
│           team_members          │
├─────────────────────────────────┤
│ id (PK, uuid)                   │
│ email (UNIQUE, text)            │
│ role (team_role enum)           │
│ user_id (FK → auth.users, uuid) │
│ display_name (text)             │
│ invited_by (FK → self.id, uuid) │
│ invite_token (UNIQUE, text)     │
│ status (text)                   │
│ created_at (timestamptz)        │
│ updated_at (timestamptz)        │
└───────────┬─────────────────────┘
            │ connected_by (FK)
            │                         ┌──────────────────────────────────┐
            │                         │        platform_connections       │
            │                         ├──────────────────────────────────┤
            └────────────────────────►│ id (PK, uuid)                    │
                                      │ platform (text)                  │
                                      │ display_name (text)              │
                                      │ access_token (text)              │
                                      │ refresh_token (text)             │
                                      │ token_expires_at (timestamptz)   │
                                      │ api_key (text)                   │
                                      │ platform_user_id (text)          │
                                      │ platform_username (text)         │
                                      │ config (jsonb)                   │
                                      │ connected_by (FK → team_members) │
                                      │ status (text)                    │
                                      │ created_at (timestamptz)         │
                                      │ updated_at (timestamptz)         │
                                      └──────────────────────────────────┘

┌───────────────────────────────────┐
│             submissions           │
├───────────────────────────────────┤
│ id (PK, text)                     │
│ content_hash (text)               │
│ input_type (text)                 │
│ raw_input (text)                  │
│ content_base (text)               │
│ drafts (jsonb)                    │
│ selected_draft (integer)          │
│ status (text)                     │
│ error_details (text)              │
│ publish_immediately (boolean)     │
│ created_at (timestamptz)          │
│ updated_at (timestamptz)          │
└──────────────┬────────────────────┘
               │ submission_id (FK)
               ▼
┌──────────────────────────────────────┐
│            adapted_content           │
├──────────────────────────────────────┤
│ id (PK, uuid)                        │
│ submission_id (FK → submissions.id)  │
│ linkedin_content (text)              │
│ linkedin_char_count (integer)        │
│ linkedin_has_cta (boolean)           │
│ linkedin_published_at (timestamptz)  │
│ linkedin_published_url (text)        │
│ twitter_content (text)               │
│ twitter_char_count (integer)         │
│ twitter_truncated (boolean)          │
│ twitter_published_at (timestamptz)   │
│ twitter_published_url (text)         │
│ newsletter_subject (text)            │
│ newsletter_content (text)            │
│ newsletter_word_count (integer)      │
│ newsletter_has_subject (boolean)     │
│ newsletter_has_cta (boolean)         │
│ newsletter_sent_at (timestamptz)     │
│ created_at (timestamptz)             │
│ published_at (timestamptz)           │
└──────────────────────────────────────┘

NOTE: submissions has no direct FK to team_members — submissions are
      not user-scoped at the row level. Access is controlled via RLS
      roles only (any authenticated team member can read all submissions).

NOTE: auth.users is a Supabase-managed table outside the public schema.
      team_members.user_id references it to link an invite record to a
      real authentication account once the invite is accepted.
```

---

## Tables

### team_members

Manages users of the platform. A user starts as an invite record (status = `invited`) and becomes `active` once they accept and authenticate via Supabase Auth.

**Self-referential relationship:** `invited_by` points to the `id` of the team member who sent the invite, enabling an audit trail of who invited whom.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `email` | text | NOT NULL | — | Unique email address |
| `role` | team_role | NOT NULL | `'viewer'` | RBAC role (see enum below) |
| `user_id` | uuid | YES | — | FK to Supabase `auth.users.id`; NULL until invite accepted |
| `display_name` | text | YES | — | Human-readable name |
| `invited_by` | uuid | YES | — | FK to `team_members.id` of the inviting member |
| `invite_token` | text | YES | — | One-time token sent in invite link; cleared on acceptance |
| `status` | text | NOT NULL | `'invited'` | Lifecycle state: `invited` or `active` |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated on every row change (via trigger) |

**Constraints:**
- `team_members_pkey` — PRIMARY KEY on `id`
- `team_members_email_unique` — UNIQUE on `email`
- `team_members_invite_token_key` — UNIQUE on `invite_token`
- `team_members_user_id_fkey` — FOREIGN KEY `user_id` → `auth.users(id)`
- `team_members_invited_by_fkey` — FOREIGN KEY `invited_by` → `team_members(id)`

**Indexes:**
- `idx_team_members_user_id` — partial index on `user_id` WHERE NOT NULL (fast auth lookup)
- `idx_team_members_invite_token` — partial index on `invite_token` WHERE NOT NULL (fast invite acceptance)

**Observed status values:** `invited`, `active`
**Observed role values:** `owner`, `editor` (full enum: `owner`, `admin`, `editor`, `viewer`)

---

### submissions

Each submission represents one content generation job. The user submits a raw idea, n8n processes it via AI to produce multiple draft variations, and the user (or automation) selects a draft to publish.

The `id` is a human-readable prefixed string (e.g. `sub_mn6o1fpq_oq7pzi`) generated by the application layer, not a UUID.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | text | NOT NULL | — | Primary key (app-generated, format: `sub_<random>`) |
| `content_hash` | text | NOT NULL | — | Hash of the raw input for deduplication detection |
| `input_type` | text | NOT NULL | — | Type of input (observed: `raw_idea`) |
| `raw_input` | text | NOT NULL | — | Original text submitted by the user |
| `content_base` | text | YES | — | Cleaned/normalised version of input used for generation |
| `drafts` | jsonb | YES | `'[]'` | Array of AI-generated draft objects |
| `selected_draft` | integer | YES | — | Index into the `drafts` array of the chosen draft |
| `status` | text | NOT NULL | `'generating'` | Pipeline state (see below) |
| `error_details` | text | YES | — | Error message if status is `error` |
| `publish_immediately` | boolean | YES | `false` | If true, publish without manual draft selection |
| `created_at` | timestamptz | YES | `now()` | Submission creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Auto-updated on every row change (via trigger) |

**Status lifecycle:**
```
generating → scheduled → published
                      └→ error
```

| Status | Meaning |
|---|---|
| `generating` | n8n workflow is processing the submission |
| `scheduled` | Drafts generated, content ready, awaiting publish trigger |
| `error` | Processing failed; see `error_details` |
| `published` | Content published to all target platforms |

**Constraints:**
- `submissions_pkey` — PRIMARY KEY on `id`

**Indexes:**
- `idx_submissions_status` — on `status` (fast status filtering)
- `idx_submissions_created` — on `created_at DESC` (recent-first listing)
- `idx_submissions_hash_created` — on `(content_hash, created_at DESC)` (deduplication queries)

---

### adapted_content

Stores the platform-specific content derived from a submission. Each submission that successfully completes generation has exactly one `adapted_content` row. The table is split into three logical sections — LinkedIn, Twitter, and newsletter — each with its own metadata and publish tracking fields.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `submission_id` | text | NOT NULL | — | FK to `submissions.id` |
| **LinkedIn fields** | | | | |
| `linkedin_content` | text | YES | — | Final LinkedIn post body |
| `linkedin_char_count` | integer | YES | — | Character count of the LinkedIn content |
| `linkedin_has_cta` | boolean | YES | `false` | Whether the post includes a call-to-action |
| `linkedin_published_at` | timestamptz | YES | — | Timestamp when published to LinkedIn |
| `linkedin_published_url` | text | YES | — | URL of the live LinkedIn post |
| **Twitter/X fields** | | | | |
| `twitter_content` | text | YES | — | Final Twitter post body |
| `twitter_char_count` | integer | YES | — | Character count (Twitter has a 280 char limit) |
| `twitter_truncated` | boolean | YES | `false` | Whether content was truncated to fit |
| `twitter_published_at` | timestamptz | YES | — | Timestamp when published to Twitter |
| `twitter_published_url` | text | YES | — | URL of the live tweet |
| **Newsletter fields** | | | | |
| `newsletter_subject` | text | YES | — | Email subject line |
| `newsletter_content` | text | YES | — | Full newsletter email body |
| `newsletter_word_count` | integer | YES | — | Word count of the newsletter content |
| `newsletter_has_subject` | boolean | YES | `false` | Whether a subject line was generated |
| `newsletter_has_cta` | boolean | YES | `false` | Whether the newsletter includes a CTA |
| `newsletter_sent_at` | timestamptz | YES | — | Timestamp when newsletter was dispatched |
| **General** | | | | |
| `created_at` | timestamptz | YES | `now()` | Record creation timestamp |
| `published_at` | timestamptz | YES | — | Timestamp when all platforms marked as published |

**Constraints:**
- `adapted_content_pkey` — PRIMARY KEY on `id`
- `adapted_content_submission_id_fkey` — FOREIGN KEY `submission_id` → `submissions(id)`

**Indexes:**
- `idx_adapted_submission` — on `submission_id` (fast join to submissions)

---

### platform_connections

Stores OAuth credentials and API keys for each publishing platform. Each row represents one connected account on one platform. The uniqueness constraint on `(platform, platform_user_id)` ensures no duplicate account connections for the same platform user.

Sensitive credential columns (`access_token`, `refresh_token`, `api_key`) are stored in plain text in this table but are masked in the `platform_connections_safe` view for general access.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `platform` | text | NOT NULL | — | Platform identifier: `linkedin`, `twitter`, `newsletter` |
| `display_name` | text | YES | — | Human label for the connection |
| `access_token` | text | YES | — | OAuth access token (sensitive) |
| `refresh_token` | text | YES | — | OAuth refresh token for token renewal (sensitive) |
| `token_expires_at` | timestamptz | YES | — | When the access token expires |
| `api_key` | text | YES | — | API key for platforms using key-based auth (sensitive) |
| `platform_user_id` | text | YES | — | The user's ID on the remote platform |
| `platform_username` | text | YES | — | The user's handle/username on the remote platform |
| `config` | jsonb | YES | `'{}'` | Platform-specific configuration (e.g. newsletter list ID) |
| `connected_by` | uuid | YES | — | FK to `team_members.id` of the member who set up the connection |
| `status` | text | NOT NULL | `'active'` | Connection state: `active` or `revoked` |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated on every row change (via trigger) |

**Constraints:**
- `platform_connections_pkey` — PRIMARY KEY on `id`
- `platform_connections_platform_user` — UNIQUE on `(platform, platform_user_id)`
- `platform_connections_connected_by_fkey` — FOREIGN KEY `connected_by` → `team_members(id)`

**Indexes:**
- `idx_platform_connections_platform` — on `platform` (fast per-platform lookup)

**Observed platform values:** `linkedin`, `twitter`, `newsletter`

---

## Views

### platform_connections_safe

A security view over `platform_connections` that masks sensitive credential fields. All credential values are replaced with `****` plus the last 4 characters (e.g. `****abcd`). NULL credentials are returned as NULL.

This view should be used in any application context where full credential access is not required (e.g. frontend display of connected accounts).

**Masked columns:**

| Original column | View column | Masking rule |
|---|---|---|
| `access_token` | `access_token_masked` | `'****' || right(access_token, 4)` |
| `refresh_token` | `refresh_token_masked` | `'****' || right(refresh_token, 4)` |
| `api_key` | `api_key_masked` | `'****' || right(api_key, 4)` |

All other columns are passed through unchanged.

---

## Custom Types

### `team_role` (enum)

Defines the role hierarchy for RBAC. Roles are ordered from most to least privileged:

| Value | Privilege level | Description |
|---|---|---|
| `owner` | Highest | Full control; can delete team members, manage all resources |
| `admin` | High | Can manage team and platform connections; cannot delete members |
| `editor` | Medium | Can create and submit content; cannot manage team or connections |
| `viewer` | Lowest | Read-only access to submissions and content |

The default role assigned on invite is `viewer`.

---

## Functions

### `get_user_role()` — SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS team_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM team_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;
```

**Purpose:** Central RBAC function used by all RLS policies. Returns the `team_role` of the currently authenticated user by looking up their `user_id` in `team_members` (only counting `active` members).

**Security model:** Runs with SECURITY DEFINER — it executes with the privileges of the function owner rather than the calling user. This allows RLS policies to read `team_members` without causing infinite recursion (a policy on `team_members` calls this function, which reads `team_members` as its owner, not as the user).

**Returns:** `team_role` enum value, or NULL if the user is not an active team member.

---

### `update_updated_at()` — trigger function

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
```

**Purpose:** Automatically sets `updated_at` to the current timestamp on any UPDATE. Called by the `*_updated_at` triggers on `submissions`, `platform_connections`, and `team_members`.

---

### `rls_auto_enable()` — event trigger function, SECURITY DEFINER

**Purpose:** Infrastructure-level function. Fires on every `CREATE TABLE` DDL event and automatically enables RLS on any new table created in the `public` schema. Ensures that no table is accidentally created without row-level security.

**Trigger:** `ensure_rls` — fires on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`.

---

## Triggers

| Trigger name | Table | Event | Timing | Action |
|---|---|---|---|---|
| `team_members_updated_at` | `team_members` | UPDATE | BEFORE | Calls `update_updated_at()` — sets `updated_at = NOW()` |
| `submissions_updated_at` | `submissions` | UPDATE | BEFORE | Calls `update_updated_at()` — sets `updated_at = NOW()` |
| `platform_connections_updated_at` | `platform_connections` | UPDATE | BEFORE | Calls `update_updated_at()` — sets `updated_at = NOW()` |

---

## Row-Level Security (RLS) Policies

All four tables have RLS enabled. The security model is role-based: all policies call `get_user_role()` to determine what the current user is allowed to do. All policies apply to the `authenticated` role (Supabase Auth users).

### team_members

| Policy | Command | Rule |
|---|---|---|
| `team_members_select` | SELECT | All authenticated users can read all rows |
| `team_members_insert` | INSERT | Only `owner` or `admin` can add team members |
| `team_members_update` | UPDATE | `owner` or `admin` can update any row; a user can also update their own row (`user_id = auth.uid()`) |
| `team_members_delete` | DELETE | Only `owner` can delete team members |

### submissions

| Policy | Command | Rule |
|---|---|---|
| `submissions_select_authenticated` | SELECT | All authenticated users can read all submissions |
| `submissions_insert_editor_plus` | INSERT | `owner`, `admin`, or `editor` can create submissions |
| `submissions_update_admin_plus` | UPDATE | Only `owner` or `admin` can update submissions |

### adapted_content

| Policy | Command | Rule |
|---|---|---|
| `adapted_content_select_authenticated` | SELECT | All authenticated users can read all adapted content |

No INSERT/UPDATE/DELETE policies are defined on `adapted_content` — writes to this table are performed by the n8n automation backend using service-role credentials (bypasses RLS), not by end users.

### platform_connections

| Policy | Command | Rule |
|---|---|---|
| `platform_connections_select` | SELECT | All authenticated users can read all connections |
| `platform_connections_insert` | INSERT | Only `owner` or `admin` can add connections |
| `platform_connections_update` | UPDATE | Only `owner` or `admin` can update connections |
| `platform_connections_delete` | DELETE | Only `owner` or `admin` can delete connections |

---

## Indexes

| Index | Table | Columns | Type | Notes |
|---|---|---|---|---|
| `adapted_content_pkey` | adapted_content | `id` | UNIQUE BTREE | Primary key |
| `idx_adapted_submission` | adapted_content | `submission_id` | BTREE | Fast join from submission to content |
| `platform_connections_pkey` | platform_connections | `id` | UNIQUE BTREE | Primary key |
| `platform_connections_platform_user` | platform_connections | `(platform, platform_user_id)` | UNIQUE BTREE | Prevents duplicate account connections |
| `idx_platform_connections_platform` | platform_connections | `platform` | BTREE | Fast per-platform queries |
| `submissions_pkey` | submissions | `id` | UNIQUE BTREE | Primary key |
| `idx_submissions_status` | submissions | `status` | BTREE | Dashboard status filtering |
| `idx_submissions_created` | submissions | `created_at DESC` | BTREE | Recent-first listing |
| `idx_submissions_hash_created` | submissions | `(content_hash, created_at DESC)` | BTREE | Duplicate submission detection |
| `team_members_pkey` | team_members | `id` | UNIQUE BTREE | Primary key |
| `team_members_email_unique` | team_members | `email` | UNIQUE BTREE | Email uniqueness enforcement |
| `team_members_invite_token_key` | team_members | `invite_token` | UNIQUE BTREE | Token uniqueness enforcement |
| `idx_team_members_user_id` | team_members | `user_id` WHERE NOT NULL | PARTIAL BTREE | Fast auth.uid() → member lookup |
| `idx_team_members_invite_token` | team_members | `invite_token` WHERE NOT NULL | PARTIAL BTREE | Fast invite token lookup |

---

## Data Flow

The following describes the complete lifecycle of a content submission through the system.

```
1. USER SUBMITS CONTENT
   ├─ Frontend sends raw text/idea to the API
   ├─ Application creates a row in submissions
   │   status = 'generating'
   │   drafts = []
   └─ n8n webhook is triggered with the submission ID

2. AI GENERATION (n8n workflow)
   ├─ n8n calls the AI model (Claude/GPT) with the raw_input
   ├─ AI generates multiple draft variations
   ├─ n8n updates submissions row:
   │   drafts = [{ title, content, ... }, ...]
   │   status = 'scheduled'  (or 'error' if generation fails)
   └─ n8n creates a row in adapted_content
       submission_id = <submissions.id>
       linkedin_content = <adapted text>
       twitter_content  = <truncated text>
       newsletter_content = <long-form text>

3. PUBLISHING (n8n workflow)
   ├─ n8n reads platform_connections to get credentials
   │   for linkedin, twitter, newsletter
   ├─ Posts content to each platform via their APIs
   ├─ Updates adapted_content with publish timestamps and URLs:
   │   linkedin_published_at, linkedin_published_url
   │   twitter_published_at,  twitter_published_url
   │   newsletter_sent_at
   └─ Updates submissions.status = 'published'

4. USER VIEWS RESULTS
   ├─ Frontend reads submissions (all statuses visible via RLS SELECT)
   ├─ Frontend reads adapted_content via FK join
   └─ Frontend reads platform_connections_safe (masked credentials)
      to show which accounts are connected
```

### Key design decisions

- **submissions are not user-scoped.** There is no `user_id` on `submissions`. The entire team shares a single content pool. Access is restricted to authenticated team members only via RLS, but not per-user.
- **adapted_content is written by automation.** No frontend INSERT/UPDATE/DELETE RLS policies exist on `adapted_content`. The n8n workflows use a Supabase service-role key which bypasses RLS entirely.
- **credentials are stored in the DB.** `platform_connections` holds OAuth tokens. The `platform_connections_safe` view ensures the raw tokens are never exposed through normal authenticated queries. The n8n automation reads the full `platform_connections` table using the service-role key.
- **invite-based team management.** New users are added as `team_members` rows (status=`invited`) with a one-time `invite_token`. When they click the invite link and authenticate, the application sets `user_id = auth.uid()` and `status = 'active'`. The `invite_token` remains until manually cleared.

---

## Access Control Summary

| Operation | viewer | editor | admin | owner |
|---|---|---|---|---|
| Read submissions | Yes | Yes | Yes | Yes |
| Create submissions | No | Yes | Yes | Yes |
| Update submissions | No | No | Yes | Yes |
| Read adapted_content | Yes | Yes | Yes | Yes |
| Write adapted_content | No (service role only) | No | No | No |
| Read platform connections | Yes | Yes | Yes | Yes |
| Manage platform connections | No | No | Yes | Yes |
| Read team members | Yes | Yes | Yes | Yes |
| Invite team members | No | No | Yes | Yes |
| Update own profile | Yes | Yes | Yes | Yes |
| Update other members | No | No | Yes | Yes |
| Delete team members | No | No | No | Yes |

---

*Documentation generated from live database introspection on 2026-03-26.*
