-- До трёх отдельных заметок мастера о клиенте
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_1 TEXT;
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_2 TEXT;
ALTER TABLE salon_client_profiles ADD COLUMN IF NOT EXISTS note_3 TEXT;

UPDATE salon_client_profiles
SET note_1 = notes
WHERE notes IS NOT NULL AND TRIM(notes) != '' AND (note_1 IS NULL OR TRIM(note_1) = '');
