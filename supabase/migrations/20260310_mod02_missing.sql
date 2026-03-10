-- ============================================================
-- MOD-02 Gap-fill #2: calendar block status/source, plan overage, RLS
-- Depends on: 003_mod02_missing.sql (status history table, booking_id FK, quota columns)
-- ============================================================

-- 1. Add status and source columns to calendar_blocks
--    status: BLOCKED (manual), ENQUIRY (booking pending), BOOKED (confirmed)
--    source: MANUAL (photographer created), BOOKING (auto-created from booking)
ALTER TABLE calendar_blocks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'BLOCKED';

ALTER TABLE calendar_blocks
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'MANUAL';

-- 2. Add overage columns to plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS overage_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS overage_price BIGINT NOT NULL DEFAULT 0; -- paise

-- 3. Set plan booking limits and overage config
UPDATE plans SET booking_limit = 10
  WHERE slug = 'starter';

UPDATE plans SET booking_limit = 30,
                 overage_enabled = true,
                 overage_price = 3900   -- ₹39 in paise
  WHERE slug = 'professional';

UPDATE plans SET booking_limit = -1     -- unlimited
  WHERE slug = 'studio';

-- 4. RLS for booking_status_history
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bsh_photographer_read"
  ON booking_status_history FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE photographer_id IN (
        SELECT id FROM photographers WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "bsh_photographer_insert"
  ON booking_status_history FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings
      WHERE photographer_id IN (
        SELECT id FROM photographers WHERE auth_id = auth.uid()
      )
    )
  );

-- 5. Ensure calendar_blocks has RLS enabled + policy
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;

-- Safe idempotent policy creation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_blocks'
      AND policyname = 'calendar_blocks_photographer_owner'
  ) THEN
    EXECUTE '
      CREATE POLICY "calendar_blocks_photographer_owner"
        ON calendar_blocks FOR ALL
        USING (
          photographer_id IN (
            SELECT id FROM photographers WHERE auth_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;
