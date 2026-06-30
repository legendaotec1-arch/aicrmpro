import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://woner.ru';
const DEFAULT_OG = `${SITE_URL}/images/og-image.jpg`;

export default function SeoHead({
  title,
  description,
  canonical,
  robots = 'index, follow',
  ogImage = DEFAULT_OG,
  hreflang = 'ru',
}) {
  const url = canonical
    ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`)
    : SITE_URL;

  return (
    <Helmet>
      <html lang={hreflang} />
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang={hreflang} href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ru_RU" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
