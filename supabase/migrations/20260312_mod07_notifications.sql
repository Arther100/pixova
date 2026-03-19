-- ============================================
-- MOD-07: WhatsApp Notifications
-- Tables: whatsapp_notifications, notification_preferences
-- ============================================

-- 1. Notifications log table
--    Every WhatsApp message attempt is logged here.
--    Never delete rows — audit trail.
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  notification_id   UUID PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  studio_id         UUID REFERENCES studio_profiles(id)
                    ON DELETE SET NULL,
  booking_id        UUID REFERENCES bookings(id)
                    ON DELETE SET NULL,
  recipient_mobile  VARCHAR(15) NOT NULL,
  recipient_type    VARCHAR(20) NOT NULL,
  campaign_name     TEXT NOT NULL,
  template_params   JSONB,
  status            VARCHAR(20) DEFAULT 'PENDING',
  aisensy_message_id TEXT,
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT notif_recipient_type_check
    CHECK (recipient_type IN (
      'PHOTOGRAPHER', 'CLIENT'
    )),
  CONSTRAINT notif_status_check
    CHECK (status IN (
      'PENDING', 'SENT', 'FAILED', 'SKIPPED'
    ))
);

-- 2. Notification preferences per studio
CREATE TABLE IF NOT EXISTS notification_preferences (
  studio_id               UUID PRIMARY KEY
                          REFERENCES studio_profiles(id)
                          ON DELETE CASCADE,
  notify_booking_confirmed  BOOLEAN DEFAULT TRUE,
  notify_payment_received   BOOLEAN DEFAULT TRUE,
  notify_agreement_ready    BOOLEAN DEFAULT TRUE,
  notify_gallery_published  BOOLEAN DEFAULT TRUE,
  notify_payment_link       BOOLEAN DEFAULT TRUE,
  notify_event_reminder     BOOLEAN DEFAULT TRUE,
  reminder_hours_before     INTEGER DEFAULT 24,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id
  ON whatsapp_notifications(booking_id);

CREATE INDEX IF NOT EXISTS idx_notifications_studio_id
  ON whatsapp_notifications(studio_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON whatsapp_notifications(status);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON whatsapp_notifications(created_at DESC);

-- 4. RLS
ALTER TABLE whatsapp_notifications
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers view own notifications"
  ON whatsapp_notifications FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Photographers manage own preferences"
  ON notification_preferences FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM studio_profiles
      WHERE photographer_id = auth.uid()
    )
  );
