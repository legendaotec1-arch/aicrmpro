-- Ожидание подтверждения записи через Telegram, MAX или Email
CREATE TABLE IF NOT EXISTS booking_confirm_pending (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) NOT NULL UNIQUE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'max', 'email')),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    salon_master_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    appointment_time TIMESTAMP NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    service_price DECIMAL(10, 2),
    duration_minutes INT NOT NULL DEFAULT 60,
    client_notes TEXT,
    master_name VARCHAR(255),
    code_hash VARCHAR(128),
    messenger_user_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_confirm_pending_token ON booking_confirm_pending(token);
CREATE INDEX IF NOT EXISTS idx_booking_confirm_pending_status
    ON booking_confirm_pending(status) WHERE status = 'pending';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON clients (LOWER(email)) WHERE email IS NOT NULL AND email <> '';
