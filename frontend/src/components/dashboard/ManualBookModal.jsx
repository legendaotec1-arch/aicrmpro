import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Search, UserPlus, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PhoneRuInput from '../ui/PhoneRuInput';
import ClientAvatar from './ClientAvatar';
import { mediaUrl } from '../../lib/media';
import { formatRuPhoneDisplay, isRuPhoneComplete, normalizeRuPhoneForStorage } from '../../lib/phoneRu';
import { canSubmitBooking, getClientNameError } from '../../lib/clientBooking';
import { formatServicePrice } from '../../lib/format';
import { formatDateKey } from '../../lib/ruHolidays';

function todayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSlotTime(slotIso) {
  return new Date(slotIso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = {
  mode: 'existing',
  clientId: null,
  clientSearch: '',
  clientName: '',
  clientPhone: '+7',
  serviceName: '',
  selectedDate: todayDateStr(),
  selectedSlot: null
};

function clientLabel(client) {
  return client?.display_name || client?.name || 'Без имени';
}

export default function ManualBookModal({
  open,
  onClose,
  clients = [],
  salonMasters = [],
  isTeamMember = false,
  salonMasterId,
  api,
  onSuccess,
  toast
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState(salonMasterId || null);

  const activeMasters = useMemo(
    () => salonMasters.filter((m) => m.is_active !== false),
    [salonMasters]
  );

  const effectiveMasterId = isTeamMember ? salonMasterId : selectedMasterId;

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, selectedDate: todayDateStr() });
    setAvailableSlots([]);
    setSelectedMasterId(salonMasterId || activeMasters[0]?.id || null);
  }, [open, salonMasterId, activeMasters]);

  useEffect(() => {
    if (!open || !api || !effectiveMasterId) {
      if (!open) return;
      setServices([]);
      setLoadingServices(false);
      return;
    }
    let cancelled = false;
    setLoadingServices(true);
    api
      .get('/master/me/prices', { params: { salonMasterId: effectiveMasterId } })
      .then((res) => {
        if (!cancelled) setServices(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, api, effectiveMasterId]);

  const selectedService = useMemo(
    () => services.find((p) => p.name === form.serviceName) || null,
    [services, form.serviceName]
  );

  useEffect(() => {
    if (!open || !api || !effectiveMasterId || !selectedService || !form.selectedDate) {
      if (!open) return;
      setAvailableSlots([]);
      setLoadingSlots(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    api
      .get('/master/me/slots', {
        params: {
          date: form.selectedDate,
          salonMasterId: effectiveMasterId,
          durationMinutes: selectedService.duration_minutes || 60
        }
      })
      .then((res) => {
        if (!cancelled) {
          setAvailableSlots(res.data || []);
          setForm((prev) => {
            if (prev.selectedSlot && !(res.data || []).includes(prev.selectedSlot)) {
              return { ...prev, selectedSlot: null };
            }
            return prev;
          });
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, api, effectiveMasterId, selectedService, form.selectedDate]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId) || null,
    [clients, form.clientId]
  );

  const filteredClients = useMemo(() => {
    const q = form.clientSearch.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    let list = clients;
    if (q) {
      list = clients.filter((c) => {
        const name = clientLabel(c).toLowerCase();
        const phone = String(c.phone || c.client_phone || '').replace(/\D/g, '');
        return name.includes(q) || (digits && phone.includes(digits));
      });
    }
    return list.slice(0, 8);
  }, [clients, form.clientSearch]);

  const patch = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const handleMasterChange = (masterId) => {
    setSelectedMasterId(masterId);
    patch({ serviceName: '', selectedSlot: null });
  };

  const canSubmit = (() => {
    if (!selectedService || !form.selectedSlot) return false;
    if (form.mode === 'existing') return Boolean(form.clientId);
    return canSubmitBooking({ name: form.clientName, phone: form.clientPhone });
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (form.mode === 'new') {
      const nameError = getClientNameError(form.clientName);
      if (nameError) {
        toast?.(nameError, 'error');
        return;
      }
      if (form.clientPhone.trim() && !isRuPhoneComplete(form.clientPhone)) {
        toast?.('Укажите телефон полностью в формате +7 999 123 4567', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        serviceName: selectedService.name,
        servicePrice: selectedService.price != null ? Number(selectedService.price) : null,
        appointmentTime: form.selectedSlot,
        duration: Number(selectedService.duration_minutes) || 60,
        salonMasterId: effectiveMasterId || undefined
      };

      if (form.mode === 'existing' && form.clientId) {
        payload.clientId = form.clientId;
      } else {
        payload.clientName = form.clientName.trim();
        if (form.clientPhone.trim()) {
          payload.clientPhone = normalizeRuPhoneForStorage(form.clientPhone);
        }
      }

      await api.post('/appointments', payload);
      toast?.('Запись создана');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast?.(err.response?.data?.error || 'Ошибка создания записи', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const visitReady = Boolean(effectiveMasterId && selectedService);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая запись"
      description="Мастер, услуга, свободное время и клиент"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" form="manual-book-form" loading={submitting} disabled={!canSubmit}>
            Создать
          </Button>
        </>
      }
    >
      <form id="manual-book-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-admin-border bg-admin-bg/40 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-textMuted">
            Запись
          </p>

          {activeMasters.length > 1 ? (
            <div>
              <label className="label-field">Мастер</label>
              <select
                className="input-field"
                value={selectedMasterId || ''}
                onChange={(e) => handleMasterChange(e.target.value)}
              >
                {activeMasters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.specialty ? ` · ${m.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : activeMasters.length === 1 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-admin-border bg-white px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-admin-accent">
                {activeMasters[0].photo_url ? (
                  <img
                    src={mediaUrl(activeMasters[0].photo_url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {activeMasters[0].name?.[0] || '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-admin-text">{activeMasters[0].name}</p>
                {activeMasters[0].specialty && (
                  <p className="truncate text-xs text-admin-textMuted">{activeMasters[0].specialty}</p>
                )}
              </div>
            </div>
          ) : null}

          {loadingServices ? (
            <p className="text-sm text-admin-textMuted">Загрузка услуг…</p>
          ) : services.length === 0 ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              У этого мастера пока нет услуг в прайсе. Добавьте их в разделе «Услуги» в меню слева.
            </p>
          ) : (
            <div>
              <label className="label-field">Услуга</label>
              <select
                required
                value={form.serviceName}
                onChange={(e) => patch({ serviceName: e.target.value, selectedSlot: null })}
                className="input-field"
              >
                <option value="">Выберите услугу</option>
                {services.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                    {p.price != null ? ` — ${p.price} ₽` : ''}
                    {p.duration_minutes ? ` · ${p.duration_minutes} мин` : ''}
                  </option>
                ))}
              </select>
              {selectedService && (
                <p className="mt-2 text-sm text-admin-textMuted">
                  {formatServicePrice(selectedService)}
                  {selectedService.duration_minutes
                    ? ` · ${selectedService.duration_minutes} мин`
                    : ''}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label-field">Дата</label>
            <div className="schedule-cal-wrap rounded-xl border border-admin-border bg-white p-2">
              <Calendar
                className="schedule-cal w-full"
                locale="ru-RU"
                minDate={new Date()}
                value={form.selectedDate ? new Date(`${form.selectedDate}T12:00:00`) : new Date()}
                onChange={(date) =>
                  patch({ selectedDate: formatDateKey(date), selectedSlot: null })
                }
                disabled={!visitReady}
              />
            </div>
          </div>

          <div>
            <label className="label-field">Свободное время</label>
            {!visitReady ? (
              <p className="text-sm text-admin-textMuted">Сначала выберите мастера и услугу</p>
            ) : loadingSlots ? (
              <p className="text-sm text-admin-textMuted">Загрузка слотов…</p>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-lg border border-admin-border bg-white px-3 py-4 text-center text-sm text-admin-textMuted">
                На эту дату нет свободных слотов
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-48 overflow-y-auto rounded-xl border border-admin-border bg-white p-2">
                {availableSlots.map((slot) => {
                  const selected = form.selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => patch({ selectedSlot: slot })}
                      className={`rounded-lg px-2 py-2.5 text-sm font-semibold tabular-nums transition ${
                        selected
                          ? 'bg-admin-accent text-white shadow-sm'
                          : 'bg-admin-bg text-admin-text hover:bg-violet-50 hover:text-admin-accent'
                      }`}
                    >
                      {formatSlotTime(slot)}
                    </button>
                  );
                })}
              </div>
            )}
            {form.selectedSlot && (
              <p className="mt-2 text-sm text-admin-textMuted">
                Выбрано:{' '}
                {new Date(form.selectedSlot).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-textMuted">
            Клиент
          </p>
          <div className="inline-flex rounded-xl bg-admin-bg p-1">
            <button
              type="button"
              onClick={() => patch({ mode: 'existing', clientId: null, clientSearch: '' })}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                form.mode === 'existing'
                  ? 'bg-white text-admin-text shadow-sm'
                  : 'text-admin-textMuted hover:text-admin-text'
              }`}
            >
              Из базы
            </button>
            <button
              type="button"
              onClick={() => patch({ mode: 'new', clientId: null })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                form.mode === 'new'
                  ? 'bg-white text-admin-text shadow-sm'
                  : 'text-admin-textMuted hover:text-admin-text'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Новый
            </button>
          </div>

          {form.mode === 'existing' ? (
            <div className="space-y-3">
              {selectedClient ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200/90 bg-violet-50/40 p-3">
                  <ClientAvatar client={selectedClient} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-admin-text">{clientLabel(selectedClient)}</p>
                    <p className="truncate text-xs text-admin-textMuted">
                      {(selectedClient.phone_display || selectedClient.phone || selectedClient.client_phone)
                        ? formatRuPhoneDisplay(selectedClient.phone_display || selectedClient.phone || selectedClient.client_phone)
                        : 'Телефон не указан'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ clientId: null, clientSearch: '' })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-white hover:text-admin-text"
                    aria-label="Сбросить выбор"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
                    <input
                      type="search"
                      value={form.clientSearch}
                      onChange={(e) => patch({ clientSearch: e.target.value })}
                      placeholder="Имя или телефон клиента"
                      className="input-field pl-10"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-admin-border divide-y divide-admin-border/60">
                    {filteredClients.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-admin-textMuted">
                        {clients.length === 0 ? 'Клиентов в базе пока нет' : 'Никого не найдено'}
                      </p>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() =>
                            patch({ clientId: client.id, clientSearch: clientLabel(client) })
                          }
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-violet-50/50"
                        >
                          <ClientAvatar client={client} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-admin-text">
                              {clientLabel(client)}
                            </p>
                            <p className="truncate text-xs text-admin-textMuted">
                              {(client.phone_display || client.phone || client.client_phone)
                                ? formatRuPhoneDisplay(client.phone_display || client.phone || client.client_phone)
                                : 'Без телефона'}
                              {client.visit_count > 0 ? ` · ${client.visit_count} виз.` : ''}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Имя"
                required
                value={form.clientName}
                onChange={(e) => patch({ clientName: e.target.value })}
                placeholder="Например, Анна"
                error={form.clientName ? getClientNameError(form.clientName) : null}
              />
              <PhoneRuInput
                label="Телефон"
                value={form.clientPhone}
                onChange={(phone) => patch({ clientPhone: phone })}
                hint="Необязательно, если клиент из мессенджера"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
