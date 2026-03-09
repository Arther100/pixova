-- ============================================================
-- Migration: Add booking_ref column (PX{NNNN}-{YYYY} format)
-- ============================================================

-- Add booking_ref column
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_ref TEXT;

-- Create unique index per photographer
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_photographer_ref
  ON bookings(photographer_id, booking_ref);

-- Create a sequence-like function for generating booking refs
-- Format: PX0001-2026, PX0002-2026, etc.
CREATE OR REPLACE FUNCTION generate_booking_ref(p_photographer_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_num INTEGER;
  ref TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(booking_ref FROM 'PX(\d+)-') AS INTEGER
    )
  ), 0) + 1
  INTO next_num
  FROM bookings
  WHERE photographer_id = p_photographer_id
    AND booking_ref LIKE '%-%'
    AND booking_ref IS NOT NULL;

  ref := 'PX' || lpad(next_num::TEXT, 4, '0') || '-' || current_year;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;
