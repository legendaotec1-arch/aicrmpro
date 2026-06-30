-- Источник контента статьи: template | ai
ALTER TABLE seo_articles
  ADD COLUMN IF NOT EXISTS content_source VARCHAR(20) NOT NULL DEFAULT 'template';

ALTER TABLE seo_articles
  ADD COLUMN IF NOT EXISTS ai_model VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_seo_articles_content_source
  ON seo_articles(content_source);
