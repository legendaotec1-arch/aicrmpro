-- Салон (таблица masters) + несколько мастеров-исполнителей (salon_masters)

CREATE TABLE IF NOT EXISTS salon_masters (
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

CREATE INDEX IF NOT EXISTS idx_salon_masters_salon ON salon_masters(salon_id);

-- По одному мастеру на существующий аккаунт-салон
INSERT INTO salon_masters (salon_id, name, specialty, slot_step_minutes, sort_order, is_active)
SELECT m.id, m.name, NULL, 60, 0, TRUE
FROM masters m
WHERE NOT EXISTS (
  SELECT 1 FROM salon_masters sm WHERE sm.salon_id = m.id
);

ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE price_items ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE work_schedule ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE schedule_exceptions ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE SET NULL;

UPDATE portfolio p
SET salon_master_id = sm.id
FROM salon_masters sm
WHERE p.salon_master_id IS NULL AND p.master_id = sm.salon_id AND sm.sort_order = 0;

UPDATE price_items pi
SET salon_master_id = sm.id
FROM salon_masters sm
WHERE pi.salon_master_id IS NULL AND pi.master_id = sm.salon_id AND sm.sort_order = 0;

UPDATE work_schedule ws
SET salon_master_id = sm.id
FROM salon_masters sm
WHERE ws.salon_master_id IS NULL AND ws.master_id = sm.salon_id AND sm.sort_order = 0;

UPDATE schedule_exceptions se
SET salon_master_id = sm.id
FROM salon_masters sm
WHERE se.salon_master_id IS NULL AND se.master_id = sm.salon_id AND sm.sort_order = 0;

UPDATE appointments a
SET salon_master_id = sm.id
FROM salon_masters sm
WHERE a.salon_master_id IS NULL AND a.master_id = sm.salon_id AND sm.sort_order = 0;

-- Заготовка под общий чат салона (этап E)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(salon_id, client_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'salon')),
    body TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_schedule_team
  ON work_schedule (salon_master_id, day_of_week)
  WHERE salon_master_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_exceptions_team
  ON schedule_exceptions (salon_master_id, exception_date)
  WHERE salon_master_id IS NOT NULL;
