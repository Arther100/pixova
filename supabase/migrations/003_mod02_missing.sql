-- ============================================================
-- MOD-02 Gap-fill: status history, calendar_blocks FK, quota
-- ============================================================

-- 1. booking_status_history — log every status transition
CREATE TABLE IF NOT EXISTS booking_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status      booking_status NOT NULL,
  new_status      booking_status NOT NULL,
  changed_by      UUID REFERENCES photographers(id) ON DELETE SET NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bsh_booking   ON booking_status_history(booking_id);
CREATE INDEX idx_bsh_created   ON booking_status_history(created_at);

-- 2. Add booking_id FK to calendar_blocks so we can link blocks to bookings
ALTER TABLE calendar_blocks
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_booking ON calendar_blocks(booking_id);

-- 3. Add booking_limit to plans (default -1 = unlimited)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS booking_limit INTEGER NOT NULL DEFAULT -1;

-- 4. Add bookings_this_cycle counter to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS bookings_this_cycle INTEGER NOT NULL DEFAULT 0;
