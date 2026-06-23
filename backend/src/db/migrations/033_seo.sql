-- SEO: programmatic pages, blog, internal links, audit
CREATE TABLE IF NOT EXISTS seo_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  page_type VARCHAR(40) NOT NULL DEFAULT 'programmatic',
  cluster VARCHAR(40) NOT NULL,
  niche VARCHAR(120),
  title VARCHAR(255) NOT NULL,
  meta_description TEXT NOT NULL,
  h1 VARCHAR(500) NOT NULL,
  intro TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  faq JSONB NOT NULL DEFAULT '[]',
  related_slugs TEXT[] NOT NULL DEFAULT '{}',
  priority DECIMAL(4, 3) NOT NULL DEFAULT 0.5,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seo_pages_cluster ON seo_pages(cluster);
CREATE INDEX IF NOT EXISTS idx_seo_pages_type ON seo_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_seo_pages_published ON seo_pages(published) WHERE published = TRUE;

CREATE TABLE IF NOT EXISTS seo_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  meta_description TEXT NOT NULL,
  h1 VARCHAR(500) NOT NULL,
  intro TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  faq JSONB NOT NULL DEFAULT '[]',
  toc JSONB NOT NULL DEFAULT '[]',
  related_slugs TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seo_articles_category ON seo_articles(category);
CREATE INDEX IF NOT EXISTS idx_seo_articles_published ON seo_articles(published_at DESC) WHERE published = TRUE;

CREATE TABLE IF NOT EXISTS seo_internal_links (
  from_slug VARCHAR(255) NOT NULL,
  to_slug VARCHAR(255) NOT NULL,
  anchor TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 1,
  PRIMARY KEY (from_slug, to_slug)
);
CREATE INDEX IF NOT EXISTS idx_seo_links_to ON seo_internal_links(to_slug);

CREATE TABLE IF NOT EXISTS seo_audit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issues JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_seo_audit_run ON seo_audit_reports(run_at DESC);
