-- Мягкое удаление клиента из базы конкретного салона
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_salon_client_profiles_visible
  ON salon_client_profiles(salon_id, deleted_at);
