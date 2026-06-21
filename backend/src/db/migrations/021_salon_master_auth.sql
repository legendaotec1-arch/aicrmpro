-- Логин и процент мастера салона (исполнителя)
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS salon_masters_email_lower_unique
  ON salon_masters (LOWER(email))
  WHERE email IS NOT NULL AND email <> '';
