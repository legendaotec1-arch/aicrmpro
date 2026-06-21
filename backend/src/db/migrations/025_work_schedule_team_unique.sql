-- Салон с несколькими мастерами: расписание уникально по salon_master_id + день,
-- а не по master_id (id аккаунта салона).

ALTER TABLE work_schedule
  DROP CONSTRAINT IF EXISTS work_schedule_master_id_day_of_week_key;

ALTER TABLE schedule_exceptions
  DROP CONSTRAINT IF EXISTS schedule_exceptions_master_id_exception_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_schedule_team
  ON work_schedule (salon_master_id, day_of_week)
  WHERE salon_master_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_exceptions_team
  ON schedule_exceptions (salon_master_id, exception_date)
  WHERE salon_master_id IS NOT NULL;
