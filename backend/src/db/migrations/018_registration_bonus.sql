-- Разовое начисление 60 ₽ существующим мастерам (без повторного начисления)
DO $$
DECLARE
  r RECORD;
  new_balance DECIMAL(12, 2);
  bonus CONSTANT DECIMAL(12, 2) := 60;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'masters' AND column_name = 'balance'
  ) THEN
    RAISE NOTICE 'Column masters.balance not found, skip registration bonus migration';
    RETURN;
  END IF;

  FOR r IN
    SELECT m.id, COALESCE(m.balance, 0) AS balance
    FROM masters m
    WHERE NOT EXISTS (
      SELECT 1 FROM billing_transactions t
      WHERE t.master_id = m.id AND t.type = 'registration_bonus'
    )
  LOOP
    new_balance := r.balance + bonus;
    UPDATE masters SET balance = new_balance, updated_at = NOW() WHERE id = r.id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_transactions') THEN
      INSERT INTO billing_transactions (master_id, type, amount, balance_after, description)
      VALUES (
        r.id,
        'registration_bonus',
        bonus,
        new_balance,
        'Приветственный бонус 60 ₽'
      );
    END IF;
  END LOOP;
END $$;
