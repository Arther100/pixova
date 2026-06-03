-- ============================================
-- Migration: 20260603_fixes
-- 1. Add role column to otp_sessions
-- 2. Rename studio_profiles.instagram → instagram_url
-- 3. Rename whatsapp_notifications.aisensy_message_id → message_id
-- ============================================

-- 1. otp_sessions.role — allows separating photographer vs client OTP flows
ALTER TABLE otp_sessions
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'photographer'
    CHECK (role IN ('photographer', 'client'));

-- Back-fill existing rows that don't have a role yet
-- (safe since all existing rows were photographer OTPs)
UPDATE otp_sessions SET role = 'photographer' WHERE role IS NULL;

-- 2. Rename instagram → instagram_url on studio_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studio_profiles' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE studio_profiles RENAME COLUMN instagram TO instagram_url;
  END IF;
END
$$;

-- 3. Rename aisensy_message_id → message_id on whatsapp_notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_notifications' AND column_name = 'aisensy_message_id'
  ) THEN
    ALTER TABLE whatsapp_notifications RENAME COLUMN aisensy_message_id TO message_id;
  END IF;
END
$$;
