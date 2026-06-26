const QUIET_EXACT = new Set(['/api/health']);

function shouldLogRequest(req) {
  const path = req.originalUrl.split('?')[0];
  if (QUIET_EXACT.has(path)) return false;
  return true;
}

function requestLogMiddleware(req, res, next) {
  if (!shouldLogRequest(req)) return next();

  const start = Date.now();
  const path = req.originalUrl;
  const ip = req.ip;
  const method = req.method;

  console.log(`[http-in] ${method} ${path} from ${ip}`);

  req.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.error(`[http-reset] ${method} ${path} from ${ip}: ECONNRESET`);
    }
  });

  res.on('close', () => {
    if (res.writableEnded) return;
    const duration = Date.now() - start;
    console.error(`[http-abort] ${method} ${path} from ${ip} (${duration}ms, no response)`);
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 500) {
      console.error(`[http-out] ${method} ${path} → ${res.statusCode} (${duration}ms)`);
    } else if (duration > 5000) {
      console.warn(`[http-slow] ${method} ${path} → ${res.statusCode} (${duration}ms)`);
    } else {
      console.log(`[http-out] ${method} ${path} → ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
}

module.exports = { requestLogMiddleware };
