const ALLOWED_DSN = (process.env.VITE_SENTRY_DSN || process.env.SENTRY_TUNNEL_DSN || '').trim();

function isAllowedDsn(dsn) {
  if (!ALLOWED_DSN || !dsn) return false;
  try {
    const incoming = new URL(dsn);
    const allowed = new URL(ALLOWED_DSN);
    return incoming.host === allowed.host && incoming.pathname === allowed.pathname;
  } catch {
    return false;
  }
}

function readRawBody(req, res, next) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    req.body = Buffer.concat(chunks);
    next();
  });
  req.on('error', next);
}

async function sentryTunnelHandler(req, res) {
  try {
    const body = req.body;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).end();
    }

    const headerLine = body.toString('utf8', 0, Math.min(body.length, 4096)).split('\n')[0];
    const envelopeHeader = JSON.parse(headerLine);
    const dsn = envelopeHeader.dsn;
    if (!isAllowedDsn(dsn)) {
      return res.status(403).end();
    }

    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, '');
    const url = `https://${parsed.host}/api/${projectId}/envelope/`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
    });

    res.status(upstream.status).end();
  } catch (err) {
    console.error('[sentry-tunnel]', err.message);
    res.status(500).end();
  }
}

module.exports = { sentryTunnelHandler, readRawBody };
