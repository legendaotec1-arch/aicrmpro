import { useEffect, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  ChevronDown,
  Pencil,
  Plus,
  ShieldOff,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { PageLoader } from '../ui/Spinner';
import ClientAvatar from './ClientAvatar';
import { ClientDetailActionBar } from './ClientActionBar';
import { STATUS_LABELS, formatDateTime, formatPrice } from '../../lib/format';
import { formatRuPhoneDisplay, toTelHref } from '../../lib/phoneRu';

function HeroStats({ stats }) {
  const items = [
    { label: 'Визиты', value: stats.total_visits },
    { label: 'Отмены', value: stats.cancelled_visits },
    { label: 'Ср. чек', value: formatPrice(stats.average_check) },
    { label: 'Активные', value: stats.upcoming_visits }
  ];

  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl bg-white/10 px-1.5 py-2 text-center ring-1 ring-white/15 backdrop-blur-sm"
        >
          <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-white/65">{label}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[1.1rem] bg-white ring-1 ring-slate-200/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-admin-textMuted">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-admin-textMuted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-3">{children}</div> : null}
    </section>
  );
}

function displayClientName(client, form) {
  const last = form.last_name?.trim() || client?.last_name?.trim();
  const first = form.first_name?.trim() || client?.first_name?.trim();
  if (last && first) return `${last} ${first}`;
  if (last || first) return last || first;
  return client?.display_name || client?.name || 'Клиент';
}

