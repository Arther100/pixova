-- ============================================================
-- Pixova — Complete Database Schema (v2)
-- 22 tables · ENUMs · Indexes · RLS · Triggers
-- Run in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search for search_index


-- ============================================================
-- 1. ENUM TYPES  (drop + recreate — safe when tables are gone)
-- ============================================================

DROP TYPE IF EXISTS plan_tier CASCADE;
CREATE TYPE plan_tier AS ENUM ('starter','professional','studio');

DROP TYPE IF EXISTS subscription_status CASCADE;
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','cancelled','expired');

DROP TYPE IF EXISTS booking_status CASCADE;
CREATE TYPE booking_status AS ENUM ('enquiry','confirmed','in_progress','delivered','completed','cancelled');

DROP TYPE IF EXISTS payment_status CASCADE;
CREATE TYPE payment_status AS ENUM ('created','authorized','captured','partially_refunded','refunded','failed');

DROP TYPE IF EXISTS payment_method CASCADE;
CREATE TYPE payment_method AS ENUM ('razorpay','upi','bank_transfer','cash','cheque','other');

DROP TYPE IF EXISTS invoice_status CASCADE;
CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','partially_paid','overdue','cancelled','void');

DROP TYPE IF EXISTS notification_channel CASCADE;
CREATE TYPE notification_channel AS ENUM ('whatsapp','sms','email','push');

DROP TYPE IF EXISTS notification_status CASCADE;
CREATE TYPE notification_status AS ENUM ('queued','sent','delivered','failed','read');

DROP TYPE IF EXISTS otp_channel CASCADE;
CREATE TYPE otp_channel AS ENUM ('whatsapp','sms');

DROP TYPE IF EXISTS agreement_status CASCADE;
CREATE TYPE agreement_status AS ENUM ('draft','sent','viewed','signed','expired','declined');

DROP TYPE IF EXISTS enquiry_status CASCADE;
CREATE TYPE enquiry_status AS ENUM ('new','contacted','qualified','converted','lost');

DROP TYPE IF EXISTS gallery_status CASCADE;
CREATE TYPE gallery_status AS ENUM ('draft','published','archived','expired');

DROP TYPE IF EXISTS showcase_status CASCADE;
CREATE TYPE showcase_status AS ENUM ('draft','published','archived');


-- ============================================================
-- 2. HELPER FUNCTION — auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLE 1: photographers
-- Core user profile — one per Supabase Auth user
-- ============================================================

CREATE TABLE photographers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         UUID NOT NULL UNIQUE,             -- Supabase Auth user ID
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  avatar_url      TEXT,
  is_onboarded    BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photographers_auth   ON photographers(auth_id);
CREATE INDEX idx_photographers_phone  ON photographers(phone);

CREATE TRIGGER tr_photographers_updated
  BEFORE UPDATE ON photographers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 2: studio_profiles
-- Public-facing studio page — one per photographer
-- ============================================================

