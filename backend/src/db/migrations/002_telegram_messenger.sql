-- Поддержка Telegram и канала мессенджера (MAX / telegram)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS messenger VARCHAR(20) DEFAULT 'max';

UPDATE clients SET messenger = 'max' WHERE messenger IS NULL;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_messenger_check;
ALTER TABLE clients ADD CONSTRAINT clients_messenger_check
  CHECK (messenger IN ('max', 'telegram'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_telegram_user_id
  ON clients(telegram_user_id) WHERE telegram_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_messenger ON clients(messenger);
