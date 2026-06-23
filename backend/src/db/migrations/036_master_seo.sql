-- Публичные SEO-страницы мастеров: /m/anna-nails-chelyabinsk
ALTER TABLE masters ADD COLUMN IF NOT EXISTS public_slug VARCHAR(120);
ALTER TABLE masters ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE masters ADD COLUMN IF NOT EXISTS public_indexable BOOLEAN DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS masters_public_slug_key
  ON masters (public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS masters_public_indexable_idx
  ON masters (public_indexable)
  WHERE public_indexable = TRUE AND public_slug IS NOT NULL;
