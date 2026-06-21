import { useEffect, useState } from 'react';
import { Calendar, MessageCircle, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { PageLoader } from '../ui/Spinner';
import MessengerLabel from '../brand/MessengerLabel';
import ClientAvatar from './ClientAvatar';
import { STATUS_LABELS, formatDateTime, formatPrice, formatDate } from '../../lib/format';
import { copyToClipboard } from '../../lib/clipboard';

function StatBox({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-ink mt-0.5">{value}</p>
      {hint && <p className="text-xs text-ink-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

function ContactRow({ label, value, onCopy }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-sm font-medium text-ink break-all">{value}</p>
      </div>
      {onCopy && (
        <Button size="sm" variant="ghost" type="button" onClick={onCopy}>
          Копировать
        </Button>
      )}
    </div>
  );
}

const emptyForm = {
  last_name: '',
  first_name: '',
  patronymic: '',
  phone: '',
  notes: ''
};

export default function ClientDetailModal({
  clientId,
  api,
  onClose,
  toast,
  onMessage,
  onRepeatInvite,
  onSaved
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/master/me/clients/${clientId}`);
        if (!cancelled) {
          const c = res.data.client;
          setData(res.data);
          setForm({
            last_name: c.last_name || '',
            first_name: c.first_name || '',
            patronymic: c.patronymic || '',
            phone: c.phone || '',
            notes: c.salon_notes || ''
          });
        }
      } catch {
        if (!cancelled) toast('Не удалось загрузить карточку', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, api, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/master/me/clients/${clientId}`, form);
      toast('Карточка сохранена');
      if (res.data?.display_name && data?.client) {
        setData({
          ...data,
          client: {
            ...data.client,
            display_name: res.data.display_name,
            ...form
          }
        });
      }
      onSaved?.();
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = async (id) => {
    try {
      await copyToClipboard(id);
      toast('ID скопирован');
    } catch {
      toast('Не удалось скопировать', 'error');
    }
  };

  const client = data?.client;
  const stats = data?.stats;
  const appointments = data?.appointments || [];
  const messengerId = client?.messenger === 'telegram'
    ? client?.telegram_user_id
    : client?.max_user_id;
  const canMessage = client?.can_message ?? !!(client?.max_user_id || client?.telegram_user_id);
  const title = client?.display_name || client?.name || 'Клиент';

  return (
    <Modal open={!!clientId} onClose={onClose} size="lg" bleed footer={null}>
      {loading ? (
        <div className="py-16 flex justify-center">
          <PageLoader />
        </div>
      ) : !data ? (
        <p className="text-sm text-ink-muted py-12 text-center px-6">Данные недоступны</p>
      ) : (
        <>
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-primary/90 px-5 sm:px-6 pt-6 pb-5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)] pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <ClientAvatar client={client} size="xl" className="!ring-white/40 !shadow-lg mx-auto sm:mx-0" />
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{title}</h2>
                {client.phone && (
                  <p className="mt-1 text-sm text-white/85">{client.phone}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-sm font-semibold text-white">
                    <MessengerLabel channel={client.messenger} size="sm" className="!text-white" />
                  </span>
                  {client.created_at && (
                    <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                      с {formatDate(client.created_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-end shrink-0">
                {canMessage && onMessage && (
                  <Button
                    size="sm"
                    className="!bg-white !text-primary hover:!bg-white/90"
                    onClick={() => onMessage(client)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Написать
                  </Button>
                )}
                {onRepeatInvite && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="!bg-white/15 !text-white !border-white/25 hover:!bg-white/25"
                    onClick={() => onRepeatInvite(client)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Повтор
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 max-h-[58vh] overflow-y-auto p-5 sm:p-6">
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox label="Визитов" value={stats.total_visits} />
                <StatBox label="Выручка" value={formatPrice(stats.total_revenue)} />
                <StatBox label="Средний чек" value={formatPrice(stats.average_check)} />
                <StatBox label="Предстоящие" value={stats.upcoming_visits} />
              </div>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Мессенджер</h3>
              <p className="text-xs text-ink-muted">
                {client.messenger === 'telegram'
                  ? 'Фото подтягивается из профиля Telegram при входе.'
                  : 'Фото подтягивается из профиля MAX при входе.'}
              </p>
              <ContactRow
                label={client.messenger === 'telegram' ? 'Telegram user ID' : 'MAX user ID'}
                value={messengerId}
                onCopy={messengerId ? () => handleCopyId(messengerId) : undefined}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">ФИО и телефон</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Фамилия"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Иванова"
                />
                <Input
                  label="Имя"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Мария"
                />
                <Input
                  label="Отчество"
                  value={form.patronymic}
                  onChange={(e) => setForm({ ...form, patronymic: e.target.value })}
                  placeholder="Петровна"
                />
              </div>
              <Input
                label="Телефон"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 ..."
                hint="Для звонка или уточнения записи"
              />
              <Button size="sm" onClick={handleSave} loading={saving}>
                Сохранить карточку
              </Button>
            </section>

            <div>
              <Textarea
                label="Заметки о клиенте"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Аллергии, предпочтения, важные детали..."
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                История визитов
              </h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-ink-muted rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  Записей пока нет
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {appointments.map((apt) => {
                    const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
                    return (
                      <li key={apt.id} className="px-4 py-3 bg-white hover:bg-slate-50/80">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-ink">{apt.service_name}</p>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {formatDateTime(apt.appointment_time)}
                              {apt.salon_master_name && ` · ${apt.salon_master_name}`}
                            </p>
                            {apt.client_notes && (
                              <p className="text-xs text-ink-secondary mt-1">{apt.client_notes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <Badge tone={st.tone}>{st.label}</Badge>
                            {apt.service_price != null && (
                              <p className="text-sm font-semibold text-primary mt-1">{formatPrice(apt.service_price)}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="pt-2 pb-1">
              <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                Закрыть
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
