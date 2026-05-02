-- ─────────────────────────────────────────
-- MOD-11 + MOD-12 + MOD-13 + MOD-14
-- Marketplace System Migration
-- Date: 2026-04-25
-- ─────────────────────────────────────────

-- 1. Extend studio_profiles
--    NOTE: avg_rating already exists.
--    instagram/website already exist as 'instagram'/'website'.
--    Only add truly new columns.
-- ─────────────────────────────────────────
ALTER TABLE studio_profiles
  ADD COLUMN IF NOT EXISTS years_experience   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_events       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_rate      INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS featured           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_complete   BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────
-- 2. Portfolio photos
--    Photographer marks gallery photos
--    to show on public profile
-- ─────────────────────────────────────────
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS show_in_portfolio BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────
-- 3. Drop new tables to ensure clean schema
--    (safe: marketplace tables are new)
-- ─────────────────────────────────────────
DROP TABLE IF EXISTS enquiry_studios CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS saved_studios CASCADE;
DROP TABLE IF EXISTS client_accounts CASCADE;

-- ─────────────────────────────────────────
-- 4. Client accounts
--    One account per phone number
-- ─────────────────────────────────────────
CREATE TABLE client_accounts (
  account_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(15) UNIQUE NOT NULL,
  name          TEXT,
  email         TEXT,
  city          TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- 5. Enquiries
-- ─────────────────────────────────────────
CREATE TABLE enquiries (
  enquiry_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID REFERENCES client_accounts(account_id) ON DELETE SET NULL,
  client_name   TEXT NOT NULL,
  client_phone  VARCHAR(15) NOT NULL,
  client_email  TEXT,
  event_type    TEXT NOT NULL,
  event_date    DATE NOT NULL,
  event_end_date DATE,
  event_city    TEXT NOT NULL,
  venue_name    TEXT,
  budget_min    BIGINT,
  budget_max    BIGINT,
  guest_count   INTEGER,
  message       TEXT,
  status        VARCHAR(20) DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','CLOSED','EXPIRED')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- ─────────────────────────────────────────
-- 6. Enquiry studios
--    NOTE: studio_profiles PK is 'id' not 'studio_id'
-- ─────────────────────────────────────────
CREATE TABLE enquiry_studios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id    UUID NOT NULL REFERENCES enquiries(enquiry_id) ON DELETE CASCADE,
  studio_id     UUID NOT NULL REFERENCES studio_profiles(id) ON DELETE CASCADE,
  status        VARCHAR(20) DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','SEEN','REPLIED','ACCEPTED','DECLINED','CONVERTED')),
  quote_amount  BIGINT,
  quote_note    TEXT,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  seen_at       TIMESTAMPTZ,
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enquiry_id, studio_id)
);

-- ─────────────────────────────────────────
-- 7. Saved studios (client wishlist)
--    NOTE: studio_profiles PK is 'id' not 'studio_id'
-- ─────────────────────────────────────────
CREATE TABLE saved_studios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES client_accounts(account_id) ON DELETE CASCADE,
  studio_id   UUID NOT NULL REFERENCES studio_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, studio_id)
);

-- ─────────────────────────────────────────
-- 7. OTP sessions — add role column
-- ─────────────────────────────────────────
ALTER TABLE otp_sessions
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'photographer';

-- ─────────────────────────────────────────
-- 8. Indexes
--    NOTE: studio_profiles PK is 'id'
--          gallery_photos uses 'photographer_id' not 'studio_id'
--          calendar_blocks uses 'photographer_id'
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_studio_profiles_city
  ON studio_profiles(city) WHERE is_listed = TRUE;

CREATE INDEX IF NOT EXISTS idx_studio_profiles_slug
  ON studio_profiles(slug) WHERE is_listed = TRUE;

CREATE INDEX IF NOT EXISTS idx_studio_profiles_rating
  ON studio_profiles(avg_rating DESC) WHERE is_listed = TRUE;

CREATE INDEX IF NOT EXISTS idx_enquiries_phone
  ON enquiries(client_phone);

CREATE INDEX IF NOT EXISTS idx_enquiry_studios_studio
  ON enquiry_studios(studio_id, status);

CREATE INDEX IF NOT EXISTS idx_saved_studios_account
  ON saved_studios(account_id);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_portfolio
  ON gallery_photos(photographer_id, show_in_portfolio)
  WHERE show_in_portfolio = TRUE
  AND deleted_at IS NULL;

-- ─────────────────────────────────────────
-- 9. RLS
-- ─────────────────────────────────────────
ALTER TABLE client_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_studios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_studios       ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend via createSupabaseAdmin)
CREATE POLICY "Service role full access client_accounts"
  ON client_accounts FOR ALL USING (true);

CREATE POLICY "Service role full access enquiries"
  ON enquiries FOR ALL USING (true);

CREATE POLICY "Service role full access enquiry_studios"
  ON enquiry_studios FOR ALL USING (true);

CREATE POLICY "Service role full access saved_studios"
  ON saved_studios FOR ALL USING (true);

-- Public read for listed portfolio photos
DROP POLICY IF EXISTS "Public read published portfolio photos" ON gallery_photos;
CREATE POLICY "Public read published portfolio photos"
  ON gallery_photos FOR SELECT
  USING (
    show_in_portfolio = TRUE
    AND deleted_at IS NULL
  );

-- ─────────────────────────────────────────
-- 10. Auto-update avg_rating on feedback insert/update
--     NOTE: client_feedback.studio_id references studio_profiles.id
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_studio_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE studio_profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM client_feedback
      WHERE studio_id = NEW.studio_id
      AND is_public = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM client_feedback
      WHERE studio_id = NEW.studio_id
      AND is_public = TRUE
    )
  WHERE id = NEW.studio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_studio_rating ON client_feedback;
CREATE TRIGGER trigger_update_studio_rating
  AFTER INSERT OR UPDATE ON client_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_rating();
