-- Уведомления владельцу в мессенджер
ALTER TABLE masters ADD COLUMN IF NOT EXISTS notify_telegram_user_id VARCHAR(255);
ALTER TABLE masters ADD COLUMN IF NOT EXISTS notify_max_user_id VARCHAR(255);
ALTER TABLE masters ADD COLUMN IF NOT EXISTS chat_notify_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS review_notify_enabled BOOLEAN DEFAULT TRUE;

-- Отзывы по умолчанию на модерации
ALTER TABLE reviews ALTER COLUMN is_published SET DEFAULT FALSE;
