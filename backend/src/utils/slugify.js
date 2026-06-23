const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

function transliterate(str) {
  return String(str || '')
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (CYRILLIC[lower] != null) {
        const mapped = CYRILLIC[lower];
        return ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return ch;
    })
    .join('');
}

function slugify(...parts) {
  const raw = parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ');
  if (!raw) return '';
  return transliterate(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Извлекает город из адреса (г. Москва, Челябинск, ул. ...) */
function extractCityFromAddress(address) {
  if (!address) return null;
  const parts = String(address)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const cleaned = part.replace(/^г\.?\s*/i, '').trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 40) continue;
    if (/\d/.test(cleaned)) continue;
    if (/^(ул|пр|пер|б-р|ш|наб|пл|мкр|р-н|обл|край|респ)/i.test(cleaned)) continue;
    return cleaned;
  }
  const first = parts[0]?.replace(/^г\.?\s*/i, '').trim();
  return first && first.length >= 3 && first.length <= 40 ? first : null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPublicSlug(param) {
  return Boolean(param && SLUG_RE.test(param) && param.length >= 3);
}

module.exports = {
  transliterate,
  slugify,
  extractCityFromAddress,
  isPublicSlug,
};
