-- ============================================
-- Photo Selection + Download Support
-- Add selection_locked to galleries
-- Add client_favourited to gallery_photos
-- ============================================

-- 1. Add selection_locked to galleries
-- Photographer locks after reviewing client picks
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS selection_locked
    BOOLEAN DEFAULT FALSE;

-- 2. Add client_favourited to gallery_photos
-- Separate from is_favorited (photographer's own favourites)
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS client_favourited
    BOOLEAN DEFAULT FALSE;

-- 3. Index for fast "show me client picks" queries
CREATE INDEX IF NOT EXISTS idx_photos_client_fav
  ON gallery_photos(gallery_id, client_favourited)
  WHERE client_favourited = TRUE
  AND deleted_at IS NULL;
