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
