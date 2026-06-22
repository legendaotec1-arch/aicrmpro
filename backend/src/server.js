const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { uploadsDir, frontendDist } = require('./config/paths');

// Load environment variables
dotenv.config();

const { assertSecurityEnv } = require('./utils/jwtConfig');
if (process.env.NODE_ENV === 'production') {
  assertSecurityEnv();
}

const { createCorsOriginChecker } = require('./utils/corsOrigins');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-delete past schedule exceptions on startup
async function cleanupPastScheduleExceptionsOnStartup() {
  try {
    const db = require('./config/database');
    const { cleanupPastScheduleExceptions } = require('./utils/scheduleExceptions');
    const removed = await cleanupPastScheduleExceptions(db);
    if (removed > 0) {
      console.log(`[cleanup] Removed ${removed} past schedule exception(s)`);
    }
  } catch (err) {
    console.error('[cleanup] Failed to delete past schedule exceptions:', err.message);
  }
}

// Middleware
app.use(cors({
  origin: createCorsOriginChecker(),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads; missing files → 404 (не index.html SPA)
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', (_req, res) => {
  res.status(404).json({ error: 'File not found' });
});

// Serve static files from frontend build
app.use(express.static(frontendDist));

// Import routes
const authRoutes = require('./routes/auth');
const masterRoutes = require('./routes/master');
const clientRoutes = require('./routes/client');
const appointmentRoutes = require('./routes/appointment');
const billingRoutes = require('./routes/billing');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Публичные настройки для фронтенда (ключ карт — ограничьте по HTTP Referer в кабинете Яндекса)
app.get('/api/config/public', (req, res) => {
  const billingEnabled = (process.env.BILLING_ENABLED || '').trim().toLowerCase();
  res.json({
    yandexMapsApiKey: (process.env.YANDEX_MAPS_API_KEY || '').trim(),
    yandexMapsConfigured: Boolean((process.env.YANDEX_MAPS_API_KEY || '').trim()),
    billingEnabled: billingEnabled === 'true' || billingEnabled === '1' || billingEnabled === 'yes'
  });
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Start server
function assertFrontendDist() {
  const indexHtml = path.join(frontendDist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `[frontend] Нет сборки: ${indexHtml}\n` +
      '  cd frontend && npm run build\n' +
      '  или: /opt/aicrmpro/deploy/sync-live.sh'
    );
    process.exit(1);
  }
  const assetsDir = path.join(frontendDist, 'assets');
  if (fs.existsSync(assetsDir)) {
    const bundles = fs.readdirSync(assetsDir).filter((f) => /^index-.*\.(js|css)$/.test(f));
    if (bundles.length) {
      console.log(`[frontend] ${frontendDist} → ${bundles.join(', ')}`);
    }
  }
}

assertFrontendDist();

app.listen(PORT, async () => {
  await cleanupPastScheduleExceptionsOnStartup();
  console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;