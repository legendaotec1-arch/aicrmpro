-- Видеовизитка мастера (вертикальное видео 9:16 для страницы записи)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS video_reel_url TEXT;
