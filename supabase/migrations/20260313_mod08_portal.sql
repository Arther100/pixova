-- ============================================
-- MOD-08: Client Portal & Feedback
-- Tables: client_feedback, client_messages,
--         portal_access_logs
-- Alter: bookings.feedback_requested_at
-- ============================================

-- 1. Client feedback table
CREATE TABLE IF NOT EXISTS client_feedback (
  feedback_id       UUID PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  booking_id        UUID UNIQUE NOT NULL
                    REFERENCES bookings(id)
                    ON DELETE CASCADE,
  client_id         UUID NOT NULL
                    REFERENCES clients(id),
  studio_id         UUID NOT NULL
                    REFERENCES studio_profiles(id),
  rating            INTEGER NOT NULL
                    CONSTRAINT rating_range
                    CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT
                    CONSTRAINT review_length
                    CHECK (char_length(review_text) <= 1000),
  is_public         BOOLEAN DEFAULT FALSE,
  photographer_reply TEXT
                    CONSTRAINT reply_length
                    CHECK (char_length(photographer_reply) <= 500),
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  reply_at          TIMESTAMPTZ
);

-- 2. Client messages table (one-way: client → photographer)
CREATE TABLE IF NOT EXISTS client_messages (
  message_id        UUID PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL
                    REFERENCES bookings(id)
                    ON DELETE CASCADE,
  client_id         UUID NOT NULL
                    REFERENCES clients(id),
  studio_id         UUID NOT NULL
                    REFERENCES studio_profiles(id),
  message_text      TEXT NOT NULL
                    CONSTRAINT message_length
                    CHECK (char_length(message_text) <= 500),
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Portal access log
CREATE TABLE IF NOT EXISTS portal_access_logs (
  log_id            UUID PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL
                    REFERENCES bookings(id)
                    ON DELETE CASCADE,
  portal_token      VARCHAR(16) NOT NULL,
  ip_address        TEXT,
  user_agent        TEXT,
  accessed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add feedback_requested flag to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS feedback_requested_at
    TIMESTAMPTZ;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_studio_id
  ON client_feedback(studio_id);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id
  ON client_messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON client_messages(studio_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_portal_logs_booking
  ON portal_access_logs(booking_id);

-- 6. RLS
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers read own feedback"
  ON client_feedback FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Public can read public feedback"
  ON client_feedback FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Photographers reply to feedback"
  ON client_feedback FOR UPDATE
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Photographers read own messages"
  ON client_messages FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Photographers read own portal logs"
  ON portal_access_logs FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE photographer_id IN (
        SELECT photographer_id FROM studio_profiles
        WHERE id IN (
          SELECT id FROM studio_profiles
          WHERE photographer_id = auth.uid()
        )
      )
    )
  );
