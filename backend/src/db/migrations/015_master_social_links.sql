-- Ссылки на соцсети мастера (отображаются на странице записи)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_telegram TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_vk TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_website TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_max TEXT;
