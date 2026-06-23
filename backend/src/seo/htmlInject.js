const fs = require('fs');

function injectSeoIntoHtml(html, { title, description, canonical, robots, jsonLdBlocks, ogImage }) {
  let out = html;

  const safeTitle = escapeHtml(title || 'Woner.ru');
  const safeDesc = escapeHtml(description || '');
  const safeCanonical = canonical || 'https://woner.ru/';
  const safeRobots = robots || 'index, follow';
  const og = ogImage || 'https://woner.ru/images/og-image.jpg';

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
  out = replaceOrInsertMeta(out, 'name', 'description', safeDesc);
  out = replaceOrInsertMeta(out, 'name', 'robots', safeRobots);
  out = replaceOrInsertLink(out, 'canonical', safeCanonical);

  out = replaceOrInsertMeta(out, 'property', 'og:title', safeTitle);
  out = replaceOrInsertMeta(out, 'property', 'og:description', safeDesc);
  out = replaceOrInsertMeta(out, 'property', 'og:url', safeCanonical);
  out = replaceOrInsertMeta(out, 'property', 'og:image', og);

  out = replaceOrInsertMeta(out, 'name', 'twitter:title', safeTitle);
  out = replaceOrInsertMeta(out, 'name', 'twitter:description', safeDesc);
  out = replaceOrInsertMeta(out, 'name', 'twitter:image', og);

  if (jsonLdBlocks?.length) {
    const scripts = jsonLdBlocks
      .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block)}\n</script>`)
      .join('\n    ');
    out = out.replace('</head>', `    ${scripts}\n  </head>`);
  }

  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceOrInsertMeta(html, attr, key, content) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function replaceOrInsertLink(html, rel, href) {
  const re = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i');
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function readIndexHtml(indexPath) {
  return fs.readFileSync(indexPath, 'utf8');
}

module.exports = { injectSeoIntoHtml, readIndexHtml };
