import { Link } from 'react-router-dom';
import SiteHeader, { SITE_HEADER_OFFSET } from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import Button from '../components/ui/Button';
import Breadcrumbs from './Breadcrumbs';

export default function SeoPageLayout({
  breadcrumbs,
  h1,
  intro,
  children,
  cta = true,
  badge,
  wide = false,
}) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader />
      <main className={SITE_HEADER_OFFSET}>
        <section className="relative overflow-x-hidden border-b border-slate-100 px-4 pt-6 pb-8 sm:pt-8 sm:pb-10 lg:px-8 lg:pt-10 lg:pb-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F0F0F0] via-white to-[#F0F0F0]" />
          <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-violet-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />

          <div className={`relative mx-auto ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
            {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}

            {badge ? (
              <span className="mb-4 inline-flex items-center rounded-full bg-violet-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200/80">
                {badge}
              </span>
            ) : null}

            <h1 className="max-w-4xl text-[1.75rem] font-black leading-[1.15] tracking-tight text-[#2b2b2b] sm:text-4xl lg:text-[2.75rem]">
              {h1}
            </h1>

            {intro ? (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {intro}
              </p>
            ) : null}

            {cta ? (
              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <Link to="/register">
                  <Button size="lg" className="min-w-[180px] shadow-lg shadow-primary/20">
                    Начать бесплатно
                  </Button>
                </Link>
                <Link to="/#pricing">
                  <Button variant="secondary" size="lg">
                    Тарифы
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <div className={`mx-auto px-4 py-10 sm:py-12 lg:px-8 ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