export default function ClientDetailModal({
  clientId,
  api,
  onClose,
  toast,
  onMessage,
  onRepeatInvite,
  onSaved,
  onDelete
}) {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ last_name: '', first_name: '', phone: '' });
  const [savedNote, setSavedNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteEditing, setNoteEditing] = useState(false);
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false);
  const [repeatSending, setRepeatSending] = useState(false);
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [blacklistSaving, setBlacklistSaving] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, blacklistRes] = await Promise.all([
          api.get(`/master/me/clients/${clientId}`),
          api.get('/master/me/blacklist/check', { params: { client_id: clientId } }).catch(() => ({ data: { blocked: false } }))
        ]);
        if (cancelled) return;
        const c = detailRes.data.client;
        setData(detailRes.data);
        setForm({
          last_name: c.last_name || '',
          first_name: c.first_name || '',
          phone: c.phone || ''
        });
        const initialNote = c.note_1 || c.salon_notes || '';
        setSavedNote(initialNote);
        setNoteDraft(initialNote);
        setNoteEditing(false);
        setIsBlacklisted(!!blacklistRes.data?.blocked);
      } catch {
        if (!cancelled) toast('Не удалось загрузить карточку', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, api, toast]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.put(`/master/me/clients/${clientId}`, form);
      toast('Сохранено');
      if (data?.client) {
        setData({
          ...data,
          client: { ...data.client, ...form, display_name: res.data.display_name || data.client.display_name }
        });
      }
      onSaved?.();
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      toast('Введите текст заметки', 'error');
      return;
    }
    setSavingNote(true);
    try {
      const payload = { note_1: trimmed };
      await api.put(`/master/me/clients/${clientId}`, payload);
      setSavedNote(trimmed);
      setNoteDraft(trimmed);
      setNoteEditing(false);
      toast('Заметка сохранена');
      if (data?.client) {
        setData({ ...data, client: { ...data.client, note_1: trimmed } });
      }
    } catch {
      toast('Ошибка сохранения заметки', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const startAddNote = () => {
    setNoteDraft('');
    setNoteEditing(true);
  };

  const startEditNote = () => {
    setNoteDraft(savedNote);
    setNoteEditing(true);
  };

  const cancelNoteEdit = () => {
    setNoteDraft(savedNote);
    setNoteEditing(false);
  };

  const handleRepeatInvite = async () => {
    if (!onRepeatInvite) return;
    setRepeatSending(true);
    try {
      const res = await onRepeatInvite(data?.client);
      const channels = res?.channels;
      if (channels?.length > 1) {
        toast('Приглашение отправлено в Telegram и MAX');
      } else {
        toast('Приглашение отправлено');
      }
      setShowRepeatConfirm(false);
    } catch (err) {
      toast(err?.response?.data?.error || err?.message || 'Ошибка отправки', 'error');
    } finally {
      setRepeatSending(false);
    }
  };

  const handleBlacklist = async () => {
    if (!blacklistReason.trim()) {
      toast('Укажите причину', 'error');
      return;
    }
    setBlacklistSaving(true);
    try {
      const c = data?.client;
      await api.post('/master/me/blacklist', {
        client_id: clientId,
        name: displayClientName(c, form),
        phone: c?.phone || form.phone || null,
        reason: blacklistReason.trim()
      });
      setIsBlacklisted(true);
      setShowBlacklistConfirm(false);
      setBlacklistReason('');
      toast('Клиент добавлен в чёрный список');
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка', 'error');
    } finally {
      setBlacklistSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ') return;
    setDeleting(true);
    try {
      await api.delete(`/master/me/clients/${clientId}`);
      toast('Клиент удалён из базы');
      setShowDeleteConfirm(false);
      onDelete?.(clientId);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка удаления', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const client = data?.client;
  const stats = data?.stats;
  const appointments = data?.appointments || [];
  const activeAppointments = data?.active_appointments || [];
  const phoneDisplay = client?.phone_display || formatRuPhoneDisplay(client?.phone || form.phone);
  const telHref = client?.tel_href || toTelHref(client?.phone || form.phone);
  const hasTelegram = client?.has_telegram ?? !!client?.telegram_user_id;
  const hasMax = client?.has_max ?? !!client?.max_user_id;
  const title = displayClientName(client, form);
  const hasPhone = phoneDisplay && phoneDisplay !== '+7';

  return (
    <>
      <Modal open={!!clientId} onClose={onClose} size="md" bleed footer={null}>
        {loading ? (
          <div className="flex justify-center py-14">
            <PageLoader />
          </div>
        ) : !data ? (
          <p className="px-6 py-12 text-center text-sm text-admin-textMuted">Данные недоступны</p>
        ) : (
          <>
            <div className="relative overflow-hidden bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 pb-4 pt-3 text-white sm:px-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <ClientAvatar client={client} size="lg" className="ring-2 ring-white/25 shadow-lg" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">Клиент</p>
                  <h2 className="mt-0.5 truncate text-lg font-bold leading-tight">{title}</h2>
                  {hasPhone ? (
                    <p className="mt-1 text-sm tabular-nums text-white/80">{phoneDisplay}</p>
                  ) : (
                    <p className="mt-1 text-sm text-white/60">Без телефона</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {hasTelegram ? <Badge tone="telegram" className="!bg-white/15 !text-white !ring-white/20" /> : null}
                    {hasMax ? <Badge tone="max" className="!bg-white/15 !text-white !ring-white/20" /> : null}
                    {isBlacklisted ? <Badge tone="danger">ЧС</Badge> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-xl bg-white/10 p-2 text-white/90 ring-1 ring-white/15 transition hover:bg-white/20"
                  aria-label="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {stats ? <HeroStats stats={stats} /> : null}
            </div>

            <ClientDetailActionBar
              telHref={telHref}
              hasTelegram={hasTelegram}
              hasMax={hasMax}
              onMessage={onMessage}
              onRepeatInvite={onRepeatInvite ? () => setShowRepeatConfirm(true) : null}
              client={client}
            />

            <div className="space-y-3 bg-slate-50/50 px-3.5 py-3.5 sm:px-4">
              <section className="rounded-[1.1rem] bg-amber-50/90 px-3.5 py-3 ring-1 ring-amber-200/80">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Заметка</p>
                  {!noteEditing && savedNote.trim() ? (
                    <button
                      type="button"
                      onClick={startEditNote}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900/70 hover:text-amber-900"
                    >
                      <Pencil className="h-3 w-3" />
                      Изменить
                    </button>
                  ) : null}
                </div>
                {noteEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="Например: любит капучино"
                      className="input-field min-h-[52px] resize-y bg-white py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNote} loading={savingNote}>
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelNoteEdit} disabled={savingNote}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : savedNote.trim() ? (
                  <p className="text-sm leading-snug text-amber-950 whitespace-pre-wrap">{savedNote}</p>
                ) : (
                  <button
                    type="button"
                    onClick={startAddNote}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900/80 hover:text-amber-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Добавить заметку
                  </button>
                )}
              </section>

              {activeAppointments.length > 0 ? (
                <section className="rounded-[1.1rem] bg-white px-3.5 py-3 ring-1 ring-emerald-200/70">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Ближайшие записи
                  </p>
                  <ul className="space-y-1.5">
                    {activeAppointments.map((apt) => (
                      <li
                        key={apt.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/80 px-2.5 py-2 text-xs"
                      >
                        <span className="min-w-0 truncate font-medium text-admin-text">{apt.service_name}</span>
                        <span className="shrink-0 tabular-nums text-emerald-800/70">{formatDateTime(apt.appointment_time)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <SectionCard title="Данные клиента" icon={Wallet} defaultOpen={false}>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Фамилия"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Рупасов"
                    />
                    <Input
                      label="Имя"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Евгений"
                    />
                  </div>
                  <Input
                    label="Телефон"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 ..."
                  />
                  <Button size="sm" className="w-full sm:w-auto" onClick={handleSaveProfile} loading={savingProfile}>
                    Сохранить
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="История визитов" icon={Calendar} defaultOpen={appointments.length > 0}>
                {appointments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-admin-textMuted">
                    Записей пока нет
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {appointments.map((apt) => {
                      const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
                      return (
                        <li
                          key={apt.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs ring-1 ring-slate-200/60"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-admin-text">{apt.service_name}</p>
                            <p className="text-admin-textMuted">{formatDateTime(apt.appointment_time)}</p>
                          </div>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-2">
                {!isBlacklisted ? (
                  <button
                    type="button"
                    onClick={() => setShowBlacklistConfirm(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    В чёрный список
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={showRepeatConfirm}
        onClose={() => !repeatSending && setShowRepeatConfirm(false)}
        title="Пригласить на повторную запись?"
        description={
          hasTelegram && hasMax
            ? 'Уведомление уйдёт в Telegram и MAX'
            : hasTelegram
              ? 'Уведомление уйдёт в Telegram'
              : hasMax
                ? 'Уведомление уйдёт в MAX'
                : 'У клиента нет привязанного мессенджера'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRepeatConfirm(false)} disabled={repeatSending}>
              Отмена
            </Button>
            <Button onClick={handleRepeatInvite} loading={repeatSending} disabled={!hasTelegram && !hasMax}>
              Отправить
            </Button>
          </>
        }
      />

      <Modal
        open={showBlacklistConfirm}
        onClose={() => !blacklistSaving && setShowBlacklistConfirm(false)}
        title="Добавить в чёрный список?"
        description={title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBlacklistConfirm(false)} disabled={blacklistSaving}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleBlacklist} loading={blacklistSaving}>
              Добавить
            </Button>
          </>
        }
      >
        <Textarea
          label="Причина"
          value={blacklistReason}
          onChange={(e) => setBlacklistReason(e.target.value)}
          rows={3}
          placeholder="Опишите причину..."
        />
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        title="Удалить клиента из базы?"
        description="История записей сохранится. Клиент исчезнет из раздела «Клиенты»."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ'}
            >
              Удалить
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-admin-textSecondary">
          Для подтверждения введите слово <strong>УДАЛИТЬ</strong>
        </p>
        <Input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="УДАЛИТЬ"
          autoComplete="off"
        />
      </Modal>
    </>
  );
}
