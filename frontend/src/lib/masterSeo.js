import { mediaUrl } from '../lib/media';
import { formatPrice } from '../lib/format';

const SITE_URL = 'https://woner.ru';

export function buildMasterJsonLdBlocks(master, priceList = [], reviewSummary = {}) {
  if (!master) return [];
  const name = master.display_title || master.salon_name || master.name;
  const canonical = master.canonical_url || `${SITE_URL}/m/${master.public_slug || ''}`;

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name,
    description: master.description || `Онлайн-запись к ${name}`,
    url: canonical,
    image: master.logo_url ? mediaUrl(master.logo_url) : undefined,
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

  const services = (priceList || []).slice(0, 20);
  if (services.length) {
    localBusiness.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Услуги',
      itemListElement: services.map((s, i) => ({
        '@type': 'Offer',
        position: i + 1,
        itemOffered: { '@type': 'Service', name: s.name },
        price: s.price != null ? String(s.price) : undefined,
        priceCurrency: 'RUB',
      })),
    };
  }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name, item: canonical },
      ],
    },
    localBusiness,
  ];
}

export function masterOgImage(master) {
  if (!master?.logo_url) return undefined;
  const url = mediaUrl(master.logo_url);
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
