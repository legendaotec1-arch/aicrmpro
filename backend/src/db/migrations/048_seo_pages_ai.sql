-- Adds AI-tracking columns to seo_pages so we can run AI enrichment
-- of programmatic/geo pages (separate from blog article enrichment).
ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS content_source VARCHAR(20) NOT NULL DEFAULT 'template';

ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS ai_model VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_seo_pages_content_source
  ON seo_pages(content_source);
