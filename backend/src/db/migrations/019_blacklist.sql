-- Blacklist: clients blocked from booking at master/salon level
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  name VARCHAR(255),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_master ON blacklist(master_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_client ON blacklist(client_id);
