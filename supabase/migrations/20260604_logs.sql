-- ============================================
-- Migration: 20260604_logs
-- AI-powered logging and observability system
-- ============================================

-- ─────────────────────────────────────
-- 1. Main logs table
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pixova_logs (
  log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  level            VARCHAR(10) NOT NULL
                   CHECK (level IN ('error','warn','info','debug')),
  category         VARCHAR(50) NOT NULL
                   CHECK (category IN (
                     'auth','booking','payment',
                     'gallery','whatsapp','subscription',
                     'portal','api','cron','marketplace',
                     'admin','system'
                   )),
  message          TEXT NOT NULL,
  stack_trace      TEXT,

  -- Where it happened
  route            TEXT,
  method           VARCHAR(10),
  status_code      INTEGER,
  duration_ms      INTEGER,

  -- Who was affected (bare UUIDs — no FK to avoid schema drift)
  photographer_id  UUID,
  studio_id        UUID,
  client_id        UUID,
  account_id       UUID,
  user_phone       VARCHAR(15),
  user_role        VARCHAR(20),

  -- Request context
  request_id       UUID DEFAULT gen_random_uuid(),
  ip_address       TEXT,
  user_agent       TEXT,
  request_body     JSONB,
  response_body    JSONB,

  -- Error details
  error_code       TEXT,
  error_type       TEXT,

  -- AI analysis (filled by Analysis Agent)
  ai_severity      INTEGER CHECK (ai_severity BETWEEN 1 AND 10),
  ai_priority      VARCHAR(5)
                   CHECK (ai_priority IN ('P0','P1','P2','P3','P4')),
  ai_root_cause    TEXT,
  ai_suggested_fix TEXT,
  ai_affected_users INTEGER DEFAULT 0,
  ai_summary       TEXT,
  ai_analysed_at   TIMESTAMPTZ,

  -- Status
  is_resolved      BOOLEAN DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT,
  resolution_note  TEXT,
  alert_sent       BOOLEAN DEFAULT FALSE,

  -- Grouping (same error across users)
  fingerprint      TEXT,
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ DEFAULT NOW(),

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- 2. Log groups (deduplicated errors)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pixova_log_groups (
  group_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint      TEXT UNIQUE NOT NULL,
  category         VARCHAR(50),
  level            VARCHAR(10),
  message          TEXT,
  ai_priority      VARCHAR(5),
  ai_root_cause    TEXT,
  ai_suggested_fix TEXT,
  occurrence_count INTEGER DEFAULT 1,
  affected_users   INTEGER DEFAULT 0,
  first_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  is_resolved      BOOLEAN DEFAULT FALSE,
  latest_log_id    UUID
);

-- ─────────────────────────────────────
-- 3. Alert history
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pixova_log_alerts (
  alert_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id           UUID REFERENCES pixova_logs(log_id) ON DELETE SET NULL,
  group_id         UUID,
  alert_type       VARCHAR(20),
  channel          VARCHAR(20),
  message          TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_logs_level
  ON pixova_logs(level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_category
  ON pixova_logs(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_photographer
  ON pixova_logs(photographer_id, created_at DESC)
  WHERE photographer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_priority
  ON pixova_logs(ai_priority, is_resolved, created_at DESC)
  WHERE ai_priority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_fingerprint
  ON pixova_logs(fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_unresolved
  ON pixova_logs(is_resolved, ai_severity DESC)
  WHERE is_resolved = FALSE;

-- ─────────────────────────────────────
-- 5. RPC: increment_log_group
--    Called by logger.ts to bump occurrence_count
-- ─────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_log_group(p_fingerprint TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pixova_log_groups
  SET
    occurrence_count = occurrence_count + 1,
    last_seen_at     = NOW()
  WHERE fingerprint = p_fingerprint;
END;
$$;

-- ─────────────────────────────────────
-- 6. RLS — service role only
-- ─────────────────────────────────────
ALTER TABLE pixova_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixova_log_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixova_log_alerts  ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon/authenticated roles.
-- All reads/writes go through service role client (SUPABASE_SERVICE_ROLE_KEY).
-- No explicit policy needed: RLS with no policies = deny all for non-service-role.
