import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, Check, MessageCircle, Sparkles, Wallet,
} from 'lucide-react';
import seoApi from '../../lib/seoApi';
import SeoHead from '../../seo/SeoHead';
import JsonLd from '../../seo/JsonLd';
import Breadcrumbs from '../../seo/Breadcrumbs';
import SiteHeader, { SITE_HEADER_OFFSET } from '../../components/layout/SiteHeader';
import SiteFooter from '../../components/layout/SiteFooter';
import Button from '../../components/ui/Button';
import BrandName from '../../components/brand/BrandName';
import PricingSection from '../../components/landing/PricingSection';
import { PageLoader } from '../../components/ui/Spinner';

const SLUGS = new Set([
  'alternativa-yclients',
  'alternativa-dikidi',
  'alternativa-altegio',
  'alternativa-altelgio',
]);

function CompareTable({ table }) {
  if (!table?.headers?.length) return null;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-lg shadow-violet-100/40">
      <table className="w-full min-w-[520px] text-sm text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {table.headers.map((h, i) => (
              <th key={h} className={`px-4 py-3.5 font-semibold ${i === 1 ? 'text-primary' : 'text-[#2b2b2b]'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows?.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-slate-50/60' : 'bg-white'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`border-b border-slate-50 px-4 py-3.5 align-top ${
                    ci === 1 ? 'font-medium text-primary' : ci === 0 ? 'font-medium text-[#2b2b2b]' : 'text-slate-600'
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

function splitIntro(intro) {
  const parts = String(intro || '').split(/\n\n+/).filter(Boolean);
  return { hero: parts[0] || '', rest: parts.slice(1) };
}

export default function AlternativeLandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace(/^\//, '').replace(/\/$/, '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!SLUGS.has(slug)) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    seoApi.get(`/page/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const { hero: heroIntro, rest: introRest } = useMemo(
    () => splitIntro(data?.page?.intro),
    [data?.page?.intro],
  );

  if (loading) return <PageLoader />;
  if (!data?.page) return null;

  const { page, breadcrumbs, jsonLd, internalLinks } = data;
  const landing = page.extras || {};
  const competitor = landing.competitorName || 'конкурента';

  return (
    <>
      <SeoHead
        title={page.title}
        description={page.meta_description}
        canonical={page.canonicalUrl || `https://woner.ru/${slug}`}
        robots={
          landing.canonicalSlug && landing.canonicalSlug !== page.slug
            ? 'noindex, follow'
            : 'index, follow'
        }
      />
      <JsonLd blocks={jsonLd} />

      <div className="min-h-screen bg-white text-ink">
        <SiteHeader />

        <main className={SITE_HEADER_OFFSET}>
          {/* Hero */}
          <section className="relative overflow-x-hidden px-4 pt-6 pb-10 sm:pt-8 sm:pb-14 lg:px-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F0F0F0] via-white to-[#F0F0F0]" />
            <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-violet-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />

            <div className="relative mx-auto max-w-7xl">
              <Breadcrumbs items={breadcrumbs} />

              <div className="mt-2 max-w-3xl">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Альтернатива {competitor}
                </span>

                <h1 className="text-[1.85rem] font-black leading-[1.12] tracking-tight text-[#2b2b2b] sm:text-4xl lg:text-5xl">
                  {page.h1}
                  <span className="mt-2 block text-2xl font-bold text-primary sm:text-3xl">
                    — переходите на <BrandName className="text-primary" />
                  </span>
                </h1>

                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">{heroIntro}</p>
                {introRest?.map((p) => (
                  <p key={p.slice(0, 32)} className="mt-3 text-base leading-relaxed text-slate-600">{p}</p>
                ))}

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/register">
                    <Button size="lg" className="min-w-[220px] shadow-lg shadow-primary/25">
                      Начать бесплатно
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {landing.vsSlug ? (
                    <Link to={`/${landing.vsSlug}`}>
                      <Button variant="secondary" size="lg">
                        Сравнить с {competitor}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Reasons */}
          <section className="bg-white px-4 py-12 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-center text-2xl font-black text-[#2b2b2b] sm:text-3xl">
                Почему выбирают Woner вместо {competitor}
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(landing.reasons || []).map((item, i) => {
                  const icons = [Wallet, MessageCircle, CalendarClock, Check];
                  const Icon = icons[i % icons.length];
                  return (
                    <article
                      key={item.title}
                      className="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <h3 className="font-bold text-[#2b2b2b]">{item.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Comparison table */}
          {landing.comparisonTable ? (
            <section className="px-4 py-12 lg:px-8 bg-slate-50/50">
              <div className="mx-auto max-w-7xl">
                <h2 className="text-2xl font-black text-[#2b2b2b] sm:text-3xl text-center mb-8">
                  Woner.ru vs {competitor} — кратко
                </h2>
                <CompareTable table={landing.comparisonTable} />
              </div>
            </section>
          ) : null}

          <PricingSection />

          {/* Migration */}
          <section className="px-4 py-16 lg:px-8 bg-white">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-center text-2xl font-black text-[#2b2b2b] sm:text-3xl">
                Как перейти с {competitor} за 3 шага
              </h2>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {(landing.migrationSteps || []).map((step) => (
                  <article
                    key={step.step}
                    className="rounded-2xl border border-slate-100 bg-gradient-to-b from-violet-50/50 to-white p-6 shadow-sm"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {step.step}
                    </span>
                    <h3 className="mt-4 font-bold text-[#2b2b2b]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Dark CTA */}
          <section className="mx-4 mb-8 lg:mx-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#0f172a] px-6 py-12 text-center text-white lg:px-14 lg:py-16">
              <h2 className="text-2xl font-black sm:text-4xl">
                Готовы сменить {competitor}?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Бесплатная регистрация · первые записи в день запуска · Telegram и MAX
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register">
                  <Button size="lg" className="min-w-[220px]">Создать аккаунт</Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg">Войти</Button>
                </Link>
              </div>
            </div>
          </section>

          {/* SEO content + FAQ */}
          <section className="px-4 pb-16 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-xl font-black text-[#2b2b2b] sm:text-2xl mb-6">Подробный обзор</h2>
              {page.sections?.slice(0, 6).map((section, i) => (
                <article key={i} className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#2b2b2b]">{section.h2}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">{section.body}</p>
                </article>
              ))}

              {page.faq?.length ? (
                <div className="mt-10">
                  <h2 className="text-xl font-black text-[#2b2b2b] mb-4">Вопросы и ответы</h2>
                  <div className="space-y-3">
                    {page.faq.slice(0, 8).map((item) => (
                      <details key={item.q} className="group rounded-xl border border-slate-100 bg-slate-50/50 open:bg-white">
                        <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-[#2b2b2b] flex justify-between gap-2">
                          {item.q}
                          <span className="text-primary group-open:rotate-45 transition">+</span>
                        </summary>
                        <p className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm text-slate-600">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}

              {internalLinks?.length ? (
                <div className="mt-10 pt-6 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-500 mb-3">Смотрите также</p>
                  <div className="flex flex-wrap gap-2">
                    {internalLinks.map((link) => (
                      <Link
                        key={link.to_slug}
                        to={`/${link.to_slug}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-violet-200 hover:text-primary"
                      >
                        {link.anchor || link.h1}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </main>

        {/* Sticky mobile CTA */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <Link to="/register" className="block">
            <Button size="lg" className="w-full">Начать бесплатно</Button>
          </Link>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
