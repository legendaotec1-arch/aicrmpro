import { ChevronRight, Users } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ClientAvatar from './ClientAvatar';
import { formatPrice } from '../../lib/format';
import { formatRuPhoneDisplay } from '../../lib/phoneRu';

function StatPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white/80 text-slate-600 ring-1 ring-slate-200/80',
    accent: 'bg-violet-100/90 text-violet-700 ring-1 ring-violet-200/60'
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${tones[tone]}`}>
      {children}
    </span>
  );
}

function clientLabel(client) {
  return client.display_name || client.name || 'Клиент';
}

function clientPhone(client) {
  if (client.phone_display && client.phone_display !== '+7') return client.phone_display;
  const raw = client.phone || client.client_phone;
  return raw ? formatRuPhoneDisplay(raw) : null;
}

function RecentClientRow({ client, onOpen }) {
  const name = clientLabel(client);
  const phone = clientPhone(client);
  const visits = Number(client.visit_count) || 0;
  const spent = Number(client.total_spent) || 0;
  const hasTelegram = client.has_telegram ?? !!client.telegram_user_id;
  const hasMax = client.has_max ?? !!client.max_user_id;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen?.(client)}
        className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/70 px-3 py-2.5 text-left transition hover:border-violet-200/80 hover:bg-white hover:shadow-sm active:scale-[0.995]"
      >
        <ClientAvatar client={client} size="sm" className="ring-violet-100" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-admin-text">{name}</p>
            {hasTelegram && <Badge tone="telegram" className="!px-1.5 !py-0 !text-[10px]" />}
            {hasMax && <Badge tone="max" className="!px-1.5 !py-0 !text-[10px]" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs tabular-nums text-admin-textSecondary">
              {phone || 'Без телефона'}
            </span>
            {visits > 0 && <StatPill tone="neutral">{visits} виз.</StatPill>}
            {spent > 0 && <StatPill tone="accent">{formatPrice(spent)}</StatPill>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-admin-textMuted/60 transition group-hover:translate-x-0.5 group-hover:text-admin-accent" />
      </button>
    </li>
  );
}

export default function RecentClientsCard({ clients, onOpenClient, onShowAll, limit = 4 }) {
  const recent = clients.slice(0, limit);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-white shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-0 h-24 w-24 rounded-full bg-indigo-100/40 blur-2xl" />

      <div className="relative border-b border-violet-100/80 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm shadow-violet-100">
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-admin-text">Последние клиенты</h2>
              <p className="text-xs text-violet-600/70">
                {clients.length
                  ? `${Math.min(limit, clients.length)} из ${clients.length} в базе`
                  : 'Появятся после первой записи'}
              </p>
            </div>
          </div>
          {clients.length > 0 && (
            <Button size="sm" variant="soft" onClick={onShowAll} className="shrink-0">
              Все
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative p-3 sm:p-4">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-200/80 bg-white/50 px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100/80 text-violet-500">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-admin-text">Клиентов пока нет</p>
            <p className="mt-1 text-xs text-admin-textMuted">
              Они появятся после записи через MAX или Telegram
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {recent.map((client) => (
              <RecentClientRow key={client.id} client={client} onOpen={onOpenClient} />
            ))}
          </ul>
        )}

        {clients.length > limit && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-violet-600 transition hover:bg-violet-50/80"
          >
            Показать всех ({clients.length})
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
