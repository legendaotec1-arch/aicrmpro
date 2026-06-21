import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, MessageCircle, Phone, Plus, Search, ShieldOff, Trash2, Users } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ClientAvatar from './ClientAvatar';
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

function StatPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600',
    accent: 'bg-admin-accentSoft text-admin-accent',
    muted: 'bg-admin-bg text-admin-textMuted'
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ClientRow({ client, onOpen, onMessage, onDelete }) {
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
    <li className="group">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={() => onOpen?.(client)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
        >
          <ClientAvatar client={client} size="xs" className="sm:!h-10 sm:!w-10 sm:!text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-admin-text">{name}</p>
              {hasTelegram && <Badge tone="telegram" className="!px-1.5 !py-0 !text-[10px]" />}
              {hasMax && <Badge tone="max" className="!px-1.5 !py-0 !text-[10px]" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {phoneDisplay && phoneDisplay !== '+7' ? (
                <span className="text-xs tabular-nums text-admin-textSecondary">{phoneDisplay}</span>
              ) : (
                <span className="text-xs text-admin-textMuted">Без телефона</span>
              )}
              {visits > 0 && <StatPill tone="neutral">{visits} виз.</StatPill>}
              {spent > 0 && <StatPill tone="accent">{formatPrice(spent)}</StatPill>}
              {client.last_visit && (
                <span className="hidden sm:inline-flex">
                  <StatPill tone="muted">{formatDate(client.last_visit, { year: undefined, month: 'short' })}</StatPill>
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-admin-textMuted/70" />
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {telHref && (
            <a
              href={telHref}
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 active:scale-95"
              title="Позвонить"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {canMessage && onMessage && (
            <button
              type="button"
              onClick={() => onMessage(client)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-admin-accentSoft hover:text-admin-accent active:scale-95"
              title="Написать"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(client)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100 active:scale-95"
              title="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
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
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-admin-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isClientsTab ? 'bg-admin-accentSoft text-admin-accent' : 'bg-red-50 text-red-600'
              }`}
            >
              {isClientsTab ? <Users className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-admin-text">Клиенты</h2>
              <p className="text-xs text-admin-textMuted">
                {isClientsTab
                  ? clients.length
                    ? `${clients.length} в базе`
                    : 'Появятся после записи через MAX или Telegram'
                  : blacklistCount
                    ? `${blacklistCount} заблокировано`
                    : 'Онлайн-запись закрыта для заблокированных'}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {isClientsTab ? (
              <>
                {clients.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} className="flex-1 sm:flex-none">
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                )}
                <Button size="sm" onClick={onBroadcast} className="flex-1 sm:flex-none">
                  Рассылка
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setShowBlacklistAdd(true)} className="flex-1 sm:flex-none">
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-1 rounded-xl bg-admin-bg p-1">
          <button
            type="button"
            onClick={() => switchTab('clients')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isClientsTab
                ? 'bg-white text-admin-accent shadow-sm ring-1 ring-admin-accent/20'
                : 'text-admin-textSecondary hover:text-admin-text hover:bg-white/60'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Клиенты</span>
            {clients.length > 0 && (
              <span className="rounded-md bg-admin-accentSoft px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-admin-accent">
                {clients.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => switchTab('blacklist')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              !isClientsTab
                ? 'bg-white text-red-600 shadow-sm ring-1 ring-red-200'
                : 'text-admin-textSecondary hover:text-admin-text hover:bg-white/60'
            }`}
          >
            <ShieldOff className="h-4 w-4" />
            <span>Чёрный список</span>
            {blacklistCount > 0 && (
              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-600">
                {blacklistCount}
              </span>
            )}
          </button>
        </div>

        {isClientsTab && clients.length > 0 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или телефону"
              className="input-field h-10 pl-10 text-sm"
            />
          </div>
        )}
      </div>

      {isClientsTab ? (
        clients.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon="◎"
              title="Клиентов пока нет"
              description="Они появятся после входа через MAX или Telegram"
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-admin-textMuted">Никого не найдено</p>
        ) : (
          <>
            <ul className="divide-y divide-admin-border/80">
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
            {search.trim() ? (
              <p className="border-t border-admin-border/60 px-4 py-2 text-center text-[11px] text-admin-textMuted">
                Показано {filtered.length} из {clients.length}
              </p>
            ) : null}
          </>
        )
      ) : (
        <BlacklistSection
          embedded
          api={api}
          toast={toast}
          showAddModal={showBlacklistAdd}
          onShowAddModalChange={setShowBlacklistAdd}
          onLoaded={(items) => setBlacklistCount(items.length)}
        />
      )}
    </Card>
  );
}
