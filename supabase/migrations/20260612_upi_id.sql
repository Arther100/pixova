-- Add UPI ID to studio_profiles for direct UPI payment links
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT NULL;

COMMENT ON COLUMN studio_profiles.upi_id IS 'Photographer UPI ID (e.g. name@oksbi) for generating client payment links';
