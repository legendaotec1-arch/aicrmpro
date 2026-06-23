const { SITE_URL, NOINDEX_PREFIXES, NOINDEX_EXACT } = require('./config');

function buildRobotsTxt() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...Array.from(NOINDEX_EXACT).map((p) => `Disallow: ${p}`),
    ...NOINDEX_PREFIXES.map((p) => `Disallow: ${p}`),
    'Disallow: /register',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL.replace('https://', '')}`,
  ];
  return `${lines.join('\n')}\n`;
}

module.exports = { buildRobotsTxt };
