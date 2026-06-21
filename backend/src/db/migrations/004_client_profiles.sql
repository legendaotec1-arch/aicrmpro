-- Заметки салона по клиенту (один логин — один салон)
CREATE TABLE IF NOT EXISTS salon_client_profiles (
    salon_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (salon_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_salon_client_profiles_client ON salon_client_profiles(client_id);
