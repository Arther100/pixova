-- ============================================
-- MOD-09: Subscription, Quota & Security
-- Tables: admin_users, subscription_events,
--         razorpay_subscriptions
-- Alter: subscriptions, photographers
-- ============================================

-- 1. Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  admin_id        UUID PRIMARY KEY
                  DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed admin account (password: Pixova@Admin2026)
INSERT INTO admin_users (email, name, password_hash)
VALUES (
  'admin@pixova.in',
  'Vijay Arther',
  '$2b$12$nr/GbMCiej5QSe4U3Me7bed4ckkIS4xgCs3YQPwrm2TSukp/r6YDK'
) ON CONFLICT (email) DO NOTHING;

-- 2. Add grace_period_ends_at to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_ends_at
    TIMESTAMPTZ;

-- 3. Add suspension fields to photographers
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS is_suspended
    BOOLEAN DEFAULT FALSE;

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS suspended_at
    TIMESTAMPTZ;

ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS suspended_reason
    TEXT;

-- 4. Subscription events log
CREATE TABLE IF NOT EXISTS subscription_events (
  event_id        UUID PRIMARY KEY
                  DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL
                  REFERENCES photographers(id),
  studio_id       UUID
                  REFERENCES studio_profiles(id),
  event_type      TEXT NOT NULL,
  old_plan        TEXT,
  new_plan        TEXT,
  old_status      TEXT,
  new_status      TEXT,
  amount_paise    BIGINT,
  razorpay_sub_id TEXT,
  notes           TEXT,
  performed_by    TEXT DEFAULT 'SYSTEM',
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sub_event_type_check
    CHECK (event_type IN (
      'TRIAL_STARTED',
      'TRIAL_EXPIRED',
      'PLAN_UPGRADED',
      'PLAN_DOWNGRADED',
      'SUBSCRIPTION_ACTIVATED',
      'SUBSCRIPTION_CANCELLED',
      'SUBSCRIPTION_RENEWED',
      'GRACE_PERIOD_STARTED',
      'GRACE_PERIOD_EXPIRED',
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_UNSUSPENDED',
      'PLAN_CHANGED_BY_ADMIN',
      'PAYMENT_FAILED'
    ))
);

-- 5. Razorpay subscriptions table
CREATE TABLE IF NOT EXISTS razorpay_subscriptions (
  id                  UUID PRIMARY KEY
                      DEFAULT gen_random_uuid(),
  photographer_id     UUID NOT NULL
                      REFERENCES photographers(id),
  studio_id           UUID NOT NULL
                      REFERENCES studio_profiles(id),
  plan_id             UUID NOT NULL
                      REFERENCES plans(id),
  razorpay_sub_id     TEXT UNIQUE NOT NULL,
  razorpay_plan_id    TEXT NOT NULL,
  status              TEXT NOT NULL,
  current_start       TIMESTAMPTZ,
  current_end         TIMESTAMPTZ,
  charge_at           TIMESTAMPTZ,
  total_count         INTEGER,
  paid_count          INTEGER DEFAULT 0,
  amount_paise        BIGINT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT rzp_sub_status_check
    CHECK (status IN (
      'created','authenticated','active',
      'paused','halted','cancelled',
      'completed','expired'
    ))
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_sub_events_photographer
  ON subscription_events(photographer_id);

CREATE INDEX IF NOT EXISTS idx_sub_events_type
  ON subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_rzp_subs_photographer
  ON razorpay_subscriptions(photographer_id);

CREATE INDEX IF NOT EXISTS idx_rzp_subs_status
  ON razorpay_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_rzp_subs_razorpay_id
  ON razorpay_subscriptions(razorpay_sub_id);

-- 7. RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE razorpay_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only service role can access admin_users
-- (no RLS policy = blocked for all non-service role users)

CREATE POLICY "Photographers view own sub events"
  ON subscription_events FOR SELECT
  USING (
    photographer_id IN (
      SELECT id FROM photographers
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Photographers view own rzp subs"
  ON razorpay_subscriptions FOR SELECT
  USING (
    photographer_id IN (
      SELECT id FROM photographers
      WHERE id = auth.uid()
    )
  );
