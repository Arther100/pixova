-- ============================================================
-- MOD-03: Calendar & Availability — constraints + public read
-- No new tables needed (calendar_blocks already exists)
-- Depends on: 003_mod02_missing.sql, 20260310_mod02_missing.sql
-- ============================================================

-- 1. Source constraint: MANUAL (photographer created), BOOKING (auto from booking)
ALTER TABLE calendar_blocks DROP CONSTRAINT IF EXISTS calendar_blocks_source_check;
ALTER TABLE calendar_blocks
  ADD CONSTRAINT calendar_blocks_source_check
  CHECK (source IN ('MANUAL', 'BOOKING'));

-- 2. Status constraint
ALTER TABLE calendar_blocks DROP CONSTRAINT IF EXISTS calendar_blocks_status_check;
ALTER TABLE calendar_blocks
  ADD CONSTRAINT calendar_blocks_status_check
  CHECK (status IN ('BOOKED', 'ENQUIRY', 'BLOCKED', 'PARTIAL'));

-- 3. Unique constraint: one manual block per date per photographer
--    (BOOKING blocks may have multiple per date — edge case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_manual_unique
  ON calendar_blocks(photographer_id, start_date)
  WHERE source = 'MANUAL';

-- 4. Public read policy for availability endpoint (used by MOD-13 enquiry form)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_blocks'
      AND policyname = 'public_can_read_availability'
  ) THEN
    EXECUTE '
      CREATE POLICY "public_can_read_availability"
        ON calendar_blocks FOR SELECT
        USING (
          photographer_id IN (
            SELECT photographer_id FROM studio_profiles
            WHERE is_listed = TRUE
          )
        )
    ';
  END IF;
END $$;
