import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';
import SiteHeader, { SITE_HEADER_OFFSET } from './SiteHeader';

export default function LegalPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <SiteHeader
        showCta={false}
        backLink={
          <Link to="/" className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap">
            ← На главную
          </Link>
        }
      />

      <main className={`flex-1 px-4 py-10 lg:px-8 lg:py-14 ${SITE_HEADER_OFFSET}`}>
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-10 lg:p-12">
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1>
          <div className="prose-legal mt-8 space-y-5 text-sm leading-relaxed text-slate-600 sm:text-base">
            {children}
          </div>
        </article>
      </main>

      <SiteFooter compact />
    </div>
  );
}
