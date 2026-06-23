import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { PageLoader } from '../../components/ui/Spinner';

export default function BlogIndexPage({ knowledge = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seoApi.get('/articles?limit=50')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const title = knowledge ? 'База знаний Woner.ru' : 'Блог Woner.ru';
  const path = knowledge ? '/baza-znaniy' : '/blog';
  const desc = 'Статьи об онлайн-записи, CRM для мастеров, управлении клиентами и автоматизации бьюти-бизнеса.';

  if (loading) return <PageLoader />;

  return (
    <>
      <SeoHead title={`${title} | Woner.ru`} description={desc} canonical={`https://woner.ru${path}`} />
      <SeoPageLayout
        h1={knowledge ? 'База знаний' : 'Блог'}
        intro={desc}
        breadcrumbs={[
          { name: 'Главная', url: 'https://woner.ru' },
          { name: knowledge ? 'База знаний' : 'Блог', url: `https://woner.ru${path}` },
        ]}
        cta={false}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(data?.articles || []).map((a) => (
            <Link
              key={a.slug}
              to={`/blog/${a.slug}`}
              className="group rounded-2xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-md transition"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-500">{a.category}</span>
              <h2 className="mt-2 text-lg font-bold text-slate-900 group-hover:text-violet-700">{a.h1}</h2>
              <p className="mt-2 text-sm text-slate-500 line-clamp-2">{a.intro || a.meta_description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link to="/seo" className="text-violet-600 font-semibold hover:underline">Все SEO-страницы →</Link>
        </p>
      </SeoPageLayout>
    </>
  );
}
