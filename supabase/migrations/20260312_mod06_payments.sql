-- ============================================
-- MOD-06: Payment Tracking
-- Extends existing payment_records, adds razorpay_orders,
-- adds payment_status to bookings
-- ============================================

-- 1. Add missing columns to payment_records
ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(12) DEFAULT 'PHOTOGRAPHER',
  ADD COLUMN IF NOT EXISTS razorpay_status VARCHAR(20);

-- Constraints on new columns
ALTER TABLE payment_records
  DROP CONSTRAINT IF EXISTS payment_type_check;
ALTER TABLE payment_records
  ADD CONSTRAINT payment_type_check
  CHECK (payment_type IS NULL OR payment_type IN (
    'ADVANCE', 'PARTIAL', 'FINAL', 'REFUND', 'OVERAGE'
  ));

ALTER TABLE payment_records
  DROP CONSTRAINT IF EXISTS recorded_by_check;
ALTER TABLE payment_records
  ADD CONSTRAINT recorded_by_check
  CHECK (recorded_by IN ('PHOTOGRAPHER', 'CLIENT'));

ALTER TABLE payment_records
  DROP CONSTRAINT IF EXISTS razorpay_status_check;
ALTER TABLE payment_records
  ADD CONSTRAINT razorpay_status_check
  CHECK (razorpay_status IS NULL OR razorpay_status IN (
    'CREATED', 'ATTEMPTED', 'PAID', 'FAILED'
  ));

-- 2. Add payment_status to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'PENDING', 'PARTIAL', 'PAID', 'OVERPAID', 'REFUNDED'
  ));

-- Backfill payment_status for existing bookings
UPDATE bookings SET payment_status =
  CASE
    WHEN paid_amount <= 0 THEN 'PENDING'
    WHEN paid_amount > total_amount THEN 'OVERPAID'
    WHEN paid_amount >= total_amount AND paid_amount > 0 THEN 'PAID'
    ELSE 'PARTIAL'
  END
WHERE payment_status IS NULL OR payment_status = 'PENDING';

-- 3. razorpay_orders table — tracks payment link lifecycle
CREATE TABLE IF NOT EXISTS razorpay_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  amount_paise      BIGINT NOT NULL,
  currency          VARCHAR(5) DEFAULT 'INR',
  status            VARCHAR(20) DEFAULT 'CREATED',
  payment_type      TEXT NOT NULL,
  short_url         TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  paid_at           TIMESTAMPTZ,

  CONSTRAINT rz_order_status_check
    CHECK (status IN (
      'CREATED', 'ATTEMPTED', 'PAID', 'EXPIRED', 'CANCELLED'
    )),
  CONSTRAINT rz_order_payment_type_check
    CHECK (payment_type IN ('ADVANCE', 'PARTIAL', 'FINAL'))
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_booking
  ON razorpay_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_photographer
  ON razorpay_orders(photographer_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_razorpay_id
  ON razorpay_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_receipt
  ON payment_records(receipt_number);

-- 5. RLS
ALTER TABLE razorpay_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photographers manage own orders" ON razorpay_orders;
CREATE POLICY "Photographers manage own orders"
  ON razorpay_orders FOR ALL
  USING (
    photographer_id IN (
      SELECT id FROM photographers WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public read razorpay orders" ON razorpay_orders;
CREATE POLICY "Public read razorpay orders"
  ON razorpay_orders FOR SELECT
  USING (true);
