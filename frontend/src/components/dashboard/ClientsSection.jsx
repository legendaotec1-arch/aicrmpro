import { useMemo, useState } from 'react';
import { ChevronRight, MessageCircle, Phone, Search, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ClientAvatar from './ClientAvatar';
import { formatDate, formatPrice } from '../../lib/format';
import { formatRuPhoneDisplay, toTelHref } from '../../lib/phoneRu';

function clientName(client) {
  return client.display_name || client.name || 'Без имени';
}

function matchesSearch(client, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const name = clientName(client).toLowerCase();
  const phone = String(client.phone || client.client_phone || '').replace(/\D/g, '');
  return name.includes(q) || (digits.length >= 3 && phone.includes(digits));
}

function ClientRow({ client, onOpen, onMessage, onDelete }) {
  const name = clientName(client);
  const visits = Number(client.visit_count) || 0;
  const spent = Number(client.total_spent) || 0;
  const hasTelegram = client.has_telegram ?? !!client.telegram_user_id;
  const hasMax = client.has_max ?? !!client.max_user_id;
  const canMessage = hasTelegram || hasMax;
  const rawPhone = client.phone || client.client_phone;
  const phoneDisplay = client.phone_display || (rawPhone ? formatRuPhoneDisplay(rawPhone) : '—');
  const telHref = client.tel_href || (rawPhone ? toTelHref(rawPhone) : null);

  return (
    <li className="group flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-violet-50/40 transition">
      <button
        type="button"
        onClick={() => onOpen?.(client)}
        className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 text-left"
      >
        <ClientAvatar client={client} size="xs" className="sm:hidden" />
        <ClientAvatar client={client} size="sm" className="hidden sm:block" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-admin-text">{name}</p>
            {hasTelegram && <Badge tone="telegram" />}
            {hasMax && <Badge tone="max" />}
            {!hasTelegram && !hasMax && client.messenger && (
              <Badge tone={client.messenger === 'telegram' ? 'telegram' : 'max'} />
            )}
          </div>
          <p className="truncate text-xs text-admin-textMuted sm:hidden">
            {phoneDisplay}
            {visits > 0 ? ` · ${visits} виз.` : ''}
            {spent > 0 ? ` · ${formatPrice(spent)}` : ''}
          </p>
        </div>

        <p className="hidden md:block w-32 shrink-0 truncate text-sm text-admin-textSecondary tabular-nums">
          {phoneDisplay}
        </p>
        <p className="hidden lg:block w-16 shrink-0 text-center text-sm font-medium text-admin-text tabular-nums">
          {visits > 0 ? visits : '—'}
        </p>
        <p className="hidden xl:block w-24 shrink-0 text-right text-sm font-semibold text-admin-accent tabular-nums">
          {spent > 0 ? formatPrice(spent) : '—'}
        </p>
        <p className="hidden lg:block w-28 shrink-0 text-right text-xs text-admin-textMuted">
          {client.last_visit ? formatDate(client.last_visit) : '—'}
        </p>

        <ChevronRight className="h-4 w-4 shrink-0 text-admin-textMuted sm:hidden" />
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition">
        {telHref && (
          <a
            href={telHref}
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-white hover:text-admin-accent"
            title="Позвонить"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        {canMessage && onMessage && (
          <button
            type="button"
            onClick={() => onMessage(client)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-white hover:text-admin-accent"
            title="Написать"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(client)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-red-50 hover:text-red-600"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}

export default function ClientsSection({ clients, onOpen, onMessage, onDelete, onBroadcast }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Клиенты"
        description={clients.length ? `${clients.length} в базе` : 'Все, кто записывался к вам'}
        action={<Button onClick={onBroadcast}>Рассылка</Button>}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon="◎"
          title="Клиентов пока нет"
          description="Они появятся после входа через MAX или Telegram"
        />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Имя или телефон"
              className="input-field pl-10"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-admin-textMuted">Никого не найдено</p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_8rem_4rem_6rem_7rem_4.5rem] gap-3 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-admin-textMuted">
                <span>Клиент</span>
                <span>Телефон</span>
                <span className="text-center">Визиты</span>
                <span className="text-right">Сумма</span>
                <span className="text-right hidden lg:block">Последний</span>
                <span className="sr-only">Действия</span>
              </div>

              <ul className="divide-y divide-admin-border rounded-xl border border-admin-border bg-white overflow-hidden">
                {filtered.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    onOpen={onOpen}
                    onMessage={onMessage}
                    onDelete={onDelete}
                  />
                ))}
              </ul>

              {search.trim() && (
                <p className="text-xs text-admin-textMuted text-center">
                  Показано {filtered.length} из {clients.length}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
