CREATE TABLE IF NOT EXISTS admin_task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_task_comments_task ON admin_task_comments(task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS admin_task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES admin_files(id) ON DELETE CASCADE,
  attached_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, file_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_task_attachments_task ON admin_task_attachments(task_id);
