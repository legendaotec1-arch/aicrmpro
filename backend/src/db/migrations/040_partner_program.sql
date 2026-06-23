-- Партнёрская программа

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  referral_code VARCHAR(32) NOT NULL UNIQUE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 30,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);

CREATE TABLE IF NOT EXISTS partner_email_codes (
  id SERIAL PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_email_codes_partner ON partner_email_codes(partner_id, created_at DESC);

ALTER TABLE masters ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partners(id);
CREATE INDEX IF NOT EXISTS idx_masters_partner_ref ON masters(referred_by_partner_id) WHERE referred_by_partner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  master_id UUID NOT NULL REFERENCES masters(id),
  billing_payment_id UUID,
  payment_type VARCHAR(40) NOT NULL,
  payment_amount NUMERIC(12, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_commissions_payment
  ON partner_commissions(billing_payment_id) WHERE billing_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS partner_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  amount NUMERIC(12, 2) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  card_number VARCHAR(32) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  admin_withdrawal_id INTEGER,
  processed_at TIMESTAMPTZ,
  processed_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_withdrawals_status ON partner_withdrawals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS partner_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(40) NOT NULL DEFAULT 'other',
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_assets_active ON partner_assets(is_active, sort_order);
