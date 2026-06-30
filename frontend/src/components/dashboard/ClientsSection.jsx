import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Download,
  Plus,
  Search,
  ShieldOff,
  Users
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ClientAvatar from './ClientAvatar';
import { ClientListActionBar } from './ClientActionBar';
import BlacklistSection from './BlacklistSection';
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

function ClientCard({ client, onOpen, onMessage, onDelete }) {
  const name = clientName(client);
  const visits = Number(client.visit_count) || 0;
  const spent = Number(client.total_spent) || 0;
  const hasTelegram = client.has_telegram ?? !!client.telegram_user_id;
  const hasMax = client.has_max ?? !!client.max_user_id;
  const canMessage = hasTelegram || hasMax;
  const rawPhone = client.phone || client.client_phone;
  const phoneDisplay = client.phone_display || (rawPhone ? formatRuPhoneDisplay(rawPhone) : null);
  const telHref = client.tel_href || (rawPhone ? toTelHref(rawPhone) : null);

  return (
    <li>
      <article className="overflow-hidden rounded-[1.2rem] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80 transition active:scale-[0.995]">
        <button
          type="button"
          onClick={() => onOpen?.(client)}
          className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
        >
          <ClientAvatar client={client} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-bold text-admin-text">{name}</h3>
                  {hasTelegram ? <Badge tone="telegram" className="!px-1.5 !py-0 !text-[10px]" /> : null}
                  {hasMax ? <Badge tone="max" className="!px-1.5 !py-0 !text-[10px]" /> : null}
                </div>
                <p className="mt-1 text-sm tabular-nums text-admin-textSecondary">
                  {phoneDisplay && phoneDisplay !== '+7' ? phoneDisplay : 'Без телефона'}
                </p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-admin-textMuted" />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {visits > 0 ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  {visits} виз.
                </span>
              ) : null}
              {spent > 0 ? (
                <span className="rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">
                  {formatPrice(spent)}
                </span>
              ) : null}
              {client.last_visit ? (
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  {formatDate(client.last_visit, { year: undefined, month: 'short', day: 'numeric' })}
                </span>
              ) : null}
            </div>
          </div>
        </button>

        <ClientListActionBar
          telHref={telHref}
          canMessage={canMessage}
          onMessage={onMessage}
          onDelete={onDelete}
          client={client}
        />
      </article>
    </li>
  );
}

async function downloadClientsCsv(api) {
  const res = await api.get('/master/me/clients/export', { responseType: 'blob' });
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `клиенты_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ClientsSection({
  clients,
  api,
  toast,
  onOpen,
  onMessage,
  onDelete,
  onBroadcast,
  initialTab = 'clients',
  onTabChange
}) {
  const [tab, setTab] = useState(initialTab === 'blacklist' ? 'blacklist' : 'clients');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [blacklistCount, setBlacklistCount] = useState(0);
  const [showBlacklistAdd, setShowBlacklistAdd] = useState(false);

  useEffect(() => {
    setTab(initialTab === 'blacklist' ? 'blacklist' : 'clients');
  }, [initialTab]);

  const filtered = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  const totalSpent = useMemo(
    () => clients.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0),
    [clients]
  );

  const switchTab = (next) => {
    setTab(next);
    onTabChange?.(next);
  };

  const handleExport = async () => {
    if (!api) return;
    setExporting(true);
    try {
      await downloadClientsCsv(api);
      toast?.('База клиентов выгружена в CSV');
    } catch {
      toast?.('Не удалось выгрузить базу', 'error');
    } finally {
      setExporting(false);
    }
  };

  const isClientsTab = tab === 'clients';

  return (
    <div className="overview-shell -mx-1 space-y-4 rounded-[1.75rem] px-1 pb-2">
      <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 py-5 text-white shadow-xl shadow-violet-500/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">База клиентов</p>
            <h1 className="mt-1 font-display text-2xl font-bold">{isClientsTab ? clients.length : blacklistCount}</h1>
            <p className="mt-1 text-sm text-white/75">
              {isClientsTab
                ? clients.length
                  ? 'контактов для записи и рассылок'
                  : 'появятся после первой онлайн-записи'
                : 'заблокированы для онлайн-записи'}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            {isClientsTab ? <Users className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
          </div>
        </div>
        {isClientsTab && clients.length > 0 ? (
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">В базе</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{clients.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">Выручка</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{formatPrice(totalSpent)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {isClientsTab ? (
              <>
                {clients.length > 0 ? (
                  <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                ) : null}
                <Button size="sm" onClick={onBroadcast}>
                  Рассылка
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setShowBlacklistAdd(true)}>
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchTab('clients')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isClientsTab ? 'bg-white text-violet-700 shadow-sm' : 'text-admin-textSecondary'
              }`}
            >
              <Users className="h-4 w-4" />
              Клиенты
              {clients.length > 0 ? (
                <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                  {clients.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => switchTab('blacklist')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                !isClientsTab ? 'bg-white text-red-600 shadow-sm' : 'text-admin-textSecondary'
              }`}
            >
              <ShieldOff className="h-4 w-4" />
              Чёрный список
              {blacklistCount > 0 ? (
                <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {blacklistCount}
                </span>
              ) : null}
            </button>
          </div>

          {isClientsTab && clients.length > 0 ? (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Имя или телефон"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-admin-text outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </div>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
          {isClientsTab ? (
            clients.length === 0 ? (
              <EmptyState
                icon="◎"
                title="Клиентов пока нет"
                description="Они появятся после входа через MAX или Telegram"
              />
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-admin-textMuted">Никого не найдено</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {filtered.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onOpen={onOpen}
                      onMessage={onMessage}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
                {search.trim() ? (
                  <p className="mt-3 text-center text-[11px] text-admin-textMuted">
                    Показано {filtered.length} из {clients.length}
                  </p>
                ) : null}
              </>
            )
          ) : (
            <BlacklistSection
              embedded
              cardLayout
              api={api}
              toast={toast}
              showAddModal={showBlacklistAdd}
              onShowAddModalChange={setShowBlacklistAdd}
              onLoaded={(items) => setBlacklistCount(items.length)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
