import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import JsonLd from '../../seo/JsonLd';
import SeoPageLayout from '../../seo/SeoPageLayout';
import { PageLoader } from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

const RESERVED = new Set([
  'login', 'register', 'dashboard', 'admin', 'm', 'legal', 'api', 'uploads', 'assets', 'webhook',
]);

function splitIntro(intro) {
  const parts = String(intro || '').split(/\n\n+/).filter(Boolean);
  return { hero: parts[0] || '', rest: parts.slice(1) };
}

function CompareTable({ table }) {
  if (!table?.headers?.length) return null;
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[520px] text-sm text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/90">
            {table.headers.map((h, i) => (
              <th
                key={h}
                className={`px-4 py-3.5 font-semibold text-[#2b2b2b] ${i === 1 ? 'text-primary' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows?.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-slate-50/50' : 'bg-white'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3.5 border-b border-slate-50 align-top ${
                    ci === 0 ? 'font-medium text-[#2b2b2b]' : ci === 1 ? 'text-primary font-medium' : 'text-slate-600'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
      {items.map((b) => (
        <li
          key={b}
          className="flex gap-2.5 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionBody({ section }) {
  const paragraphs = section.paragraphs?.length
    ? section.paragraphs
    : section.body
      ? section.body.split(/\n\n+/).filter(Boolean)
      : [];

  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[0.9375rem] leading-relaxed text-slate-600 sm:text-base">
          {p}
        </p>
      ))}

      {section.h3Blocks?.map((block) => (
        <div key={block.h3} className="mt-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-[#2b2b2b] sm:text-lg">{block.h3}</h3>
          <div className="mt-3 space-y-3">
            {(block.paragraphs || []).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">{p}</p>
            ))}
          </div>
          {block.bullets?.length ? (
            <ul className="mt-3 space-y-2">
              {block.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-primary">•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {section.table ? <CompareTable table={section.table} /> : null}
      <BulletList items={section.bullets} />
    </>
  );
}

function TocNav({ toc, className = '' }) {
  if (!toc?.length) return null;
  return (
    <nav className={className} aria-label="Содержание">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Содержание</p>
      <ol className="space-y-2 text-sm">
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-primary"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function ProgrammaticSeoPage() {
  const { seoSlug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seoSlug || RESERVED.has(seoSlug)) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    seoApi.get(`/page/${seoSlug}`)
      .then((res) => setData(res.data))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false));
  }, [seoSlug, navigate]);

  const { heroIntro, introRest } = useMemo(() => {
    const split = splitIntro(data?.page?.intro);
    return { heroIntro: split.hero, introRest: split.rest };
  }, [data?.page?.intro]);

  if (loading) return <PageLoader />;
  if (!data?.page) return null;

  const { page, breadcrumbs, jsonLd, internalLinks } = data;
  const isCompare = page.page_type === 'compare';
  const toc = page.toc?.length
    ? page.toc
    : page.sections?.map((s, i) => ({ id: `section-${i}`, label: s.h2 }));

  const ctaBlock = (
    <section className="mt-10 rounded-[2rem] bg-[#0f172a] px-6 py-10 text-center text-white sm:px-10 sm:py-12">
      <h2 className="text-2xl font-black sm:text-3xl">Попробуйте Woner.ru бесплатно</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-slate-300 sm:text-base">
        Онлайн-запись, CRM и напоминания в Telegram и MAX — настройка за один вечер
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/register">
          <Button size="lg" className="min-w-[200px] shadow-lg shadow-primary/30">
            Создать аккаунт
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="lg">
            Войти
          </Button>
        </Link>
      </div>
    </section>
  );

  const content = (
    <>
      {introRest.length > 0 ? (
        <div className="mb-8 space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
          {introRest.map((p) => (
            <p key={p.slice(0, 40)} className="text-[0.9375rem] leading-relaxed text-slate-600 sm:text-base">
              {p}
            </p>
          ))}
        </div>
      ) : null}

      {isCompare ? (
        <div className="mb-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 lg:hidden">
          <TocNav toc={toc} />
        </div>
      ) : null}

      {page.sections?.map((section, i) => (
        <section
          key={i}
          id={`section-${i}`}
          className="mb-6 scroll-mt-28 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-black text-[#2b2b2b] sm:text-2xl">{section.h2}</h2>
          <div className="mt-4 space-y-4">
            <SectionBody section={section} />
          </div>
        </section>
      ))}

      {page.faq?.length ? (
        <section className="mt-8 rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-[#2b2b2b] sm:text-3xl">Частые вопросы</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Ответы на популярные вопросы по теме страницы</p>
          <div className="mt-6 space-y-3">
            {page.faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-100 bg-slate-50/50 open:bg-white open:shadow-sm"
              >
                <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-[#2b2b2b] flex justify-between gap-3 sm:px-5">
                  <span>{item.q}</span>
                  <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 sm:px-5 sm:text-[0.9375rem]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {ctaBlock}

      {internalLinks?.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-[#2b2b2b] sm:text-xl">Смотрите также</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {internalLinks.map((link) => (
              <Link
                key={link.to_slug}
                to={`/${link.to_slug}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-primary"
              >
                {link.anchor || link.h1}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <>
      <SeoHead
        title={page.title}
        description={page.meta_description}
        canonical={page.canonicalUrl || `https://woner.ru/${page.slug}`}
        robots={
          page.extras?.canonicalSlug && page.extras.canonicalSlug !== page.slug
            ? 'noindex, follow'
            : 'index, follow'
        }
      />
      <JsonLd blocks={jsonLd} />

      <SeoPageLayout
        breadcrumbs={breadcrumbs}
        h1={page.h1}
        intro={heroIntro}
        badge={isCompare ? 'Сравнение сервисов' : undefined}
        wide={isCompare}
      >
        {isCompare && toc?.length ? (
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <TocNav toc={toc} />
              </div>
            </aside>
            <div>{content}</div>
          </div>
        ) : (
          content
        )}
      </SeoPageLayout>
    </>
  );
}
