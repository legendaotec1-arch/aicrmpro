import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { PageLoader } from '../../components/ui/Spinner';

export default function SeoHubPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seoApi.get('/hub')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const clusters = [
    { key: 'crm', title: 'CRM для клиентов', pages: data?.crm },
    { key: 'booking', title: 'Онлайн-запись', pages: data?.booking },
    { key: 'beauty', title: 'Бьюти и мастера', pages: data?.beauty },
  ];

  return (
    <>
      <SeoHead
        title="SEO-хаб: онлайн-запись и CRM | Woner.ru"
        description="Все решения Woner.ru: CRM для мастеров, онлайн-запись, календарь, бьюти-ниши и сравнения с YCLIENTS и DIKIDI."
        canonical="https://woner.ru/seo"
      />
      <SeoPageLayout
        h1="SEO-хаб Woner.ru"
        intro="Структура сайта по кластерам: CRM, онлайн-запись и бьюти. Выберите нужное решение или отрасль."
        breadcrumbs={[
          { name: 'Главная', url: 'https://woner.ru' },
          { name: 'SEO-хаб', url: 'https://woner.ru/seo' },
        ]}
        cta={false}
      >
        {clusters.map((c) => (
          <section key={c.key} className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{c.title}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(c.pages || []).map((p) => (
                <Link
                  key={p.slug}
                  to={`/${p.slug}`}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                >
                  {p.h1}
                </Link>
              ))}
            </div>
          </section>
        ))}

        {data?.articles?.length ? (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Свежие статьи</h2>
            <div className="flex flex-wrap gap-2">
              {data.articles.map((a) => (
                <Link key={a.slug} to={`/blog/${a.slug}`} className="text-violet-600 hover:underline text-sm">
                  {a.h1}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </SeoPageLayout>
    </>
  );
}
