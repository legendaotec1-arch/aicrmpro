const SOCIAL_FIELDS = [
  { key: 'social_telegram', id: 'telegram', name: 'Telegram' },
  { key: 'social_instagram', id: 'instagram', name: 'Instagram' },
  { key: 'social_vk', id: 'vk', name: 'ВКонтакте' },
  { key: 'social_website', id: 'website', name: 'Сайт' },
  { key: 'social_max', id: 'max', name: 'MAX' }
];

function stripUrlTrash(s) {
  return String(s || '').trim().replace(/\s+/g, '');
}

function ensureHttps(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function normalizeSocialInput(type, raw) {
  const v = stripUrlTrash(raw);
  if (!v) return null;

  switch (type) {
    case 'telegram': {
      if (/^https?:\/\//i.test(v)) return v;
      const handle = v.replace(/^@/, '').replace(/^t\.me\//i, '').replace(/^telegram\.me\//i, '');
      return `https://t.me/${handle}`;
    }
    case 'instagram': {
      if (/^https?:\/\//i.test(v)) return v;
      const handle = v
        .replace(/^@/, '')
        .replace(/^(www\.)?instagram\.com\//i, '')
        .replace(/\/$/, '');
      return `https://instagram.com/${handle}`;
    }
    case 'vk': {
      if (/^https?:\/\//i.test(v)) return v;
      let path = v.replace(/^@/, '').replace(/^(www\.)?vk\.com\//i, '').replace(/^vk\.com\//i, '');
      if (!path.startsWith('id') && !path.includes('/')) {
        path = path;
      }
      return `https://vk.com/${path}`;
    }
    case 'max': {
      if (/^https?:\/\//i.test(v)) return v;
      const path = v.replace(/^@/, '').replace(/^(www\.)?max\.ru\//i, '');
      return `https://max.ru/${path}`;
    }
    case 'website':
      return ensureHttps(v);
    default:
      return ensureHttps(v);
  }
}

function buildSocialLinksFromRow(row) {
  if (!row) return [];
  const links = [];
  for (const field of SOCIAL_FIELDS) {
    const stored = row[field.key];
    const url = normalizeSocialInput(field.id, stored);
    if (url) {
      links.push({ id: field.id, name: field.name, url });
    }
  }
  return links;
}

function pickSocialPayload(body) {
  const out = {};
  for (const field of SOCIAL_FIELDS) {
    if (body[field.key] !== undefined) {
      out[field.key] = normalizeSocialInput(field.id, body[field.key]);
    }
  }
  return out;
}

module.exports = {
  SOCIAL_FIELDS,
  normalizeSocialInput,
  buildSocialLinksFromRow,
  pickSocialPayload
};
