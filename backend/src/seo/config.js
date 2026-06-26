const SITE_URL = (process.env.SITE_URL || 'https://woner.ru').replace(/\/$/, '');
const SITE_NAME = 'Woner.ru';

const CLUSTERS = {
  crm: {
    id: 'crm',
    label: 'CRM для клиентов',
    hubSlug: 'crm-dlya-klientov',
  },
  booking: {
    id: 'booking',
    label: 'Онлайн-запись',
    hubSlug: 'online-zapis-dlya-klientov',
  },
  beauty: {
    id: 'beauty',
    label: 'Бьюти и мастера',
    hubSlug: 'zapis-klientov-dlya-byuti-mastera',
  },
};

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/register', changefreq: 'monthly', priority: 0.9 },
  { path: '/seo', changefreq: 'weekly', priority: 0.8 },
  { path: '/resheniya', changefreq: 'weekly', priority: 0.8 },
  { path: '/funkcii', changefreq: 'weekly', priority: 0.8 },
  { path: '/otrasli', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog', changefreq: 'daily', priority: 0.7 },
  { path: '/baza-znaniy', changefreq: 'daily', priority: 0.7 },
  { path: '/press', changefreq: 'monthly', priority: 0.5 },
  { path: '/partners', changefreq: 'monthly', priority: 0.5 },
  { path: '/faq', changefreq: 'monthly', priority: 0.6 },
  { path: '/legal/offer', changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/personal-data-consent', changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/payment', changefreq: 'yearly', priority: 0.3 },
];

const NOINDEX_PREFIXES = ['/dashboard', '/admin', '/login', '/api', '/uploads', '/webhook'];
const NOINDEX_EXACT = new Set(['/login']);

const BLOG_CATEGORIES = [
  { id: 'crm', label: 'CRM' },
  { id: 'online-booking', label: 'Онлайн-запись' },
  { id: 'client-management', label: 'Управление клиентами' },
  { id: 'beauty-business', label: 'Бьюти-бизнес' },
  { id: 'automation', label: 'Автоматизация бизнеса' },
  { id: 'compare', label: 'Сравнения' },
];

module.exports = {
  SITE_URL,
  SITE_NAME,
  CLUSTERS,
  STATIC_ROUTES,
  NOINDEX_PREFIXES,
  NOINDEX_EXACT,
  BLOG_CATEGORIES,
};
