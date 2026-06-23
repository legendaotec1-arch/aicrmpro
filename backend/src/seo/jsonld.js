const { SITE_URL, SITE_NAME } = require('./config');

async function organization(db) {
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/icon-512.png`,
    description: 'Сервис онлайн-записи и CRM для мастеров и салонов красоты',
  };
  if (db) {
    try {
      const { getLiveProfileUrls } = require('./externalLinks');
      const sameAs = await getLiveProfileUrls(db);
      if (sameAs.length) base.sameAs = sameAs;
    } catch {
      /* ignore */
    }
  }
  return base;
}

function organizationSync() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/icon-512.png`,
    description: 'Сервис онлайн-записи и CRM для мастеров и салонов красоты',
  };
}

function webSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/seo?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function softwareApplication(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      description: 'Бесплатный вход, тарифы за запись или безлимит',
    },
    description: page?.meta_description || 'Онлайн-запись и CRM для мастеров',
    url: page ? `${SITE_URL}/${page.slug}` : SITE_URL,
  };
}

function product(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: page.h1,
    description: page.meta_description,
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: `${SITE_URL}/${page.slug}`,
  };
}

function faqPage(faq) {
  if (!faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

function breadcrumbList(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function articleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.h1,
    description: article.meta_description,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/icon-512.png` },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${article.slug}`,
  };
}

function buildPageJsonLd(page, breadcrumbs) {
  const blocks = [
    organizationSync(),
    webSite(),
    softwareApplication(page),
    product(page),
    faqPage(page.faq),
    breadcrumbList(breadcrumbs),
  ];
  if (page.page_type === 'compare') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.meta_description,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/icon-512.png` },
      },
      mainEntityOfPage: `${SITE_URL}/${page.slug}`,
    });
  }
  return blocks.filter(Boolean);
}

function buildArticleJsonLd(article, breadcrumbs) {
  return [
    organizationSync(),
    articleSchema(article),
    faqPage(article.faq),
    breadcrumbList(breadcrumbs),
  ].filter(Boolean);
}

function absoluteMediaUrl(url) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http')) return s;
  return `${SITE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
}

function buildMasterJsonLd(bundle) {
  if (!bundle?.master) return [];
  const { master, services, reviewSummary, meta, canonical } = bundle;
  const name = master.display_title || master.salon_name || master.name;

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name,
    description: meta.description,
    url: canonical,
    image: absoluteMediaUrl(master.logo_url),
    telephone: master.phone || undefined,
  };

  if (master.address) {
    localBusiness.address = {
      '@type': 'PostalAddress',
      streetAddress: master.address,
      addressLocality: master.city || undefined,
      addressCountry: 'RU',
    };
  }

  if (master.latitude && master.longitude) {
    localBusiness.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(master.latitude),
      longitude: Number(master.longitude),
    };
  }

  if (reviewSummary.count > 0 && reviewSummary.average) {
    localBusiness.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewSummary.average,
      reviewCount: reviewSummary.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (services?.length) {
    localBusiness.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Услуги',
      itemListElement: services.slice(0, 20).map((s, i) => ({
        '@type': 'Offer',
        position: i + 1,
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.duration_minutes ? `${s.duration_minutes} мин` : undefined,
        },
        price: s.price != null ? String(s.price) : undefined,
        priceCurrency: 'RUB',
      })),
    };
  }

  const breadcrumbs = [
    { name: 'Главная', url: SITE_URL },
    { name: name, url: canonical },
  ];

  return [
    breadcrumbList(breadcrumbs),
    localBusiness,
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
  ].filter(Boolean);
}

module.exports = {
  organization,
  organizationSync,
  webSite,
  softwareApplication,
  product,
  faqPage,
  breadcrumbList,
  articleSchema,
  buildPageJsonLd,
  buildArticleJsonLd,
  buildMasterJsonLd,
};
