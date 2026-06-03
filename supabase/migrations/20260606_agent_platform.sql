-- ─────────────────────────────────────────────
-- Pixova Agent Platform — Core Infrastructure
-- ─────────────────────────────────────────────

-- 1. Event Bus Table
CREATE TABLE IF NOT EXISTS agent_events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      VARCHAR(100) NOT NULL,
  event_version   INTEGER DEFAULT 1,
  studio_id       UUID REFERENCES studio_profiles(id) ON DELETE SET NULL,
  photographer_id UUID REFERENCES photographers(photographer_id) ON DELETE SET NULL,
  client_id       UUID,
  account_id      UUID,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(20) DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','SKIPPED')),
  priority        VARCHAR(5) DEFAULT 'P3'
                  CHECK (priority IN ('P0','P1','P2','P3','P4')),
  pipelines_triggered TEXT[] DEFAULT '{}',
  pipelines_completed TEXT[] DEFAULT '{}',
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ
);

-- 2. Pipeline Runs
CREATE TABLE IF NOT EXISTS agent_pipeline_runs (
  run_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES agent_events(event_id) ON DELETE CASCADE,
  pipeline_name       VARCHAR(100) NOT NULL,
  studio_id           UUID,
  status              VARCHAR(20) DEFAULT 'RUNNING'
                      CHECK (status IN ('RUNNING','COMPLETED','FAILED','SKIPPED','TIMEOUT')),
  agents_ran          TEXT[] DEFAULT '{}',
  agents_skipped      TEXT[] DEFAULT '{}',
  total_input_tokens  INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd      NUMERIC(10,6) DEFAULT 0,
  pipeline_output     JSONB DEFAULT '{}',
  error_message       TEXT,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INTEGER
);

-- 3. Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  agent_run_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID NOT NULL REFERENCES agent_pipeline_runs(run_id) ON DELETE CASCADE,
  agent_name      VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'RUNNING'
                  CHECK (status IN ('RUNNING','COMPLETED','FAILED','SKIPPED','FALLBACK')),
  ran_in_parallel BOOLEAN DEFAULT FALSE,
  temperature     NUMERIC(3,2),
  input_tokens    INTEGER DEFAULT 0,
  output_tokens   INTEGER DEFAULT 0,
  cost_usd        NUMERIC(10,6) DEFAULT 0,
  input_summary   TEXT,
  output_summary  TEXT,
  raw_output      JSONB,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER
);

-- 4. Studio AI Memory
CREATE TABLE IF NOT EXISTS studio_ai_memory (
  memory_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id                 UUID UNIQUE NOT NULL REFERENCES studio_profiles(id) ON DELETE CASCADE,
  communication_tone        VARCHAR(20) DEFAULT 'warm',
  uses_emoji                BOOLEAN DEFAULT TRUE,
  typical_reply_length      VARCHAR(20) DEFAULT 'medium',
  language_style            VARCHAR(20) DEFAULT 'simple',
  common_phrases            TEXT[] DEFAULT '{}',
  avg_response_time_hours   NUMERIC(6,2),
  conversion_rate_pct       NUMERIC(5,2),
  avg_booking_value         BIGINT,
  peak_booking_months       INTEGER[] DEFAULT '{}',
  top_event_types           TEXT[] DEFAULT '{}',
  typical_client_budget_min BIGINT,
  typical_client_budget_max BIGINT,
  enquiries_received        INTEGER DEFAULT 0,
  enquiries_replied         INTEGER DEFAULT 0,
  bookings_converted        INTEGER DEFAULT 0,
  ai_drafts_used            INTEGER DEFAULT 0,
  ai_drafts_edited          INTEGER DEFAULT 0,
  tokens_used_today         INTEGER DEFAULT 0,
  tokens_used_month         INTEGER DEFAULT 0,
  tokens_reset_date         DATE DEFAULT CURRENT_DATE,
  daily_token_limit         INTEGER DEFAULT 50000,
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Platform AI Memory
CREATE TABLE IF NOT EXISTS platform_ai_memory (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_ai_memory (key, value) VALUES
  ('pricing_by_city',              '{}'),
  ('conversion_by_event_type',     '{}'),
  ('peak_seasons_india',           '{"months": [11,12,1,2,3]}'),
  ('avg_response_time_benchmark',  '{"hours": 4}'),
  ('common_style_signals',         '{"candid":true,"outdoor":true,"natural_light":true}')
ON CONFLICT (key) DO NOTHING;

-- 6. Token Budget Registry
CREATE TABLE IF NOT EXISTS token_budget_registry (
  budget_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      UUID NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used    INTEGER DEFAULT 0,
  cost_usd       NUMERIC(10,6) DEFAULT 0,
  pipeline_calls INTEGER DEFAULT 0,
  UNIQUE(studio_id, date)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_events_status_priority
  ON agent_events(status, priority, created_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_events_studio
  ON agent_events(studio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type
  ON agent_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_event
  ON agent_pipeline_runs(event_id, pipeline_name);

CREATE INDEX IF NOT EXISTS idx_agent_runs_pipeline
  ON agent_runs(pipeline_run_id, agent_name);

CREATE INDEX IF NOT EXISTS idx_budget_studio_date
  ON token_budget_registry(studio_id, date);

-- 8. Safe token increment function
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_studio_id UUID,
  p_tokens    INTEGER,
  p_cost      NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO token_budget_registry (studio_id, date, tokens_used, cost_usd)
  VALUES (p_studio_id, CURRENT_DATE, p_tokens, p_cost)
  ON CONFLICT (studio_id, date)
  DO UPDATE SET
    tokens_used = token_budget_registry.tokens_used + p_tokens,
    cost_usd    = token_budget_registry.cost_usd + p_cost;

  UPDATE studio_ai_memory
  SET
    tokens_used_today = tokens_used_today + p_tokens,
    tokens_used_month = tokens_used_month + p_tokens,
    updated_at        = NOW()
  WHERE studio_id = p_studio_id;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS — service role only (same pattern as pixova_logs)
ALTER TABLE agent_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pipeline_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ai_memory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_ai_memory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_budget_registry ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access (service role bypasses RLS)
CREATE POLICY "deny_all_agent_events"          ON agent_events          FOR ALL USING (false);
CREATE POLICY "deny_all_pipeline_runs"         ON agent_pipeline_runs   FOR ALL USING (false);
CREATE POLICY "deny_all_agent_runs"            ON agent_runs            FOR ALL USING (false);
CREATE POLICY "deny_all_studio_ai_memory"      ON studio_ai_memory      FOR ALL USING (false);
CREATE POLICY "deny_all_platform_ai_memory"    ON platform_ai_memory    FOR ALL USING (false);
CREATE POLICY "deny_all_token_budget_registry" ON token_budget_registry FOR ALL USING (false);
