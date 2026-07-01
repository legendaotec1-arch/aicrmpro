-- Расширение таблицы внешних площадок для автоматического линкбилдинга.
-- Добавляем поля: тип автосабмита (api/form/manual), URL API, формат payload,
-- шаблон поста, целевая аудитория и метрики успешного размещения.

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS auto_submit VARCHAR(30) NOT NULL DEFAULT 'manual';
-- manual | api | form | rss | directory

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS api_endpoint TEXT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS payload_template TEXT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS content_template TEXT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS submission_url TEXT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS audience_size INT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS domain_rating INT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS tags VARCHAR(255)[];

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS last_attempt_status VARCHAR(50);

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS last_attempt_message TEXT;

ALTER TABLE seo_external_links
  ADD COLUMN IF NOT EXISTS live_post_url TEXT;

CREATE INDEX IF NOT EXISTS idx_seo_ext_links_auto
  ON seo_external_links(auto_submit);

CREATE INDEX IF NOT EXISTS idx_seo_ext_links_dr
  ON seo_external_links(domain_rating DESC NULLS LAST);