CREATE TABLE studio_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id     UUID NOT NULL UNIQUE REFERENCES photographers(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  tagline             TEXT,
  bio                 TEXT,
  logo_url            TEXT,
  cover_url           TEXT,
  phone               TEXT NOT NULL,
  email               TEXT,
  whatsapp            TEXT,
  website             TEXT,
  instagram           TEXT,
  facebook            TEXT,
  youtube             TEXT,
  address_line        TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  specializations     TEXT[] DEFAULT '{}',           -- wedding, portrait, etc.
  languages           TEXT[] DEFAULT '{}',           -- Hindi, English, etc.
  starting_price      BIGINT,                        -- in paise
  currency            TEXT NOT NULL DEFAULT 'INR',
  is_verified         BOOLEAN NOT NULL DEFAULT false,
  is_listed           BOOLEAN NOT NULL DEFAULT true, -- show in marketplace
  total_bookings      INTEGER NOT NULL DEFAULT 0,
  avg_rating          NUMERIC(2,1) NOT NULL DEFAULT 0.0,
  storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_profiles_slug           ON studio_profiles(slug);
CREATE INDEX idx_studio_profiles_city           ON studio_profiles(city);
CREATE INDEX idx_studio_profiles_photographer   ON studio_profiles(photographer_id);
CREATE INDEX idx_studio_profiles_listed         ON studio_profiles(is_listed) WHERE is_listed = true;

CREATE TRIGGER tr_studio_profiles_updated
  BEFORE UPDATE ON studio_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 3: studio_packages
-- Pre-defined service packages offered by the studio
-- ============================================================

CREATE TABLE studio_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id         UUID NOT NULL REFERENCES studio_profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  price             BIGINT NOT NULL,                 -- in paise
  deliverables      TEXT,                            -- "200 edited photos + 1 album"
  duration_hours    INTEGER,                         -- shoot duration
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_packages_studio ON studio_packages(studio_id);

CREATE TRIGGER tr_studio_packages_updated
  BEFORE UPDATE ON studio_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 4: otp_sessions
-- OTP verification for phone-based login
-- ============================================================

CREATE TABLE otp_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  channel     otp_channel NOT NULL DEFAULT 'whatsapp',
  attempts    INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  verified    BOOLEAN NOT NULL DEFAULT false,
  ip_address  INET,
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_sessions_phone     ON otp_sessions(phone);
CREATE INDEX idx_otp_sessions_expires   ON otp_sessions(expires_at);


-- ============================================================
-- TABLE 5: active_sessions
-- Tracks logged-in sessions per user
-- ============================================================

CREATE TABLE active_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID REFERENCES photographers(id) ON DELETE CASCADE,
  client_account_id UUID,                            -- FK added after client_accounts is created
  device_info       TEXT,
  ip_address        INET,
  user_agent        TEXT,
  last_active_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_active_sessions_photographer ON active_sessions(photographer_id);
CREATE INDEX idx_active_sessions_expires      ON active_sessions(expires_at);


-- ============================================================
-- TABLE 6: plans
-- Subscription plan definitions (seeded, rarely changes)
-- ============================================================

CREATE TABLE plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,         -- 'starter', 'professional', 'studio'
  name                  TEXT NOT NULL,
  tier                  plan_tier NOT NULL,
  price_monthly         BIGINT NOT NULL,              -- paise
  price_yearly          BIGINT NOT NULL,              -- paise
  max_storage_bytes     BIGINT NOT NULL,
  max_galleries         INTEGER NOT NULL,             -- -1 = unlimited
  max_photos_per_gallery INTEGER NOT NULL,            -- -1 = unlimited
  max_clients           INTEGER NOT NULL DEFAULT -1,
  max_team_members      INTEGER NOT NULL DEFAULT 1,
  features              JSONB NOT NULL DEFAULT '{}',  -- watermark, branding, etc.
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_plans_updated
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 7: subscriptions
-- Photographer's active plan subscription
-- ============================================================

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id         UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  status                  subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle           TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  razorpay_subscription_id TEXT,
  razorpay_customer_id    TEXT,
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end      TIMESTAMPTZ NOT NULL,
  trial_ends_at           TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_photographer ON subscriptions(photographer_id);
CREATE INDEX idx_subscriptions_status       ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end   ON subscriptions(current_period_end);

CREATE TRIGGER tr_subscriptions_updated
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 8: clients
-- Contacts managed by a photographer (brides, grooms, etc.)
-- ============================================================

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  whatsapp        TEXT,
  address         TEXT,
  city            TEXT,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',               -- bride, groom, corporate, etc.
  source          TEXT,                              -- referral, instagram, website, etc.
  is_active       BOOLEAN NOT NULL DEFAULT true,
  total_spent     BIGINT NOT NULL DEFAULT 0,         -- paise — denormalized
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_photographer        ON clients(photographer_id);
CREATE INDEX idx_clients_phone               ON clients(phone);
CREATE UNIQUE INDEX idx_clients_photographer_phone ON clients(photographer_id, phone);

CREATE TRIGGER tr_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 9: bookings
-- Events / shoots booked by clients
-- ============================================================

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id        UUID REFERENCES studio_packages(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  event_type        TEXT,                            -- wedding, pre-wedding, birthday, etc.
  event_date        DATE,
  event_end_date    DATE,                            -- multi-day events
  event_time        TIME,
  venue             TEXT,
  venue_address     TEXT,
  city              TEXT,
  status            booking_status NOT NULL DEFAULT 'enquiry',
  total_amount      BIGINT NOT NULL DEFAULT 0,       -- paise
  advance_amount    BIGINT NOT NULL DEFAULT 0,       -- paise — required advance
  paid_amount       BIGINT NOT NULL DEFAULT 0,       -- paise — total paid so far
  balance_amount    BIGINT GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  notes             TEXT,
  internal_notes    TEXT,                             -- photographer-only notes
  team_members      TEXT[] DEFAULT '{}',              -- names of assistants
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_photographer ON bookings(photographer_id);
CREATE INDEX idx_bookings_client       ON bookings(client_id);
CREATE INDEX idx_bookings_date         ON bookings(event_date);
CREATE INDEX idx_bookings_status       ON bookings(status);

CREATE TRIGGER tr_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 10: calendar_blocks
-- Manually blocked dates (vacation, personal, etc.)
-- ============================================================

CREATE TABLE calendar_blocks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title             TEXT NOT NULL DEFAULT 'Blocked',
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_blocks_photographer ON calendar_blocks(photographer_id);
CREATE INDEX idx_calendar_blocks_dates        ON calendar_blocks(start_date, end_date);


-- ============================================================
-- TABLE 11: agreements
-- REMOVED — replaced by MOD-04 migration (20260310_mod04_agreements.sql)
-- which uses agreement_id PK, studio_id FK, JSONB snapshot pattern
-- ============================================================


-- ============================================================
-- TABLE 12: galleries
-- Photo galleries shared with clients
-- ============================================================

CREATE TABLE galleries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  cover_photo_url   TEXT,
  status            gallery_status NOT NULL DEFAULT 'draft',
  photo_count       INTEGER NOT NULL DEFAULT 0,
  total_size_bytes  BIGINT NOT NULL DEFAULT 0,
  allow_download    BOOLEAN NOT NULL DEFAULT true,
  allow_selection   BOOLEAN NOT NULL DEFAULT false,
  selection_limit   INTEGER,                         -- NULL = unlimited
  selected_count    INTEGER NOT NULL DEFAULT 0,
  pin               TEXT,                            -- 4-digit PIN for access
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,
  expires_at        TIMESTAMPTZ,                     -- NULL = never expires
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_galleries_photographer ON galleries(photographer_id);
CREATE INDEX idx_galleries_booking      ON galleries(booking_id);
CREATE INDEX idx_galleries_client       ON galleries(client_id);
CREATE INDEX idx_galleries_status       ON galleries(status);
CREATE UNIQUE INDEX idx_galleries_photographer_slug ON galleries(photographer_id, slug);

CREATE TRIGGER tr_galleries_updated
  BEFORE UPDATE ON galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 13: gallery_photos
-- Individual photos within a gallery
-- ============================================================

CREATE TABLE gallery_photos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id          UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  photographer_id     UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  storage_key         TEXT NOT NULL,                  -- R2 object key
  thumbnail_key       TEXT,
  original_filename   TEXT NOT NULL,
  content_type        TEXT NOT NULL,
  size_bytes          BIGINT NOT NULL,
  width               INTEGER,
  height              INTEGER,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_selected         BOOLEAN NOT NULL DEFAULT false,
  selected_by         UUID REFERENCES clients(id) ON DELETE SET NULL,
  selected_at         TIMESTAMPTZ,
  is_favorited        BOOLEAN NOT NULL DEFAULT false,
  caption             TEXT,
  exif_data           JSONB,                          -- camera, lens, aperture, etc.
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gallery_photos_gallery       ON gallery_photos(gallery_id);
CREATE INDEX idx_gallery_photos_photographer  ON gallery_photos(photographer_id);
CREATE INDEX idx_gallery_photos_selected      ON gallery_photos(gallery_id, is_selected);
CREATE INDEX idx_gallery_photos_sort          ON gallery_photos(gallery_id, sort_order);


-- ============================================================
-- TABLE 14: gallery_access_logs
-- Track who viewed / downloaded from a gallery
-- ============================================================

CREATE TABLE gallery_access_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id    UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,                       -- 'viewed', 'downloaded', 'selected', 'shared'
  photo_id      UUID REFERENCES gallery_photos(id) ON DELETE SET NULL,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gallery_access_gallery    ON gallery_access_logs(gallery_id);
CREATE INDEX idx_gallery_access_client     ON gallery_access_logs(client_id);
CREATE INDEX idx_gallery_access_created    ON gallery_access_logs(created_at);


-- ============================================================
-- TABLE 15: payment_records
-- All financial transactions
-- ============================================================

CREATE TABLE payment_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id       UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  booking_id            UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id            UUID,                        -- FK added after invoices table
  amount                BIGINT NOT NULL,             -- paise
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                payment_status NOT NULL DEFAULT 'created',
  method                payment_method NOT NULL DEFAULT 'razorpay',
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT UNIQUE,
  razorpay_signature    TEXT,
  description           TEXT,
  payment_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url           TEXT,                        -- R2 key for receipt screenshot
  notes                 TEXT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_records_photographer ON payment_records(photographer_id);
CREATE INDEX idx_payment_records_booking      ON payment_records(booking_id);
CREATE INDEX idx_payment_records_client       ON payment_records(client_id);
CREATE INDEX idx_payment_records_razorpay_order ON payment_records(razorpay_order_id);
CREATE INDEX idx_payment_records_status       ON payment_records(status);
CREATE INDEX idx_payment_records_date         ON payment_records(payment_date);

CREATE TRIGGER tr_payment_records_updated
  BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 16: invoices
-- Generated invoices for bookings
-- ============================================================

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL,                    -- INV-2026-001 format
  status            invoice_status NOT NULL DEFAULT 'draft',
  subtotal          BIGINT NOT NULL,                 -- paise
  tax_percent       NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount        BIGINT NOT NULL DEFAULT 0,       -- paise
  discount_amount   BIGINT NOT NULL DEFAULT 0,       -- paise
  total_amount      BIGINT NOT NULL,                 -- paise
  paid_amount       BIGINT NOT NULL DEFAULT 0,       -- paise
  balance_amount    BIGINT GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  line_items        JSONB NOT NULL DEFAULT '[]',     -- [{description, qty, rate, amount}]
  notes             TEXT,
  terms             TEXT,
  due_date          DATE,
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  pdf_url           TEXT,                            -- R2 key for generated PDF
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invoices_photographer_number ON invoices(photographer_id, invoice_number);
CREATE INDEX idx_invoices_photographer ON invoices(photographer_id);
CREATE INDEX idx_invoices_booking      ON invoices(booking_id);
CREATE INDEX idx_invoices_client       ON invoices(client_id);
CREATE INDEX idx_invoices_status       ON invoices(status);
CREATE INDEX idx_invoices_due_date     ON invoices(due_date);

CREATE TRIGGER tr_invoices_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from payment_records → invoices (deferred because invoices was created after)
DO $$ BEGIN
  ALTER TABLE payment_records
    ADD CONSTRAINT fk_payment_records_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- TABLE 17: notification_logs
-- Audit trail for all sent notifications
-- ============================================================

CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID REFERENCES photographers(id) ON DELETE SET NULL,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel           notification_channel NOT NULL,
  status            notification_status NOT NULL DEFAULT 'queued',
  template_name     TEXT NOT NULL,                    -- e.g. 'otp_verification', 'gallery_shared'
  recipient_phone   TEXT,
  recipient_email   TEXT,
  subject           TEXT,
  body_preview      TEXT,                             -- first 200 chars
  provider_response JSONB DEFAULT '{}',               -- API response from AiSensy/MSG91
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_logs_photographer ON notification_logs(photographer_id);
CREATE INDEX idx_notification_logs_client       ON notification_logs(client_id);
CREATE INDEX idx_notification_logs_channel      ON notification_logs(channel);
CREATE INDEX idx_notification_logs_status       ON notification_logs(status);
CREATE INDEX idx_notification_logs_created      ON notification_logs(created_at);


-- ============================================================
-- TABLE 18: client_feedback
-- Ratings & reviews left by clients
-- ============================================================

CREATE TABLE client_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  gallery_id        UUID REFERENCES galleries(id) ON DELETE SET NULL,
  rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT,
  is_public         BOOLEAN NOT NULL DEFAULT false,  -- show on studio page
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  response_text     TEXT,                             -- photographer's reply
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_feedback_photographer ON client_feedback(photographer_id);
CREATE INDEX idx_client_feedback_client       ON client_feedback(client_id);
CREATE INDEX idx_client_feedback_public       ON client_feedback(is_public) WHERE is_public = true;

CREATE TRIGGER tr_client_feedback_updated
  BEFORE UPDATE ON client_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 19: enquiries
-- Leads from the marketplace / studio page
-- ============================================================

CREATE TABLE enquiries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  event_type        TEXT,
  event_date        DATE,
  venue_city        TEXT,
  budget_range      TEXT,                            -- '₹50K-1L', '₹1L-2L', etc.
  message           TEXT,
  status            enquiry_status NOT NULL DEFAULT 'new',
  source            TEXT DEFAULT 'website',          -- website, instagram, referral, etc.
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  ip_address        INET,
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  notes             TEXT,                            -- photographer's private notes
  followed_up_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enquiries_photographer ON enquiries(photographer_id);
CREATE INDEX idx_enquiries_status       ON enquiries(status);
CREATE INDEX idx_enquiries_phone        ON enquiries(phone);
CREATE INDEX idx_enquiries_created      ON enquiries(created_at);

CREATE TRIGGER tr_enquiries_updated
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 20: portfolio_showcases
-- Curated portfolio sets for the public studio page
-- ============================================================

CREATE TABLE portfolio_showcases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  cover_photo_url   TEXT,
  category          TEXT,                            -- wedding, portrait, landscape, etc.
  status            showcase_status NOT NULL DEFAULT 'draft',
  photo_keys        TEXT[] DEFAULT '{}',             -- R2 storage keys, ordered
  photo_count       INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_showcases_photographer ON portfolio_showcases(photographer_id);
CREATE INDEX idx_portfolio_showcases_status       ON portfolio_showcases(status);
CREATE UNIQUE INDEX idx_portfolio_showcases_photographer_slug ON portfolio_showcases(photographer_id, slug);

CREATE TRIGGER tr_portfolio_showcases_updated
  BEFORE UPDATE ON portfolio_showcases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE 21: client_accounts
-- Self-serve login for clients (view galleries, make payments)
-- ============================================================

CREATE TABLE client_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id           UUID UNIQUE,                     -- Supabase Auth user ID (nullable until verified)
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  photographer_id   UUID REFERENCES photographers(id) ON DELETE SET NULL,
  phone             TEXT NOT NULL UNIQUE,
  name              TEXT,
  email             TEXT,
  avatar_url        TEXT,
  last_login_at     TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_accounts_auth          ON client_accounts(auth_id);
CREATE INDEX idx_client_accounts_phone         ON client_accounts(phone);
CREATE INDEX idx_client_accounts_client        ON client_accounts(client_id);
CREATE INDEX idx_client_accounts_photographer  ON client_accounts(photographer_id);

CREATE TRIGGER tr_client_accounts_updated
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Now add the FK from active_sessions → client_accounts
DO $$ BEGIN
  ALTER TABLE active_sessions
    ADD CONSTRAINT fk_active_sessions_client_account
    FOREIGN KEY (client_account_id) REFERENCES client_accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_active_sessions_client_account ON active_sessions(client_account_id);


-- ============================================================
-- TABLE 22: search_index
-- Denormalized searchable data for fast full-text / trigram search
-- ============================================================

CREATE TABLE search_index (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       TEXT NOT NULL,                    -- 'studio', 'photographer', 'gallery', 'booking', 'client'
  entity_id         UUID NOT NULL,
  photographer_id   UUID REFERENCES photographers(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  subtitle          TEXT,
  body              TEXT,                             -- concatenated searchable text
  city              TEXT,
  tags              TEXT[] DEFAULT '{}',
  search_vector     TSVECTOR,                         -- generated full-text search column
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_search_index_entity ON search_index(entity_type, entity_id);
CREATE INDEX idx_search_index_photographer  ON search_index(photographer_id);
CREATE INDEX idx_search_index_fts           ON search_index USING GIN(search_vector);
CREATE INDEX idx_search_index_trgm_title    ON search_index USING GIN(title gin_trgm_ops);
CREATE INDEX idx_search_index_city          ON search_index(city);

CREATE TRIGGER tr_search_index_updated
  BEFORE UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate search_vector from title + subtitle + body
CREATE OR REPLACE FUNCTION search_index_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_search_index_vector
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION search_index_vector_update();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE photographers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_packages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks        ENABLE ROW LEVEL SECURITY;
-- agreements RLS handled by MOD-04 migration
ALTER TABLE galleries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_access_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_showcases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index           ENABLE ROW LEVEL SECURITY;

-- ── Photographers ──
CREATE POLICY "photographers_own" ON photographers
  FOR ALL USING (auth_id = auth.uid());

-- ── Studio Profiles ──
CREATE POLICY "studio_profiles_owner" ON studio_profiles
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "studio_profiles_public_read" ON studio_profiles
  FOR SELECT USING (is_listed = true);

-- ── Studio Packages ──
CREATE POLICY "studio_packages_owner" ON studio_packages
  FOR ALL USING (
    studio_id IN (
      SELECT sp.id FROM studio_profiles sp
      JOIN photographers p ON sp.photographer_id = p.id
      WHERE p.auth_id = auth.uid()
    )
  );

CREATE POLICY "studio_packages_public_read" ON studio_packages
  FOR SELECT USING (
    is_active = true AND studio_id IN (
      SELECT id FROM studio_profiles WHERE is_listed = true
    )
  );

-- ── OTP Sessions — service role only (no user policies) ──
-- Accessed exclusively via service role key from API routes

-- ── Active Sessions ──
CREATE POLICY "active_sessions_own" ON active_sessions
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
    OR client_account_id IN (SELECT id FROM client_accounts WHERE auth_id = auth.uid())
  );

-- ── Plans — public read ──
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (is_active = true);

-- ── Subscriptions ──
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Clients ──
CREATE POLICY "clients_photographer_owner" ON clients
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Bookings ──
CREATE POLICY "bookings_photographer_owner" ON bookings
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Calendar Blocks ──
CREATE POLICY "calendar_blocks_owner" ON calendar_blocks
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Agreements — RLS handled by MOD-04 migration ──

-- ── Galleries ──
CREATE POLICY "galleries_photographer_owner" ON galleries
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "galleries_published_read" ON galleries
  FOR SELECT USING (status = 'published');

-- ── Gallery Photos ──
CREATE POLICY "gallery_photos_photographer_owner" ON gallery_photos
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "gallery_photos_published_read" ON gallery_photos
  FOR SELECT USING (
    gallery_id IN (SELECT id FROM galleries WHERE status = 'published')
  );

-- ── Gallery Access Logs ──
CREATE POLICY "gallery_access_logs_photographer" ON gallery_access_logs
  FOR ALL USING (
    gallery_id IN (
      SELECT id FROM galleries
      WHERE photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
    )
  );

-- ── Payment Records ──
CREATE POLICY "payment_records_photographer_owner" ON payment_records
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Invoices ──
CREATE POLICY "invoices_photographer_owner" ON invoices
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "invoices_client_read" ON invoices
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN client_accounts ca ON ca.client_id = c.id
      WHERE ca.auth_id = auth.uid()
    )
  );

-- ── Notification Logs ──
CREATE POLICY "notification_logs_photographer" ON notification_logs
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Client Feedback ──
CREATE POLICY "client_feedback_photographer" ON client_feedback
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "client_feedback_public_read" ON client_feedback
  FOR SELECT USING (is_public = true AND is_verified = true);

-- ── Enquiries ──
CREATE POLICY "enquiries_photographer_owner" ON enquiries
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- Allow anonymous insert for public enquiry forms
CREATE POLICY "enquiries_public_insert" ON enquiries
  FOR INSERT WITH CHECK (true);

-- ── Portfolio Showcases ──
CREATE POLICY "portfolio_showcases_photographer_owner" ON portfolio_showcases
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

CREATE POLICY "portfolio_showcases_published_read" ON portfolio_showcases
  FOR SELECT USING (status = 'published');

-- ── Client Accounts ──
CREATE POLICY "client_accounts_own" ON client_accounts
  FOR ALL USING (auth_id = auth.uid());

CREATE POLICY "client_accounts_photographer_read" ON client_accounts
  FOR SELECT USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );

-- ── Search Index — public read ──
CREATE POLICY "search_index_public_read" ON search_index
  FOR SELECT USING (true);

CREATE POLICY "search_index_photographer_manage" ON search_index
  FOR ALL USING (
    photographer_id IN (SELECT id FROM photographers WHERE auth_id = auth.uid())
  );


-- ============================================================
-- SEED DATA — Plans
-- ============================================================

INSERT INTO plans (slug, name, tier, price_monthly, price_yearly, max_storage_bytes, max_galleries, max_photos_per_gallery, max_clients, max_team_members, features, sort_order) VALUES
  ('starter',      'Starter',      'starter',      99900,   999900,   10737418240,  20,   500,  50,  1, '{"watermark": true,  "custom_branding": false, "priority_support": false}', 1),
  ('professional', 'Professional', 'professional', 199900,  1999900,  53687091200,  100,  2000, 200, 3, '{"watermark": true,  "custom_branding": true,  "priority_support": false}', 2),
  ('studio',       'Studio',       'studio',       499900,  4999900,  214748364800, -1,   -1,   -1,  10,'{"watermark": true,  "custom_branding": true,  "priority_support": true}',  3)
ON CONFLICT (slug) DO NOTHING;
