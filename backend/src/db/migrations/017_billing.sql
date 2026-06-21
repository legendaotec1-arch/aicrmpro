ALTER TABLE masters ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS tariff_type VARCHAR(20) NOT NULL DEFAULT 'per_booking';
ALTER TABLE masters ADD COLUMN IF NOT EXISTS tariff_expires_at TIMESTAMPTZ;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS tariff_auto_renew BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS billing_warn_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS billing_critical_sent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE masters DROP CONSTRAINT IF EXISTS masters_tariff_type_check;
ALTER TABLE masters ADD CONSTRAINT masters_tariff_type_check
  CHECK (tariff_type IN ('per_booking', 'unlimited'));

CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2),
  yookassa_payment_id VARCHAR(64),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_tx_yookassa
  ON billing_transactions(yookassa_payment_id)
  WHERE yookassa_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_tx_master ON billing_transactions(master_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  yookassa_payment_id VARCHAR(64) UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_master ON billing_payments(master_id, created_at DESC);
