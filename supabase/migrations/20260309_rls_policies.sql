-- ============================================
-- RLS Policies for MOD-01: Auth & Onboarding
-- Run this in Supabase SQL Editor
-- ============================================

-- ── Enable RLS on all MOD-01 tables ──
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHOTOGRAPHERS
-- ============================================

-- Photographers can read their own record
CREATE POLICY "photographers_select_own"
  ON photographers FOR SELECT
  USING (auth_id = auth.uid());

-- Photographers can update their own record
CREATE POLICY "photographers_update_own"
  ON photographers FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Only service_role (admin) can insert photographers (done in verify-otp)
-- No policy needed — admin client bypasses RLS

-- ============================================
-- STUDIO PROFILES
-- ============================================

-- Photographers can read their own studio profile
CREATE POLICY "studio_profiles_select_own"
  ON studio_profiles FOR SELECT
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  );

-- Public can read public studio profiles (for client-facing pages)
CREATE POLICY "studio_profiles_select_public"
  ON studio_profiles FOR SELECT
  USING (is_profile_public = true);

-- Photographers can update their own studio profile
CREATE POLICY "studio_profiles_update_own"
  ON studio_profiles FOR UPDATE
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  );

-- Only service_role can insert studio profiles (done in onboarding)

-- ============================================
-- STUDIO PACKAGES
-- ============================================

-- Photographers can read their own packages
CREATE POLICY "studio_packages_select_own"
  ON studio_packages FOR SELECT
  USING (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON p.id = sp.photographer_id
      WHERE p.auth_id = auth.uid()
    )
  );

-- Public can read packages of public studios
CREATE POLICY "studio_packages_select_public"
  ON studio_packages FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles WHERE is_profile_public = true
    )
  );

-- Photographers can insert packages for their own studio
CREATE POLICY "studio_packages_insert_own"
  ON studio_packages FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON p.id = sp.photographer_id
      WHERE p.auth_id = auth.uid()
    )
  );

-- Photographers can update their own packages
CREATE POLICY "studio_packages_update_own"
  ON studio_packages FOR UPDATE
  USING (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON p.id = sp.photographer_id
      WHERE p.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON p.id = sp.photographer_id
      WHERE p.auth_id = auth.uid()
    )
  );

-- Photographers can delete their own packages
CREATE POLICY "studio_packages_delete_own"
  ON studio_packages FOR DELETE
  USING (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON p.id = sp.photographer_id
      WHERE p.auth_id = auth.uid()
    )
  );

-- ============================================
-- OTP SESSIONS
-- No user-facing RLS — managed entirely by service_role
-- ============================================

-- Block all direct access (API routes use admin client)
CREATE POLICY "otp_sessions_deny_all"
  ON otp_sessions FOR ALL
  USING (false);

-- ============================================
-- ACTIVE SESSIONS
-- ============================================

-- Photographers can view their own sessions
CREATE POLICY "active_sessions_select_own"
  ON active_sessions FOR SELECT
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  );

-- Photographers can delete their own sessions (logout)
CREATE POLICY "active_sessions_delete_own"
  ON active_sessions FOR DELETE
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  );

-- Only service_role can insert sessions (done in verify-otp)

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

-- Photographers can read their own subscriptions
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE auth_id = auth.uid()
    )
  );

-- Only service_role can insert/update subscriptions (billing module)

-- ============================================
-- HELPER: Function to get current photographer_id
-- ============================================

CREATE OR REPLACE FUNCTION get_my_photographer_id()
RETURNS uuid AS $$
  SELECT id FROM photographers WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
