-- Ежедневные агрегаты поисковой аналитики (Яндекс / Google)
CREATE TABLE IF NOT EXISTS seo_metrics_daily (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  source VARCHAR(16) NOT NULL CHECK (source IN ('yandex', 'google', 'combined')),
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  ctr NUMERIC(8, 5),
  avg_position NUMERIC(8, 3),
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (metric_date, source)
);

CREATE INDEX IF NOT EXISTS idx_seo_metrics_daily_date ON seo_metrics_daily (metric_date DESC);

CREATE TABLE IF NOT EXISTS seo_query_stats (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  source VARCHAR(16) NOT NULL CHECK (source IN ('yandex', 'google')),
  query TEXT NOT NULL,
  page_url TEXT,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  ctr NUMERIC(8, 5),
  position NUMERIC(8, 3),
  synced_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_query_stats_lookup
  ON seo_query_stats (metric_date DESC, source, clicks DESC);
