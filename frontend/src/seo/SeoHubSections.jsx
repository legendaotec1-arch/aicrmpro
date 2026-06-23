import { Link } from 'react-router-dom';

export function SeoLinkGrid({ items, blog = false }) {
  if (!items?.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.slug}
          to={blog ? `/blog/${item.slug}` : `/${item.slug}`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition"
        >
          {item.h1}
        </Link>
      ))}
    </div>
  );
}

export function SeoHubSection({ title, subtitle, children }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{title}</h2>
      {subtitle ? <p className="text-sm text-slate-500 mb-4">{subtitle}</p> : null}
      {children}
    </section>
  );
}
