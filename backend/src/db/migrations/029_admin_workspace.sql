-- Админка: задачи, облако, списания
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'todo',
  assignee_email VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_status_check;
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'review', 'done'));
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_priority_check
  CHECK (priority IN ('low', 'normal', 'high'));

CREATE TABLE IF NOT EXISTS admin_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES admin_folders(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_folders_parent ON admin_folders(parent_id);

CREATE TABLE IF NOT EXISTS admin_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES admin_folders(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_files_folder ON admin_files(folder_id);

CREATE TABLE IF NOT EXISTS admin_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_created ON admin_withdrawals(created_at DESC);
