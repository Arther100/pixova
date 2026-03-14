-- ============================================
-- MOD-04: Agreement & Contract tables
-- ============================================

-- 1. Agreements table (drop old schema from initial migration if it exists)
DROP TABLE IF EXISTS agreements CASCADE;
CREATE TABLE agreements (
  agreement_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID UNIQUE NOT NULL
                    REFERENCES bookings(id) ON DELETE CASCADE,
  studio_id         UUID NOT NULL
                    REFERENCES studio_profiles(id),
  agreement_ref     VARCHAR(30) UNIQUE NOT NULL,
  agreement_data    JSONB NOT NULL,
  pdf_r2_key        TEXT,
  pdf_url           TEXT,
  status            VARCHAR(20) DEFAULT 'GENERATED',
  client_viewed_at  TIMESTAMPTZ,
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  regenerated_at    TIMESTAMPTZ,

  CONSTRAINT agreements_status_check
    CHECK (status IN ('GENERATED','VIEWED','ACKNOWLEDGED'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_agreements_booking_id
  ON agreements(booking_id);
CREATE INDEX IF NOT EXISTS idx_agreements_studio_id
  ON agreements(studio_id);

-- 2. Cancellation policies table
CREATE TABLE IF NOT EXISTS cancellation_policies (
  policy_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID UNIQUE NOT NULL
                REFERENCES studio_profiles(id),
  policy_text   TEXT NOT NULL
                CONSTRAINT policy_length CHECK (
                  char_length(policy_text) <= 2000
                ),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add portal_token to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS portal_token VARCHAR(16) UNIQUE;

-- Backfill portal tokens for existing bookings
UPDATE bookings
  SET portal_token = substr(md5(random()::text), 1, 16)
  WHERE portal_token IS NULL;

-- 4. Add studio fields needed for agreement snapshot (if not exist)
ALTER TABLE studio_profiles
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(20);

-- 5. RLS policies
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own agreements"
  ON agreements FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Public can read agreement by id"
  ON agreements FOR SELECT
  USING (true);

CREATE POLICY "Photographers manage own policy"
  ON cancellation_policies FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );
