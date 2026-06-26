-- Рабочий стол: CRM холодных лидов (админка)

CREATE TABLE IF NOT EXISTS admin_crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_date DATE,
  lead_time VARCHAR(10),
  platform VARCHAR(40),
  contact VARCHAR(255),
  name VARCHAR(255),
  city VARCHAR(120),
  niche VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'Новый',
  script_variant VARCHAR(120),
  message_text TEXT,
  sent_at DATE,
  reply_text TEXT,
  replied_at DATE,
  demo VARCHAR(80),
  demo_at DATE,
  registered VARCHAR(40),
  registered_at DATE,
  bonus_60 VARCHAR(40),
  tariff VARCHAR(80),
  amount_rub VARCHAR(40),
  next_action TEXT,
  next_action_date DATE,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_crm_leads_status ON admin_crm_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_crm_leads_sort ON admin_crm_leads(sort_order, created_at);

CREATE TABLE IF NOT EXISTS admin_crm_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact VARCHAR(255) NOT NULL,
  touch_date DATE,
  touch_number INT,
  message_text TEXT,
  sent VARCHAR(10) NOT NULL DEFAULT '⬜',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_crm_analytics (
  id SERIAL PRIMARY KEY,
  metric_key VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  week_value VARCHAR(80) DEFAULT '',
  month_value VARCHAR(80) DEFAULT '',
  goal_value VARCHAR(80) DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_crm_static (
  sheet_key VARCHAR(40) PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_crm_ref_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_key VARCHAR(40) NOT NULL,
  cols JSONB NOT NULL DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_crm_ref_sheet ON admin_crm_ref_rows(sheet_key, sort_order);
