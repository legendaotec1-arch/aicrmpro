-- Уникальность исключений по мастеру салона (для upsert)
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_exceptions_team
  ON schedule_exceptions (salon_master_id, exception_date);
