CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Мастера
CREATE TABLE masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    salon_name VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    phone VARCHAR(50),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    yandex_maps_link TEXT,
    client_theme VARCHAR(50) DEFAULT 'warm-sand',
    social_telegram TEXT,
    social_instagram TEXT,
    social_vk TEXT,
    social_website TEXT,
    social_max TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Портфолио
CREATE TABLE portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    image_url TEXT,
    media_type VARCHAR(20) DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'external_video')),
    video_url TEXT,
    thumbnail_url TEXT,
    title VARCHAR(255),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Прайс-лист
CREATE TABLE price_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    price_max DECIMAL(10, 2),
    price_type VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'from', 'to', 'range')),
    duration_minutes INT NOT NULL DEFAULT 60,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Рабочие дни/часы
CREATE TABLE work_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_day_off BOOLEAN DEFAULT FALSE,
    UNIQUE(master_id, day_of_week)
);

-- Исключения (выходные/особые дни)
CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_working BOOLEAN NOT NULL,
    start_time TIME,
    end_time TIME,
    UNIQUE(master_id, exception_date)
);

-- Клиенты (единая база: MAX или Telegram)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_user_id VARCHAR(255),
    telegram_user_id VARCHAR(255),
    messenger VARCHAR(20) DEFAULT 'max' CHECK (messenger IN ('max', 'telegram')),
    name VARCHAR(255),
    phone VARCHAR(50),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_clients_max_user_id ON clients(max_user_id) WHERE max_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_clients_telegram_user_id ON clients(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_clients_messenger ON clients(messenger);

CREATE TABLE salon_client_profiles (
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    patronymic VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    deleted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (salon_id, client_id)
);

-- Записи
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    service_price DECIMAL(10, 2),
    appointment_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    client_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Уведомления
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('reminder_24h', 'reminder_3h', 'custom')),
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_appointments_master_time ON appointments(master_id, appointment_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_notifications_pending ON notifications(status, type);
CREATE INDEX idx_schedule_exceptions_date ON schedule_exceptions(master_id, exception_date);

-- Мастера салона (исполнители)
CREATE TABLE salon_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    photo_url TEXT,
    description TEXT,
    slot_step_minutes INT NOT NULL DEFAULT 60 CHECK (slot_step_minutes >= 15 AND slot_step_minutes <= 480),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salon_masters_salon ON salon_masters(salon_id);

ALTER TABLE portfolio ADD COLUMN salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE price_items ADD COLUMN salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE work_schedule ADD COLUMN salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE schedule_exceptions ADD COLUMN salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN salon_master_id UUID REFERENCES salon_masters(id) ON DELETE SET NULL;

ALTER TABLE masters ADD COLUMN notify_telegram_user_id VARCHAR(255);
ALTER TABLE masters ADD COLUMN notify_max_user_id VARCHAR(255);
ALTER TABLE masters ADD COLUMN chat_notify_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE masters ADD COLUMN review_notify_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE masters ADD COLUMN repeat_invite_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE masters ADD COLUMN repeat_invite_days INT DEFAULT 30;
ALTER TABLE masters ADD COLUMN repeat_invite_message TEXT;

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    salon_master_id UUID REFERENCES salon_masters(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body TEXT,
    client_name VARCHAR(255),
    is_published BOOLEAN DEFAULT FALSE,
    salon_reply TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(salon_id, client_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'salon')),
    body TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для masters
CREATE TRIGGER update_masters_updated_at
    BEFORE UPDATE ON masters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();