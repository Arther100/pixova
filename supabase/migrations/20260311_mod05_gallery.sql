-- ============================================
-- MOD-05: Gallery & Photo Delivery
-- Adapts existing galleries + gallery_photos tables
-- ============================================

-- 1. Add missing columns to galleries
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS password_hint TEXT,
  ADD COLUMN IF NOT EXISTS client_notified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN DEFAULT TRUE;

-- 2. Add missing columns to gallery_photos
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Add cover_photo_r2_key to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cover_photo_r2_key TEXT;

-- 4. Index for non-deleted photos
CREATE INDEX IF NOT EXISTS idx_gallery_photos_not_deleted
  ON gallery_photos(gallery_id) WHERE deleted_at IS NULL;

-- 5. RLS policies
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Photographers manage own galleries" ON galleries;
DROP POLICY IF EXISTS "Public can read published galleries" ON galleries;
DROP POLICY IF EXISTS "Photographers manage own photos" ON gallery_photos;
DROP POLICY IF EXISTS "Public can read visible photos" ON gallery_photos;

CREATE POLICY "Photographers manage own galleries"
  ON galleries FOR ALL
  USING (
    photographer_id IN (
      SELECT id FROM photographers
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can read published galleries"
  ON galleries FOR SELECT
  USING (status = 'published');

CREATE POLICY "Photographers manage own photos"
  ON gallery_photos FOR ALL
  USING (
    photographer_id IN (
      SELECT id FROM photographers
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can read visible photos"
  ON gallery_photos FOR SELECT
  USING (
    client_visible = TRUE
    AND deleted_at IS NULL
    AND gallery_id IN (
      SELECT id FROM galleries WHERE status = 'published'
    )
  );
