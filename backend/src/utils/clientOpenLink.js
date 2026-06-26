const crypto = require('crypto');
const db = require('../config/database');
const { getPublicUrl } = require('./links');

const TTL_SEC = 7 * 24 * 3600;

function generateCode() {
  return crypto.randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

async function createClientOpenLink({ masterId, channel, userId }) {
  const exp = new Date(Date.now() + TTL_SEC * 1000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      await db.query(
        `INSERT INTO client_open_links (code, master_id, channel, user_id, exp)
         VALUES ($1, $2, $3, $4, $5)`,
        [code, masterId, channel, String(userId), exp]
      );
      return { code, url: `${getPublicUrl()}/o/${code}`, exp };
    } catch (err) {
      if (err.code !== '23505') throw err;
    }
  }
  throw new Error('Failed to generate unique open link code');
}

async function getClientOpenLink(code) {
  const res = await db.query(
    `SELECT col.*, m.public_slug
     FROM client_open_links col
     JOIN masters m ON m.id = col.master_id
     WHERE col.code = $1`,
    [code]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (new Date(row.exp).getTime() < Date.now()) return null;
  return row;
}

async function purgeExpiredOpenLinks() {
  await db.query('DELETE FROM client_open_links WHERE exp < NOW()');
}

function buildOpenBootstrapHtml({ slug, code, channel }) {
  const publicUrl = getPublicUrl().replace(/\/$/, '');
  const target = `${publicUrl}/m/${slug}?tab=booking&a=${encodeURIComponent(code)}`;
  const channelLabel = channel === 'max' ? 'MAX' : 'Telegram';

  return `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta http-equiv="Cache-Control" content="no-store"/>
<title>Запись — Woner.ru</title>
<style>
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f8fafc 0%,#ede9fe 100%);color:#334155;padding:24px}
.card{max-width:400px;width:100%;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 8px 32px rgba(106,90,205,.12)}
.logo{font-size:22px;font-weight:800;color:#6A5ACD;margin:0 0 8px}
p{margin:0 0 16px;font-size:15px;line-height:1.5;color:#64748b}
.btn{display:block;width:100%;padding:16px 20px;border:0;border-radius:14px;background:#6A5ACD;color:#fff;font-size:17px;font-weight:700;cursor:pointer;margin:8px 0 20px}
.btn:active{opacity:.9}
.hint{font-size:13px;color:#94a3b8;margin-bottom:12px}
.link{display:block;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;color:#475569;background:#f8fafc;word-break:break-all}
</style>
</head><body>
<div class="card">
  <p class="logo">Woner.ru</p>
  <p><b>Важно:</b> в Telegram и MAX нажмите иконку <b>компаса</b> внизу справа → «Открыть в Safari».</p>
  <p>Или скопируйте ссылку ниже и вставьте в Safari/Chrome.</p>
  <button type="button" class="btn" id="open-btn">Открыть запись</button>
  <p class="hint">Скопируйте и вставьте в Safari или Chrome:</p>
  <input class="link" id="link-field" readonly value="${target.replace(/"/g, '&quot;')}" onclick="this.select();try{navigator.clipboard.writeText(this.value)}catch(e){}"/>
</div>
<script>
(function () {
  var target = ${JSON.stringify(target)};
  var ua = navigator.userAgent || '';
  var isMessenger = /Telegram/i.test(ua) || (/max/i.test(ua) && !/Telegram/i.test(ua));

  function openExternal() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg && typeof tg.openLink === 'function') {
        tg.openLink(target);
        return;
      }
    } catch (e) { /* ignore */ }
    location.href = target;
  }

  document.getElementById('open-btn').addEventListener('click', openExternal);

  if (/Telegram/i.test(ua)) {
    var s = document.createElement('script');
    s.async = true;
    s.src = '/telegram-web-app.js';
    s.onerror = function () { /* ignore */ };
    s.onload = function () {
      try {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg) { tg.ready(); tg.expand(); }
      } catch (e) { /* ignore */ }
    };
    document.head.appendChild(s);
  }

  if (!isMessenger) {
    location.replace(target);
    return;
  }

  setTimeout(function () {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg && typeof tg.openLink === 'function') {
        tg.openLink(target);
        return;
      }
    } catch (e) { /* ignore */ }
    location.replace(target);
  }, 500);
})();
</script>
</body></html>`;
}

async function exchangeOpenCode(code) {
  const row = await getClientOpenLink(code);
  if (!row) return null;

  const { signClientToken } = require('./clientAuth');
  const { findOrCreateClient, ensureSalonClientProfile } = require('./clients');

  const salonId = row.master_id;
  const messenger = row.channel;
  const userId = String(row.user_id);

  const clientId = await findOrCreateClient({
    channel: messenger,
    maxUserId: messenger === 'max' ? userId : null,
    telegramUserId: messenger === 'telegram' ? userId : null,
    salonId,
  });
  await ensureSalonClientProfile(salonId, clientId);

  return {
    channel: messenger,
    userId,
    salonId,
    slug: row.public_slug,
    clientToken: signClientToken({ channel: messenger, userId, masterId: salonId }),
  };
}

module.exports = {
  createClientOpenLink,
  getClientOpenLink,
  purgeExpiredOpenLinks,
  buildOpenBootstrapHtml,
  exchangeOpenCode,
};
