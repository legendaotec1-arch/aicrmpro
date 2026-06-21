ALTER TABLE masters ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Moscow';
UPDATE masters SET timezone = 'Europe/Moscow' WHERE timezone IS NULL OR TRIM(timezone) = '';
