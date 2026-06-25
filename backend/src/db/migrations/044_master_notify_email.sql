-- Email для уведомлений о балансе и оплате (если не указан — используется email входа)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS notify_email VARCHAR(255);
