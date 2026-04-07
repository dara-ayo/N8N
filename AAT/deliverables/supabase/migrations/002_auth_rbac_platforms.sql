-- ============================================
-- Auth, RBAC & Platform Connections Migration
-- Adds team-based access control and OAuth platform connections
-- Author: Oluwademilade Bickersteth
-- Date: 2026-03-25
-- ============================================

-- ============================================
-- 1. ROLES ENUM
-- Defines the permission tiers for team members
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
  END IF;
END
$$;

-- ============================================
-- 2. TEAM_MEMBERS TABLE
-- Stores all team members, including invite-only users
-- who haven't logged in yet (user_id is NULL until first login)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  role        team_role NOT NULL DEFAULT 'viewer',
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  invited_by  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  invite_token TEXT UNIQUE,
  status      TEXT NOT NULL DEFAULT 'invited'
                CHECK (status IN ('invited', 'active', 'deactivated')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT team_members_email_unique UNIQUE (email)
);

-- Index for quick lookup by auth user id (used on every request)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON team_members (user_id)
  WHERE user_id IS NOT NULL;

-- Index for invite token lookups during onboarding
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token
  ON team_members (invite_token)
  WHERE invite_token IS NOT NULL;

-- ============================================
-- 3. PLATFORM_CONNECTIONS TABLE
-- Stores OAuth tokens and API keys for each connected platform
-- ============================================
CREATE TABLE IF NOT EXISTS platform_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT NOT NULL
                      CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
  display_name      TEXT,
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  api_key           TEXT,
  platform_user_id  TEXT,
  platform_username TEXT,
  config            JSONB DEFAULT '{}'::jsonb,
  connected_by      UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'revoked')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT platform_connections_platform_user UNIQUE (platform, platform_user_id)
);

-- Index for listing connections by platform
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform
  ON platform_connections (platform);

-- ============================================
-- 4. HELPER FUNCTION: get_user_role()
-- Returns the team_role for the currently authenticated user.
-- Returns NULL if the user has no team_members record.
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM team_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- ============================================
-- 5. ROW-LEVEL SECURITY — team_members
-- ============================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can see the team roster
CREATE POLICY "team_members_select"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only owner or admin can invite new members
CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('owner', 'admin')
  );

-- UPDATE: owner/admin can update any row;
--         regular users can update only their own display_name
CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('owner', 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() IN ('owner', 'admin')
    OR (
      -- Non-admin users may only touch their own row
      user_id = auth.uid()
      -- and may only change display_name (all other fields stay the same)
      AND email      = OLD.email
      AND role       = OLD.role
      AND status     = OLD.status
      AND invited_by = OLD.invited_by
    )
  );

-- DELETE: only the owner can remove team members
CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'owner'
  );

-- ============================================
-- 6. ROW-LEVEL SECURITY — platform_connections
-- Tokens are masked via a view (below); RLS controls row access.
-- ============================================
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can see connections
CREATE POLICY "platform_connections_select"
  ON platform_connections FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: owner/admin only
CREATE POLICY "platform_connections_insert"
  ON platform_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('owner', 'admin')
  );

-- UPDATE: owner/admin only
CREATE POLICY "platform_connections_update"
  ON platform_connections FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('owner', 'admin')
  );

-- DELETE: owner/admin only
CREATE POLICY "platform_connections_delete"
  ON platform_connections FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================
-- 7. SAFE VIEW — masks sensitive tokens
-- Frontend should query this view instead of the raw table
-- ============================================
CREATE OR REPLACE VIEW platform_connections_safe AS
SELECT
  id,
  platform,
  display_name,
  -- Mask tokens: show only last 4 chars so users can identify them
  CASE
    WHEN access_token IS NOT NULL
    THEN '****' || right(access_token, 4)
    ELSE NULL
  END AS access_token_masked,
  CASE
    WHEN refresh_token IS NOT NULL
    THEN '****' || right(refresh_token, 4)
    ELSE NULL
  END AS refresh_token_masked,
  token_expires_at,
  CASE
    WHEN api_key IS NOT NULL
    THEN '****' || right(api_key, 4)
    ELSE NULL
  END AS api_key_masked,
  platform_user_id,
  platform_username,
  config,
  connected_by,
  status,
  created_at,
  updated_at
FROM platform_connections;

-- ============================================
-- 8. UPDATE EXISTING RLS ON submissions & adapted_content
-- Replace the permissive anon policies with role-aware policies.
-- The service role (used by n8n) bypasses RLS entirely, so
-- backend automation is unaffected.
-- ============================================

-- --- submissions ---
-- Drop old open policies
DROP POLICY IF EXISTS "Allow public read on submissions"          ON submissions;
DROP POLICY IF EXISTS "Allow service role insert on submissions"  ON submissions;
DROP POLICY IF EXISTS "Allow service role update on submissions"  ON submissions;

-- SELECT: any authenticated team member can read submissions
CREATE POLICY "submissions_select_authenticated"
  ON submissions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: editor, admin, or owner can create submissions
CREATE POLICY "submissions_insert_editor_plus"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('owner', 'admin', 'editor')
  );

-- UPDATE: admin or owner can update status / any field
CREATE POLICY "submissions_update_admin_plus"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('owner', 'admin')
  );

-- --- adapted_content ---
-- Drop old open policies
DROP POLICY IF EXISTS "Allow public read on adapted_content"          ON adapted_content;
DROP POLICY IF EXISTS "Allow service role insert on adapted_content"  ON adapted_content;
DROP POLICY IF EXISTS "Allow service role update on adapted_content"  ON adapted_content;

-- SELECT: any authenticated team member can read adapted content
CREATE POLICY "adapted_content_select_authenticated"
  ON adapted_content FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE: keep service-role-only (n8n) — no authenticated policy needed.
-- The service role key bypasses RLS, so n8n can still write.
-- If the app ever needs authenticated inserts, add policies here.

-- ============================================
-- 9. TRIGGERS — auto-update updated_at
-- Reuses the update_updated_at() function from 001_initial_schema.sql
-- ============================================

-- team_members
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- platform_connections
CREATE TRIGGER platform_connections_updated_at
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 10. SEED DATA — initial owner account
-- ============================================
INSERT INTO team_members (email, role, status)
VALUES ('daraayodaniel@gmail.com', 'owner', 'active')
ON CONFLICT (email) DO NOTHING;
