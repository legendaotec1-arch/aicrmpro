#!/bin/bash
# Безопасные миграции после обновления (не ломают уже применённые)
set -e
cd /opt/aicrmpro

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod-external-ssl.yml}"
DB_NAME="${DB_NAME:-crm_max}"

if [ -f .env ]; then
  DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "$DB_NAME")
fi

echo "==> Pending migrations (database: $DB_NAME)..."

# Если база пустая или неверное имя — подсказка в логах
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d "$DB_NAME" -tAc "SELECT COUNT(*)::int FROM masters;" || true

docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE masters ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE price_items ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE price_items ADD COLUMN IF NOT EXISTS price_max DECIMAL(10, 2);
UPDATE price_items SET price_type = 'fixed' WHERE price_type IS NULL;
ALTER TABLE price_items DROP CONSTRAINT IF EXISTS price_items_price_type_check;
ALTER TABLE price_items ADD CONSTRAINT price_items_price_type_check
  CHECK (price_type IN ('fixed', 'from', 'to', 'range'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS client_theme VARCHAR(50) DEFAULT 'warm-sand';
UPDATE masters SET client_theme = 'warm-sand' WHERE client_theme IS NULL OR client_theme = '';
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_telegram TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_vk TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_website TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_max TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_exceptions_team
  ON schedule_exceptions (salon_master_id, exception_date);

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
  ON billing_transactions(yookassa_payment_id) WHERE yookassa_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  yookassa_payment_id VARCHAR(64) UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  name VARCHAR(255),
  reason TEXT NOT NULL,
  salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS blacklist_master_id_client_id_key ON blacklist(master_id, client_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_master ON blacklist(master_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_client ON blacklist(client_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_salon_master ON blacklist (salon_master_id);

ALTER TABLE masters ADD COLUMN IF NOT EXISTS video_reel_url TEXT;

ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE salon_masters ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS salon_masters_email_lower_unique
  ON salon_masters (LOWER(email))
  WHERE email IS NOT NULL AND email <> '';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show'));

ALTER TABLE work_schedule
  DROP CONSTRAINT IF EXISTS work_schedule_master_id_day_of_week_key;
ALTER TABLE schedule_exceptions
  DROP CONSTRAINT IF EXISTS schedule_exceptions_master_id_exception_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_schedule_team
  ON work_schedule (salon_master_id, day_of_week)
  WHERE salon_master_id IS NOT NULL;

ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_1 TEXT;
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_2 TEXT;
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_3 TEXT;
UPDATE salon_client_profiles
SET note_1 = notes
WHERE notes IS NOT NULL AND TRIM(notes) != '' AND (note_1 IS NULL OR TRIM(note_1) = '');

ALTER TABLE masters ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Moscow';
UPDATE masters SET timezone = 'Europe/Moscow' WHERE timezone IS NULL OR TRIM(timezone) = '';

CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'todo',
  assignee_email VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_status_check;
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'review', 'done'));
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_priority_check
  CHECK (priority IN ('low', 'normal', 'high'));

CREATE TABLE IF NOT EXISTS admin_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES admin_folders(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_folders_parent ON admin_folders(parent_id);

CREATE TABLE IF NOT EXISTS admin_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES admin_folders(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_files_folder ON admin_files(folder_id);

CREATE TABLE IF NOT EXISTS admin_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_created ON admin_withdrawals(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_vault_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  url TEXT,
  login VARCHAR(500),
  password TEXT,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_vault_created ON admin_vault_entries(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_ad_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  platform VARCHAR(30) NOT NULL DEFAULT 'other',
  channel_url TEXT,
  contact TEXT,
  audience_size INT,
  quoted_price DECIMAL(12, 2),
  allocated_budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  conditions TEXT,
  notes TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE admin_ad_leads DROP CONSTRAINT IF EXISTS admin_ad_leads_status_check;
ALTER TABLE admin_ad_leads ADD CONSTRAINT admin_ad_leads_status_check
  CHECK (status IN ('new', 'contacted', 'negotiating', 'agreed', 'paid', 'rejected', 'done'));
ALTER TABLE admin_ad_leads DROP CONSTRAINT IF EXISTS admin_ad_leads_platform_check;
ALTER TABLE admin_ad_leads ADD CONSTRAINT admin_ad_leads_platform_check
  CHECK (platform IN ('telegram', 'instagram', 'youtube', 'vk', 'tiktok', 'blog', 'other'));
ALTER TABLE admin_ad_leads DROP CONSTRAINT IF EXISTS admin_ad_leads_priority_check;
ALTER TABLE admin_ad_leads ADD CONSTRAINT admin_ad_leads_priority_check
  CHECK (priority IN ('low', 'normal', 'high'));
ALTER TABLE admin_withdrawals ADD COLUMN IF NOT EXISTS ad_lead_id UUID REFERENCES admin_ad_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_admin_ad_leads_status ON admin_ad_leads(status);
CREATE INDEX IF NOT EXISTS idx_admin_ad_leads_created ON admin_ad_leads(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_task_comments_task ON admin_task_comments(task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS admin_task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES admin_files(id) ON DELETE CASCADE,
  attached_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, file_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_task_attachments_task ON admin_task_attachments(task_id);
SQL

echo "==> Migrations OK"
