-- Tracks UPI subscription payment requests submitted by photographers.
-- Admin reviews these and activates via the admin dashboard.

CREATE TABLE IF NOT EXISTS subscription_payment_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id  UUID        NOT NULL,
  plan_slug        TEXT        NOT NULL,  -- STARTER | PRO | STUDIO
  amount_rupees    INTEGER     NOT NULL,
  utr_number       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending', -- pending | activated | rejected
  studio_name      TEXT,
  phone            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_spr_photographer ON subscription_payment_requests(photographer_id);
CREATE INDEX IF NOT EXISTS idx_spr_status ON subscription_payment_requests(status);
