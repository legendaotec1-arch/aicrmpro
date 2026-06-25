CREATE TABLE IF NOT EXISTS client_open_links (
  code TEXT PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  user_id TEXT NOT NULL,
  exp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_open_links_exp_idx ON client_open_links (exp);
