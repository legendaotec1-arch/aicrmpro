-- SEO Intelligence: кластеры ключевых слов и рекомендации по контенту

CREATE TABLE IF NOT EXISTS seo_keyword_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_key VARCHAR(200) NOT NULL UNIQUE,
  label VARCHAR(500) NOT NULL,
  intent VARCHAR(40) NOT NULL,
  niche VARCHAR(120),
  keywords JSONB NOT NULL DEFAULT '[]',
  keyword_count INT NOT NULL DEFAULT 0,
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks INT NOT NULL DEFAULT 0,
  avg_position NUMERIC(8, 3),
  mapped_slug VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'unmapped',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seo_kw_clusters_intent ON seo_keyword_clusters(intent);
CREATE INDEX IF NOT EXISTS idx_seo_kw_clusters_status ON seo_keyword_clusters(status);
CREATE INDEX IF NOT EXISTS idx_seo_kw_clusters_impressions ON seo_keyword_clusters(total_impressions DESC);

CREATE TABLE IF NOT EXISTS seo_content_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL,
  path VARCHAR(300) NOT NULL,
  page_type VARCHAR(40),
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  avg_position NUMERIC(8, 3),
  issue_type VARCHAR(60) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  recommendation TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slug, issue_type)
);

CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_slug ON seo_content_gaps(slug);
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_severity ON seo_content_gaps(severity);
