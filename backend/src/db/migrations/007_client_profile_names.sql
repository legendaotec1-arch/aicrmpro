-- ФИО и телефон в карточке клиента (на уровне салона)
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS patronymic VARCHAR(255);
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
