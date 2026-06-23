import { MapPin, Star } from 'lucide-react';
import { formatServicePrice } from '../../lib/format';
import { formatMasterPublicTitle } from '../../lib/masterDisplay';

export default function ClientPublicSeoBlock({
  master,
  priceList = [],
  reviewSummary = { count: 0, average: null },
  variant = 'plain',
}) {
  const title = formatMasterPublicTitle(master);
  const services = priceList.slice(0, 30);
  const hasContent = Boolean(
    master?.description || master?.address || services.length || reviewSummary.count > 0
  );
  if (!hasContent) return null;

  const isCard = variant === 'card';

  return (
    <section
      className={
        isCard
          ? 'ct-surface w-full rounded-[1.75rem] border border-[var(--ct-border)] px-5 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:px-6'
          : 'mt-8 w-full border-t border-[var(--ct-border)] pt-6 text-left'
      }
      aria-label="Информация о салоне"
    >
      {isCard ? (
        <h2 className="text-base font-bold text-[var(--ct-text)]">О мастере</h2>
      ) : null}

      {master?.description && (
        <div className={isCard ? 'mt-4' : 'mb-5'}>
          {!isCard ? <h2 className="text-sm font-semibold text-[var(--ct-text)]">О салоне</h2> : null}
          <p className={`text-sm leading-relaxed text-[var(--ct-text-muted)] whitespace-pre-line ${!isCard ? 'mt-2' : ''}`}>
            {master.description}
          </p>
        </div>
      )}

      {master?.address && (
        <div className={`flex items-start gap-2.5 text-sm text-[var(--ct-text-muted)] ${isCard ? 'mt-4' : 'mb-5'}`}>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ct-accent-soft)]">
            <MapPin className="h-4 w-4 text-[var(--ct-accent)]" strokeWidth={2} />
          </span>
          <p className="pt-1 leading-relaxed">{master.address}</p>
        </div>
      )}

      {reviewSummary.count > 0 && (
        <div className={`flex items-center gap-2.5 text-sm text-[var(--ct-text-muted)] ${isCard ? 'mt-4' : 'mb-5'}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <Star className="h-4 w-4 text-amber-500" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="leading-relaxed">
            Рейтинг <strong className="text-[var(--ct-text)]">{reviewSummary.average}</strong> — {reviewSummary.count}{' '}
            {reviewSummary.count === 1 ? 'отзыв' : reviewSummary.count < 5 ? 'отзыва' : 'отзывов'}
          </span>
        </div>
      )}

      {services.length > 0 && (
        <div className={isCard ? 'mt-5' : ''}>
          <h3 className="text-sm font-semibold text-[var(--ct-text)]">
            Услуги и цены — {title}
          </h3>
          <ul className="mt-3 divide-y divide-[var(--ct-border-soft)] rounded-xl border border-[var(--ct-border-soft)] bg-[var(--ct-bg-soft)]/50">
            {services.map((item) => (
              <li
                key={`${item.id || item.name}-${item.price}`}
                className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-sm"
              >
                <span className="text-[var(--ct-text-muted)]">{item.name}</span>
                <span className="shrink-0 font-semibold text-[var(--ct-text)]">
                  {formatServicePrice(item)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
