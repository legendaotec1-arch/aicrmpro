-- Отзывы
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    salon_master_id UUID REFERENCES salon_masters(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body TEXT,
    client_name VARCHAR(255),
    is_published BOOLEAN DEFAULT TRUE,
    salon_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_salon ON reviews(salon_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_appointment ON reviews(appointment_id) WHERE appointment_id IS NOT NULL;

-- Настройки приглашений на повторный визит
ALTER TABLE masters ADD COLUMN IF NOT EXISTS repeat_invite_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS repeat_invite_days INT DEFAULT 30;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS repeat_invite_message TEXT;

-- Тип уведомления: приглашение на повтор
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reminder_24h', 'reminder_3h', 'repeat_invite', 'custom'));
