import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Хлебные крошки" className="mb-6 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.url} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight size={14} className="text-slate-300" /> : null}
            {i === items.length - 1 ? (
              <span className="font-medium text-slate-700">{item.name}</span>
            ) : (
              <Link to={item.url.replace('https://woner.ru', '') || '/'} className="hover:text-violet-600">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
