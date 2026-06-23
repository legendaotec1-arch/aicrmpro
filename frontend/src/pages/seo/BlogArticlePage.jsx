import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import JsonLd from '../../seo/JsonLd';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { PageLoader } from '../../components/ui/Spinner';

function splitIntro(intro) {
  const parts = String(intro || '').split(/\n\n+/).filter(Boolean);
  return { hero: parts[0] || '', rest: parts.slice(1) };
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seoApi.get(`/article/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => navigate('/blog', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const { heroIntro, introRest } = useMemo(() => {
    const split = splitIntro(data?.article?.intro);
    return { heroIntro: split.hero, introRest: split.rest };
  }, [data?.article?.intro]);

  if (loading) return <PageLoader />;
  if (!data?.article) return null;

  const { article, breadcrumbs, jsonLd } = data;

  return (
    <>
      <SeoHead
        title={article.title}
        description={article.meta_description}
        canonical={`https://woner.ru/blog/${article.slug}`}
      />
      <JsonLd blocks={jsonLd} />

      <SeoPageLayout breadcrumbs={breadcrumbs} h1={article.h1} intro={heroIntro} badge="Блог">
        {introRest.length > 0 ? (
          <div className="mb-8 space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
            {introRest.map((p) => (
              <p key={p.slice(0, 40)} className="text-[0.9375rem] leading-relaxed text-slate-600 sm:text-base">{p}</p>
            ))}
          </div>
        ) : null}

        {article.toc?.length ? (
          <nav className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Содержание</p>
            <ol className="space-y-2 text-sm">
              {article.toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-slate-600 hover:text-primary hover:underline">{item.label}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {article.sections?.map((section, i) => (
          <section
            key={i}
            id={`section-${i}`}
            className="mb-6 scroll-mt-28 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-black text-[#2b2b2b] sm:text-2xl">{section.h2}</h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-slate-600 sm:text-base">{section.body}</p>
            {section.bullets?.length ? (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {article.related_slugs?.length ? (
          <section className="mt-10 pt-4">
            <h2 className="text-lg font-bold text-[#2b2b2b]">Полезные ссылки</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {article.related_slugs.map((s) => (
                <Link
                  key={s}
                  to={`/${s}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-violet-200 hover:text-primary"
                >
                  /{s}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </SeoPageLayout>
    </>
  );
}
