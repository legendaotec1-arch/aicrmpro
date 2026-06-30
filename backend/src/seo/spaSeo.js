const path = require('path');
const fs = require('fs');
const repo = require('../seo/repository');
const { injectSeoIntoHtml, readIndexHtml } = require('../seo/htmlInject');
const { buildPageJsonLd, buildArticleJsonLd, buildMasterJsonLd } = require('../seo/jsonld');
const { SITE_URL, NOINDEX_PREFIXES, NOINDEX_EXACT } = require('../seo/config');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSsrBody({ kind, page, article }) {
  // SSR-fallback: отдаём поисковикам весь видимый контент страницы без JS.
  // После гидратации React перезапишет разметку #root — это OK для пользователей.
  if (kind === 'page' && page) {
    const sectionsHtml = (page.sections || [])
      .map((s) => `
        <section>
          <h2>${escapeHtml(s.h2)}</h2>
          <p>${escapeHtml(s.body)}</p>
          ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </section>`)
      .join('');
    const faqHtml = (page.faq || [])
      .map((q, i) => `
        <details ${i === 0 ? 'open' : ''}>
          <summary>${escapeHtml(q.q)}</summary>
          <p>${escapeHtml(q.a)}</p>
        </details>`)
      .join('');
    const relatedHtml = page.related_slugs?.length
      ? `<nav aria-label="Связанные страницы"><ul>${page.related_slugs.map((s) => `<li><a href="/${escapeHtml(s)}">${escapeHtml(s)}</a></li>`).join('')}</ul></nav>`
      : '';
    return `
      <article itemscope itemtype="https://schema.org/Article">
        <h1 itemprop="headline">${escapeHtml(page.h1)}</h1>
        <p itemprop="description">${escapeHtml(page.intro)}</p>
        ${sectionsHtml}
        ${faqHtml ? `<section>${faqHtml}</section>` : ''}
        ${relatedHtml}
      </article>
    `;
  }
  if (kind === 'article' && article) {
    const sectionsHtml = (article.sections || [])
      .map((s) => `
        <section>
          <h2>${escapeHtml(s.h2)}</h2>
          <p>${escapeHtml(s.body)}</p>
          ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </section>`)
      .join('');
    const faqHtml = (article.faq || [])
      .map((q, i) => `
        <details ${i === 0 ? 'open' : ''}>
          <summary>${escapeHtml(q.q)}</summary>
          <p>${escapeHtml(q.a)}</p>
        </details>`)
      .join('');
    return `
      <article itemscope itemtype="https://schema.org/Article">
        <h1 itemprop="headline">${escapeHtml(article.h1)}</h1>
        <p itemprop="description">${escapeHtml(article.intro)}</p>
        ${sectionsHtml}
        ${faqHtml ? `<section>${faqHtml}</section>` : ''}
      </article>
    `;
  }
  return null;
}

/** Старые slug → канонический (301) */
const SLUG_REDIRECTS = {
  'online-zapis-dlya-mastera-manikyura': 'online-zapis-dlya-manikyura',
};
const {
  resolveMasterIdFromParam,
  loadMasterSeoBundle,
  shouldRedirectToCanonicalSlug,
} = require('../seo/masterSeo');

const RESERVED_PATHS = new Set([
  'login', 'register', 'dashboard', 'admin', 'm', 'legal', 'api', 'uploads',
  'webhook', 'assets', 'blog', 'baza-znaniy', 'sitemap.xml', 'robots.txt',
  'press', 'partners', 'partner',
]);

function shouldNoindex(pathname) {
  if (NOINDEX_EXACT.has(pathname)) return true;
  return NOINDEX_PREFIXES.some((p) => pathname.startsWith(p));
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections,
    faq: typeof row.faq === 'string' ? JSON.parse(row.faq) : row.faq,
    extras: typeof row.extras === 'string' ? JSON.parse(row.extras) : (row.extras || {}),
    toc: typeof row.toc === 'string' ? JSON.parse(row.toc) : (row.toc || []),
  };
}

const LEGAL_PAGES = {
  '/legal/offer': {
    title: 'Публичная оферта Woner.ru',
    description: 'Условия использования сервиса онлайн-записи Woner.ru. Правила для мастеров и клиентов.',
  },
  '/legal/privacy': {
    title: 'Политика обработки персональных данных Woner.ru',
    description: 'Политика обработки персональных данных в сервисе онлайн-записи Woner.ru.',
  },
  '/legal/personal-data-consent': {
    title: 'Согласие на обработку персональных данных Woner.ru',
    description: 'Отдельное согласие на обработку персональных данных в сервисе Woner.ru (152-ФЗ).',
  },
  '/legal/payment': {
    title: 'Правила оплаты и возврата Woner.ru',
    description: 'Информация о тарифах, способах оплаты и возврате средств в сервисе Woner.ru.',
  },
};

