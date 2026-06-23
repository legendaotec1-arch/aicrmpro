import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { PageLoader } from '../../components/ui/Spinner';

export default function SeoIndustriesHubPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    seoApi.get('/hub/otrasli')
      .then((res) => {
        setData(res.data);
        if (res.data?.industries?.[0]) setOpenCategory(res.data.industries[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const industries = useMemo(() => {
    if (!data?.industries) return [];
    if (!query.trim()) return data.industries;
    const q = query.trim().toLowerCase();
    return data.industries
      .map((cat) => ({
        ...cat,
        niches: cat.niches.filter(
          (n) => n.label.toLowerCase().includes(q)
            || n.pages.some((p) => p.h1?.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => cat.niches.length > 0);
  }, [data, query]);

  if (loading) return <PageLoader />;

  return (
    <>
      <SeoHead
        title="Отрасли и ниши: CRM и онлайн-запись | Woner.ru"
        description="Woner.ru для салонов красоты, барбершопов, косметологов, клиник, репетиторов, фитнес-тренеров и других ниш. CRM и онлайн-запись."
        canonical="https://woner.ru/otrasli"
      />
      <SeoPageLayout
        h1="Отрасли и ниши"
        intro="Programmatic SEO по отраслям: для каждой ниши — CRM, онлайн-запись и смежные запросы. Выберите свою сферу."
        breadcrumbs={[
          { name: 'Главная', url: 'https://woner.ru' },
          { name: 'Отрасли', url: 'https://woner.ru/otrasli' },
        ]}
        cta={false}
      >
        <div className="mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск ниши: косметолог, барбершоп, репетитор…"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="space-y-4">
          {industries.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-violet-50 text-left transition"
              >
                <span className="font-bold text-slate-900">{cat.label}</span>
                <span className="text-sm text-slate-500">{cat.niches.length} ниш</span>
              </button>

              {openCategory === cat.id ? (
                <div className="p-5 space-y-6">
                  {cat.niches.map((niche) => (
                    <div key={niche.id}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-600 mb-2">
                        {niche.label}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {niche.pages.map((p) => (
                          <Link
                            key={p.slug}
                            to={`/${p.slug}`}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                              p.cluster === 'crm'
                                ? 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {p.h1}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link to="/resheniya" className="text-violet-600 font-semibold hover:underline">Все решения →</Link>
          {' · '}
          <Link to="/seo" className="text-violet-600 font-semibold hover:underline">SEO-хаб →</Link>
        </p>
      </SeoPageLayout>
    </>
  );
}
