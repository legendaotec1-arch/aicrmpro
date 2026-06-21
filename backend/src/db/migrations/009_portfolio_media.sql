-- Медиа для главной страницы клиента: фото, загруженные видео и внешние видео
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image';
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

UPDATE portfolio SET media_type = 'image' WHERE media_type IS NULL;

ALTER TABLE portfolio ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE portfolio DROP CONSTRAINT IF EXISTS portfolio_media_type_check;
ALTER TABLE portfolio ADD CONSTRAINT portfolio_media_type_check
  CHECK (media_type IN ('image', 'video', 'external_video'));