async function resolveSeoForPath(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean === '/') return null;
  if (shouldNoindex(clean)) {
    return {
      title: 'Woner.ru',
      description: '',
      canonical: `${SITE_URL}${clean}`,
      robots: 'noindex, nofollow',
      jsonLdBlocks: [],
    };
  }

  if (clean.startsWith('/blog/')) {
    const slug = clean.slice('/blog/'.length);
    const article = mapRow(await repo.getArticleBySlug(slug));
    if (!article) return null;
    const breadcrumbs = [
      { name: 'Главная', url: SITE_URL },
      { name: 'Блог', url: `${SITE_URL}/blog` },
      { name: article.h1, url: `${SITE_URL}${clean}` },
    ];
    return {
      title: article.title,
      description: article.meta_description,
      canonical: `${SITE_URL}${clean}`,
      robots: 'index, follow',
      jsonLdBlocks: buildArticleJsonLd(article, breadcrumbs),
      ssr: { html: buildSsrBody({ kind: 'article', article }) },
    };
  }

  if (clean === '/blog' || clean === '/baza-znaniy') {
    return {
      title: clean === '/blog' ? 'Блог Woner.ru' : 'База знаний Woner.ru',
      description: 'Статьи об онлайн-записи, CRM для мастеров и автоматизации бьюти-бизнеса.',
      canonical: `${SITE_URL}${clean}`,
      robots: 'index, follow',
      jsonLdBlocks: [],
    };
  }

  if (clean === '/resheniya') {
    return {
      title: 'Решения: CRM и онлайн-запись | Woner.ru',
      description: 'Все решения Woner.ru: CRM для клиентов, онлайн-запись, календарь и сравнения с YCLIENTS и DIKIDI.',
      canonical: `${SITE_URL}/resheniya`,
      robots: 'index, follow',
      jsonLdBlocks: [],
    };
  }

  if (clean === '/otrasli') {
    return {
      title: 'Отрасли и ниши | Woner.ru',
      description: 'CRM и онлайн-запись для салонов красоты, барбершопов, клиник, репетиторов и других ниш.',
      canonical: `${SITE_URL}/otrasli`,
      robots: 'index, follow',
      jsonLdBlocks: [],
    };
  }

  if (clean === '/press' || clean === '/partners') {
    const isPress = clean === '/press';
    return {
      title: isPress
        ? 'Пресс-кит Woner.ru — материалы для СМИ'
        : 'Партнёрская программа Woner.ru',
      description: isPress
        ? 'Логотипы, описание сервиса, RSS для Дзена и материалы для VC.ru, Habr и каталогов.'
        : 'Готовые ссылки и UTM для блогов партнёров, школ маникюра и салонов.',
      canonical: `${SITE_URL}${clean}`,
      robots: 'index, follow',
      jsonLdBlocks: [],
    };
  }

  const legalMeta = LEGAL_PAGES[clean];
  if (legalMeta) {
    return {
      title: legalMeta.title,
      description: legalMeta.description,
      canonical: `${SITE_URL}${clean}`,
      robots: 'index, follow',
      jsonLdBlocks: [],
    };
  }

  if (clean.startsWith('/m/')) {
    const param = clean.slice('/m/'.length);
    if (!param || param.includes('/')) return null;

    const masterId = await resolveMasterIdFromParam(param);
    if (!masterId) return null;

    const bundle = await loadMasterSeoBundle(masterId);
    if (!bundle) return null;

    if (shouldRedirectToCanonicalSlug(param, bundle.slug)) {
      return { redirect: `/m/${bundle.slug}` };
    }

    const ogImage = bundle.master.logo_url
      ? (bundle.master.logo_url.startsWith('http')
        ? bundle.master.logo_url
        : `${SITE_URL}${bundle.master.logo_url}`)
      : undefined;

    return {
      title: bundle.meta.title,
      description: bundle.meta.description,
      canonical: bundle.canonical,
      robots: bundle.indexable ? 'index, follow' : 'noindex, follow',
      jsonLdBlocks: buildMasterJsonLd(bundle),
      ogImage,
    };
  }

  const slug = clean.replace(/^\//, '');
  if (!slug || slug.includes('/') || RESERVED_PATHS.has(slug)) return null;

  const redirectTarget = SLUG_REDIRECTS[slug];
  if (redirectTarget) {
    return { redirect: `/${redirectTarget}` };
  }

  const page = mapRow(await repo.getPageBySlug(slug));
  if (!page) return null;

  const canonicalSlug = page.extras?.canonicalSlug || page.slug;
  const canonical = `${SITE_URL}/${canonicalSlug}`;
  const isCanonicalAlias = canonicalSlug !== page.slug;

  const breadcrumbs = [
    { name: 'Главная', url: SITE_URL },
    { name: 'Решения', url: `${SITE_URL}/resheniya` },
    { name: page.h1, url: `${SITE_URL}/${page.slug}` },
  ];

  return {
    title: page.title,
    description: page.meta_description,
    canonical,
    robots: isCanonicalAlias ? 'noindex, follow' : 'index, follow',
    jsonLdBlocks: buildPageJsonLd(page, breadcrumbs),
    ssr: { html: buildSsrBody({ kind: 'page', page }) },
  };
}

async function sendSpaIndexWithSeo(res, indexPath, pathname) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const seo = await resolveSeoForPath(pathname);
    if (!seo) {
      res.sendFile(indexPath);
      return;
    }
    if (seo.redirect) {
      res.redirect(301, seo.redirect);
      return;
    }
    const html = readIndexHtml(indexPath);
    const injected = injectSeoIntoHtml(html, seo);
    res.type('html').send(injected);
  } catch (err) {
    console.error('SEO HTML inject:', err.message);
    res.sendFile(indexPath);
  }
}

module.exports = { sendSpaIndexWithSeo, resolveSeoForPath, RESERVED_PATHS };
