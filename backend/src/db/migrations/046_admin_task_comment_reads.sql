-- Прочитанные комментарии в задачах (по админу)
CREATE TABLE IF NOT EXISTS admin_task_read_state (
  task_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  admin_email VARCHAR(255) NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, admin_email)
);

CREATE INDEX IF NOT EXISTS idx_admin_task_read_admin ON admin_task_read_state(admin_email);
