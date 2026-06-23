-- Внешние ссылки: площадки, каталоги, партнёры, синдикация

CREATE TABLE IF NOT EXISTS seo_external_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_key VARCHAR(120) NOT NULL UNIQUE,
  platform VARCHAR(40) NOT NULL,
  link_type VARCHAR(30) NOT NULL DEFAULT 'profile',
  title VARCHAR(500) NOT NULL,
  target_path VARCHAR(500) NOT NULL DEFAULT '/',
  anchor_text VARCHAR(500),
  external_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  priority INT NOT NULL DEFAULT 5,
  dofollow BOOLEAN NOT NULL DEFAULT TRUE,
  instructions TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  article_slug VARCHAR(255),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seo_ext_links_platform ON seo_external_links(platform);
CREATE INDEX IF NOT EXISTS idx_seo_ext_links_status ON seo_external_links(status);
CREATE INDEX IF NOT EXISTS idx_seo_ext_links_priority ON seo_external_links(priority DESC);
