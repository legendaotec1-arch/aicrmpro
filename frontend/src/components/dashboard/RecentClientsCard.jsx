import { ChevronRight, Users } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ClientAvatar from './ClientAvatar';
import { formatPrice } from '../../lib/format';
import { formatRuPhoneDisplay } from '../../lib/phoneRu';

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
        className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-violet-50/60 active:scale-[0.995]"
      >
        <ClientAvatar client={client} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-admin-text">{name}</p>
            {hasTelegram && <Badge tone="telegram" className="!px-1.5 !py-0 !text-[10px]" />}
            {hasMax && <Badge tone="max" className="!px-1.5 !py-0 !text-[10px]" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-admin-textSecondary">
            <span className="tabular-nums">{phone || 'Без телефона'}</span>
            {visits > 0 ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold">{visits} виз.</span> : null}
            {spent > 0 ? (
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-700">
                {formatPrice(spent)}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-admin-textMuted group-hover:text-violet-600" />
      </button>
    </li>
  );
}

export default function RecentClientsCard({ clients, onOpenClient, onShowAll, limit = 4 }) {
  const recent = clients.slice(0, limit);

  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm shadow-violet-200">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-admin-text">Клиенты</h2>
            <p className="text-xs text-admin-textMuted">
              {clients.length ? `${clients.length} в базе` : 'Пока пусто'}
            </p>
          </div>
        </div>
        {clients.length > 0 ? (
          <Button size="sm" variant="soft" onClick={onShowAll}>
            Все
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {clients.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-admin-text">Клиентов пока нет</p>
            <p className="mt-1 text-xs text-admin-textMuted">Появятся после первой онлайн-записи</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((client) => (
              <RecentClientRow key={client.id} client={client} onOpen={onOpenClient} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
