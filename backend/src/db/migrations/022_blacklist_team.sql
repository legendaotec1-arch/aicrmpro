-- Чёрный список может быть привязан к конкретному мастеру салона
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS salon_master_id UUID REFERENCES salon_masters(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_blacklist_salon_master ON blacklist (salon_master_id);
