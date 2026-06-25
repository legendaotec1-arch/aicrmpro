const express = require('express');
const { adminAuthMiddleware } = require('../utils/adminAuth');
const { pushClientLog, getRecentLogs } = require('../utils/clientLogStore');

const router = express.Router();

function normalizeClientPayload(body, req) {
  const event = String(body.event || body.stage || 'unknown').slice(0, 64);
  return {
    event,
    data: body.data && typeof body.data === 'object' ? body.data : undefined,
    url: body.url ? String(body.url).slice(0, 500) : undefined,
    path: body.path ? String(body.path).slice(0, 200) : undefined,
    search: body.search ? String(body.search).slice(0, 200) : undefined,
    ua: (body.userAgent || body.ua) ? String(body.userAgent || body.ua).slice(0, 160) : undefined,
    connection: body.connection && typeof body.connection === 'object' ? body.connection : undefined,
    screen: body.screen && typeof body.screen === 'object' ? body.screen : undefined,
    ios: body.ios != null ? Boolean(body.ios) : undefined,
    online: body.online != null ? Boolean(body.online) : undefined,
    visible: body.visible ? String(body.visible).slice(0, 16) : undefined,
    reason: body.reason ? String(body.reason).slice(0, 64) : undefined,
    message: body.message ? String(body.message).slice(0, 240) : undefined,
    asset: body.asset ? String(body.asset).slice(0, 240) : undefined,
    waitedMs: body.waitedMs != null ? body.waitedMs : undefined,
    clientTime: body.timestamp || body.t || undefined,
    serverTime: new Date().toISOString(),
    ip: req.ip,
  };
}

router.post('/client', (req, res) => {
  const line = normalizeClientPayload(req.body || {}, req);
  pushClientLog(line);
  const tag = line.event.startsWith('BOOT_') ? '[client-boot-fail]' : '[client-log]';
  console.log(tag, JSON.stringify(line));
  res.json({ ok: true });
});

router.post('/dump', (req, res) => {
  const line = normalizeClientPayload({ event: 'state_dump', data: req.body, ...req.body }, req);
  pushClientLog(line);
  console.log('[client-dump]', JSON.stringify(line));
  res.json({ ok: true });
});

router.get('/client', adminAuthMiddleware, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const ip = req.query.ip ? String(req.query.ip) : undefined;
  const event = req.query.event ? String(req.query.event) : undefined;
  res.json({ logs: getRecentLogs(limit, { ip, event }), total: getRecentLogs(1000).length });
});

module.exports = router;
