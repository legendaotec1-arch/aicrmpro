-- Тема оформления публичной страницы записи
ALTER TABLE masters ADD COLUMN IF NOT EXISTS client_theme VARCHAR(50) DEFAULT 'warm-sand';

UPDATE masters SET client_theme = 'warm-sand' WHERE client_theme IS NULL OR client_theme = '';
