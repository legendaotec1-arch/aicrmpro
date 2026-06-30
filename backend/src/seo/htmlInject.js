const fs = require('fs');

/** Дефолтные JSON-LD из index.html — только для главной без SSR-инъекции */
const DEFAULT_JSON_LD_TYPES = ['WebSite', 'Organization', 'LocalBusiness', 'FAQPage'];

function removeDefaultJsonLd(html) {
  return html.replace(
    /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    (match) => {
      const isDefault = DEFAULT_JSON_LD_TYPES.some((type) => (
        match.includes(`"@type": "${type}"`)
        || match.includes(`"@type":"${type}"`)
        || match.includes(`"@type": "${type}",`)
      ));
      return isDefault ? '' : match;
    }
  );
}

function injectSeoIntoHtml(html, { title, description, canonical, robots, jsonLdBlocks, ogImage, ssr }) {
  let out = removeDefaultJsonLd(html);

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

  if (ssr?.html) {
    // SSR fallback для поисковиков: реальный H1, intro, sections и FAQ рендерятся
    // прямо в #root до того, как React успеет гидратироваться.
    // React при гидратации заменит содержимое — но для ботов этого достаточно.
    out = out.replace(
      /(<div\s+id=["']root["'][^>]*>)([\s\S]*?)(<\/div>\s*(?:<!--\s*react-mount-point\s*-->)?)/i,
      (match, open, _inner, close) => `${open}\n${ssr.html}\n${close}`
    );
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

module.exports = { injectSeoIntoHtml, readIndexHtml, removeDefaultJsonLd };
