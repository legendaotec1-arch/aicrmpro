import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { SeoHubSection, SeoLinkGrid } from '../../seo/SeoHubSections';
import { PageLoader } from '../../components/ui/Spinner';

export default function SeoSolutionsHubPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    seoApi.get('/hub/resheniya')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filter = (items) => {
    if (!query.trim()) return items || [];
    const q = query.trim().toLowerCase();
    return (items || []).filter((p) => p.h1?.toLowerCase().includes(q) || p.slug?.includes(q));
  };

  const crmNiche = useMemo(() => filter(data?.crmNiche), [data, query]);
  const bookingNiche = useMemo(() => filter(data?.bookingNiche), [data, query]);

  if (loading) return <PageLoader />;

  return (
    <>
      <SeoHead
        title="Решения: CRM и онлайн-запись | Woner.ru"
        description="Все решения Woner.ru: CRM для клиентов, онлайн-запись, календарь, база клиентов и сравнения с YCLIENTS и DIKIDI."
        canonical="https://woner.ru/resheniya"
      />
      <SeoPageLayout
        h1="Решения Woner.ru"
        intro="Коммерческие страницы по кластерам CRM и онлайн-записи. Выберите решение под вашу нишу или изучите ключевые функции."
        breadcrumbs={[
          { name: 'Главная', url: 'https://woner.ru' },
          { name: 'Решения', url: 'https://woner.ru/resheniya' },
        ]}
        cta={false}
      >
        <div className="mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по решениям…"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <section className="mb-10">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-6">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">Сравнения — быстрый коммерческий трафик</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { slug: 'woner-vs-yclients', label: 'Woner против YCLIENTS' },
                { slug: 'woner-vs-dikidi', label: 'Woner против DIKIDI' },
                { slug: 'woner-vs-altegio', label: 'Woner против Altegio' },
                { slug: 'alternativa-yclients', label: 'Альтернатива YCLIENTS' },
                { slug: 'alternativa-dikidi', label: 'Альтернатива DIKIDI' },
                { slug: 'alternativa-altegio', label: 'Альтернатива Altegio' },
                { slug: 'alternativa-altelgio', label: 'Альтернатива Altelgio' },
              ].map((item) => (
                <Link
                  key={item.slug}
                  to={`/${item.slug}`}
                  className="rounded-xl bg-white border border-amber-100 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-violet-300 hover:text-violet-700 transition"
                >
                  {item.label} →
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SeoHubSection title="Ключевые коммерческие страницы" subtitle="Приоритет для SEO и конверсии">
          <SeoLinkGrid items={filter(data?.solutions)} />
        </SeoHubSection>

        <SeoHubSection title="CRM для клиентов" subtitle="Управление базой и коммуникацией">
          <SeoLinkGrid items={filter(data?.crmCore)} />
        </SeoHubSection>

        <SeoHubSection title="CRM по нишам" subtitle={`${crmNiche.length} страниц`}>
          <SeoLinkGrid items={crmNiche} />
        </SeoHubSection>

        <SeoHubSection title="Онлайн-запись" subtitle="Сервисы и системы записи клиентов">
          <SeoLinkGrid items={filter(data?.bookingCore)} />
        </SeoHubSection>

        <SeoHubSection title="Онлайн-запись по нишам" subtitle={`${bookingNiche.length} страниц`}>
          <SeoLinkGrid items={bookingNiche} />
        </SeoHubSection>

        <SeoHubSection title="Функции" subtitle="Календарь, расписание, база клиентов">
          <SeoLinkGrid items={filter(data?.features)} />
        </SeoHubSection>

        <SeoHubSection title="Все сравнения" subtitle="Подробные обзоры 3000+ слов">
          <SeoLinkGrid items={filter(data?.compare)} />
        </SeoHubSection>

        <p className="text-center text-sm text-slate-500">
          <Link to="/otrasli" className="text-violet-600 font-semibold hover:underline">Смотреть по отраслям →</Link>
          {' · '}
          <Link to="/blog" className="text-violet-600 font-semibold hover:underline">Блог →</Link>
        </p>
      </SeoPageLayout>
    </>
  );
}
