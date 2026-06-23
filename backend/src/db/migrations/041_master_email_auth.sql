-- Вход и регистрация мастера по коду на email

CREATE TABLE IF NOT EXISTS master_email_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  payload JSONB,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_email_codes_email ON master_email_codes(LOWER(email), created_at DESC);
