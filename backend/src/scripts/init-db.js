const { Pool } = require('pg');

const pool = new Pool({
  host: 'ruthohegrilee.beget.app',
  port: 5432,
  database: 'aicrmpro',
  user: 'cloud_user',
  password: 'LegendOtec!2026',
});

async function initializeDatabase() {
  try {
    console.log('Подключение к PostgreSQL на Beget...');

    // Создаем таблицы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS masters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        salon_name VARCHAR(255),
        logo_url TEXT,
        description TEXT,
        phone VARCHAR(50),
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        yandex_maps_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS portfolio (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        title VARCHAR(255),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        image_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS work_schedule (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_day_off BOOLEAN DEFAULT FALSE,
        UNIQUE(master_id, day_of_week)
      );

      CREATE TABLE IF NOT EXISTS schedule_exceptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        exception_date DATE NOT NULL,
        is_working BOOLEAN NOT NULL,
        start_time TIME,
        end_time TIME,
        UNIQUE(master_id, exception_date)
      );

      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        max_user_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        service_name VARCHAR(255) NOT NULL,
        service_price DECIMAL(10, 2),
        appointment_time TIMESTAMP NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        status VARCHAR(50) DEFAULT 'confirmed',
        client_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_master_time ON appointments(master_id, appointment_time);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(status, type);
    `);

    console.log('✅ Таблицы успешно созданы!');
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();