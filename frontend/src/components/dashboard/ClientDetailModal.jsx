import { useEffect, useState } from 'react';
import { Calendar, CalendarCheck, Pencil, Phone, Plus, RefreshCw, ShieldOff, Trash2, Wallet, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { PageLoader } from '../ui/Spinner';
import MessengerLabel from '../brand/MessengerLabel';
import ClientAvatar from './ClientAvatar';
import { STATUS_LABELS, formatDateTime, formatPrice } from '../../lib/format';
import { formatRuPhoneDisplay, toTelHref } from '../../lib/phoneRu';

function ClientStatsGrid({ stats }) {
  const items = [
    {
      label: 'Визиты',
      value: stats.total_visits,
      icon: CalendarCheck,
      iconWrap: 'bg-admin-accentSoft text-admin-accent'
    },
    {
      label: 'Отмены',
      value: stats.cancelled_visits,
      icon: XCircle,
      iconWrap: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'Ср. чек',
      value: formatPrice(stats.average_check),
      icon: Wallet,
      iconWrap: 'bg-violet-50 text-violet-600'
    },
    {
      label: 'Активные',
      value: stats.upcoming_visits,
      icon: Calendar,
      iconWrap: 'bg-emerald-50 text-emerald-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ label, value, icon: Icon, iconWrap }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-xl border border-admin-border/70 bg-white px-3 py-2.5 shadow-sm"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none tabular-nums text-admin-text">{value}</p>
            <p className="mt-1 text-[11px] font-medium text-admin-textMuted">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessengerWriteButton({ channel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-admin-border bg-white px-3 py-2 text-xs font-semibold text-admin-text shadow-sm transition hover:border-admin-accent/40 hover:bg-admin-hover active:scale-[0.98]"
    >
      <MessengerLabel channel={channel} showName={false} size="sm" />
      <span>Написать</span>
    </button>
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
      <Modal open={!!clientId} onClose={onClose} size="md" bleed mobileFullScreen footer={null}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <PageLoader />
          </div>
        ) : !data ? (
          <p className="text-sm text-admin-textMuted py-10 text-center px-6">Данные недоступны</p>
        ) : (
          <div className="px-4 py-4 sm:px-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <ClientAvatar client={client} size="lg" className="ring-2 ring-admin-accent/20" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-admin-text truncate leading-tight">{title}</h2>
                {hasPhone && (
                  <p className="mt-0.5 text-sm font-medium text-admin-textSecondary tabular-nums">{phoneDisplay}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {hasTelegram && <Badge tone="telegram" />}
                  {hasMax && <Badge tone="max" />}
                  {isBlacklisted && <Badge tone="danger">ЧС</Badge>}
                </div>
              </div>
              {telHref && (
                <a href={telHref} className="shrink-0">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200/50 transition hover:bg-emerald-600 active:scale-95"
                    title="Позвонить"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {hasTelegram && onMessage && (
                <MessengerWriteButton channel="telegram" onClick={() => onMessage(client, 'telegram')} />
              )}
              {hasMax && onMessage && (
                <MessengerWriteButton channel="max" onClick={() => onMessage(client, 'max')} />
              )}
              {onRepeatInvite && (
                <button
                  type="button"
                  onClick={() => setShowRepeatConfirm(true)}
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-admin-border bg-white px-3 py-2 text-xs font-semibold text-admin-accent shadow-sm transition hover:bg-admin-accentSoft/50 active:scale-[0.98]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Повторная запись
                </button>
              )}
            </div>

            {/* Stats */}
            {stats && <ClientStatsGrid stats={stats} />}

            {/* Active appointments */}
            {activeAppointments.length > 0 && (
              <section>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-admin-textMuted">Ближайшие</p>
                <ul className="space-y-1">
                  {activeAppointments.map((apt) => (
                    <li
                      key={apt.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white border border-admin-border/80 px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0 truncate font-medium text-admin-text">{apt.service_name}</span>
                      <span className="shrink-0 text-admin-textMuted">{formatDateTime(apt.appointment_time)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Profile + note */}
            <section className="rounded-xl border border-admin-border/80 bg-white p-2.5 space-y-2">
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

              <div className="border-t border-admin-border/60 pt-2">
                <p className="mb-1.5 text-xs font-semibold text-admin-text">Заметка о клиенте:</p>
                {noteEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="Например: любит капучино"
                      className="input-field min-h-[56px] resize-y text-sm py-2"
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
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm text-admin-text leading-snug whitespace-pre-wrap">{savedNote}</p>
                    <button
                      type="button"
                      onClick={startEditNote}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-admin-accent hover:text-admin-accentHover"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startAddNote}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-admin-accent hover:text-admin-accentHover"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Добавить заметку
                  </button>
                )}
              </div>
            </section>

            {/* Visit history */}
            <section>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-admin-textMuted flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Последние визиты
              </p>
              {appointments.length === 0 ? (
                <p className="text-xs text-admin-textMuted text-center py-3 rounded-lg border border-dashed border-admin-border">
                  Записей пока нет
                </p>
              ) : (
                <ul className="rounded-xl border border-admin-border/80 overflow-hidden divide-y divide-admin-border/60">
                  {appointments.map((apt) => {
                    const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
                    return (
                      <li key={apt.id} className="flex items-center justify-between gap-2 bg-white px-2.5 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-admin-text truncate">{apt.service_name}</p>
                          <p className="text-admin-textMuted">{formatDateTime(apt.appointment_time)}</p>
                        </div>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-admin-border/60">
              {!isBlacklisted && (
                <button
                  type="button"
                  onClick={() => setShowBlacklistConfirm(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-1 py-1"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  В чёрный список
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-1 py-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto text-xs font-medium text-admin-textMuted hover:text-admin-text px-2 py-1"
              >
                Закрыть
              </button>
            </div>
          </div>
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
        <p className="text-sm text-admin-textSecondary mb-3">
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
