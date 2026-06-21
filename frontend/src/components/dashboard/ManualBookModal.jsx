import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Clock, Search, Scissors, UserPlus, UserRound, X } from 'lucide-react';
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

function nextDays(count = 21) {
  const days = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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

function FormSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-admin-border/70 bg-admin-bg/30 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-admin-accent" strokeWidth={2} />}
        <p className="text-sm font-semibold text-admin-text">{title}</p>
      </div>
      {children}
    </section>
  );
}

function DateStrip({ selectedDate, onChange, disabled }) {
  const days = useMemo(() => nextDays(21), []);
  const monthLabel = useMemo(() => {
    const d = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <p className="mb-2 text-xs capitalize text-admin-textMuted">{monthLabel}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
        {days.map((day) => {
          const key = formatDateKey(day);
          const selected = key === selectedDate;
          const isToday = key === todayDateStr();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl px-2 py-2 transition ${
                selected
                  ? 'bg-admin-accent text-white shadow-sm shadow-violet-200'
                  : 'bg-white text-admin-text ring-1 ring-admin-border/80 hover:ring-admin-accent/30'
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${selected ? 'text-white/80' : 'text-admin-textMuted'}`}>
                {WEEKDAY_SHORT[day.getDay()]}
              </span>
              <span className="text-base font-bold tabular-nums leading-tight">{day.getDate()}</span>
              {isToday && !selected && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-admin-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function serviceOptionLabel(p) {
  const price = formatServicePrice(p);
  const duration = p.duration_minutes ? `${p.duration_minutes} мин` : '';
  return [p.name, price, duration].filter(Boolean).join(' · ');
}

function ClientPicker({ clients, selectedClient, search, onSearchChange, onSelect, onClear }) {
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    if (!q) return clients;
    return clients.filter((c) => {
      const name = clientLabel(c).toLowerCase();
      const phone = String(c.phone || c.client_phone || '').replace(/\D/g, '');
      return name.includes(q) || (digits && phone.includes(digits));
    });
  }, [clients, search]);

  if (selectedClient) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-violet-200/80">
        <ClientAvatar client={selectedClient} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-admin-text">{clientLabel(selectedClient)}</p>
          <p className="truncate text-xs text-admin-textMuted">
            {(selectedClient.phone_display || selectedClient.phone || selectedClient.client_phone)
              ? formatRuPhoneDisplay(
                  selectedClient.phone_display || selectedClient.phone || selectedClient.client_phone
                )
              : 'Телефон не указан'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-textMuted transition hover:bg-admin-bg hover:text-admin-text"
          aria-label="Сбросить"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Имя или телефон клиента"
          className="input-field pl-10 pr-9"
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
      </div>

      <div className="max-h-[220px] overflow-y-auto overscroll-contain rounded-xl bg-white ring-1 ring-admin-border/70">
        {clients.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-admin-textMuted">Клиентов в базе пока нет</p>
        ) : filteredClients.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-admin-textMuted">Никого не найдено</p>
        ) : (
          <ul className="divide-y divide-admin-border/50">
            {filteredClients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => onSelect(client)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-violet-50/60"
                >
                  <ClientAvatar client={client} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-admin-text">{clientLabel(client)}</p>
                    <p className="truncate text-xs text-admin-textMuted">
                      {(client.phone_display || client.phone || client.client_phone)
                        ? formatRuPhoneDisplay(
                            client.phone_display || client.phone || client.client_phone
                          )
                        : 'Без телефона'}
                      {client.visit_count > 0 ? ` · ${client.visit_count} виз.` : ''}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {filteredClients.length > 5 && (
        <p className="text-xs text-admin-textMuted">
          {filteredClients.length} клиентов · прокрутите список
        </p>
      )}
    </div>
  );
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
  const selectedMaster = activeMasters.find((m) => m.id === effectiveMasterId) || null;

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

  const summaryParts = useMemo(() => {
    const parts = [];
    if (selectedMaster && activeMasters.length > 1) parts.push(selectedMaster.name);
    if (selectedService) parts.push(selectedService.name);
    if (form.selectedSlot) {
      parts.push(
        new Date(form.selectedSlot).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    }
    if (form.mode === 'existing' && selectedClient) parts.push(clientLabel(selectedClient));
    else if (form.mode === 'new' && form.clientName.trim()) parts.push(form.clientName.trim());
    return parts;
  }, [selectedMaster, activeMasters.length, selectedService, form.selectedSlot, form.mode, selectedClient, form.clientName]);

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
  const footerHint = canSubmit
    ? 'Можно создавать запись'
    : !selectedService
      ? 'Выберите услугу'
      : !form.selectedSlot
        ? 'Выберите время'
        : 'Укажите клиента';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая запись"
      description={summaryParts.length ? summaryParts.join(' · ') : 'Услуга, дата, время и клиент'}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-admin-textMuted">{footerHint}</p>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Отмена
            </Button>
            <Button type="submit" form="manual-book-form" loading={submitting} disabled={!canSubmit}>
              Создать
            </Button>
          </div>
        </div>
      }
    >
      <form id="manual-book-form" onSubmit={handleSubmit} className="space-y-3">
        {activeMasters.length > 1 && (
          <FormSection title="Мастер" icon={UserRound}>
            <div className="flex flex-wrap gap-2">
              {activeMasters.map((m) => {
                const active = m.id === selectedMasterId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMasterChange(m.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'bg-white text-admin-text ring-1 ring-admin-border/80 hover:ring-admin-accent/30'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
                      {m.photo_url ? (
                        <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className={`text-xs font-bold ${active ? 'text-white' : 'text-admin-accent'}`}>
                          {m.name?.[0] || '?'}
                        </span>
                      )}
                    </span>
                    <span className="truncate max-w-[140px]">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        <FormSection title="Услуга" icon={Scissors}>
          {loadingServices ? (
            <p className="text-sm text-admin-textMuted">Загрузка…</p>
          ) : services.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200/80">
              Нет услуг в прайсе — добавьте в разделе «Услуги».
            </p>
          ) : (
            <div>
              <select
                required
                value={form.serviceName}
                onChange={(e) => patch({ serviceName: e.target.value, selectedSlot: null })}
                className="input-field w-full appearance-none bg-white pr-10"
              >
                <option value="">Выберите услугу</option>
                {services.map((p) => (
                  <option key={p.id} value={p.name}>
                    {serviceOptionLabel(p)}
                  </option>
                ))}
              </select>
              {selectedService && (
                <p className="mt-2 text-xs text-admin-textMuted">
                  {formatServicePrice(selectedService)}
                  {selectedService.duration_minutes ? ` · ${selectedService.duration_minutes} мин` : ''}
                </p>
              )}
            </div>
          )}
        </FormSection>

        <FormSection title="Дата и время" icon={CalendarDays}>
          <DateStrip
            selectedDate={form.selectedDate}
            onChange={(date) => patch({ selectedDate: date, selectedSlot: null })}
            disabled={!visitReady}
          />

          <div className="mt-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-admin-textMuted">
              <Clock className="h-3.5 w-3.5" />
              Свободные слоты
            </div>
            {!visitReady ? (
              <p className="text-sm text-admin-textMuted">Сначала выберите услугу</p>
            ) : loadingSlots ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 w-16 animate-pulse rounded-lg bg-admin-border/40" />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-3 text-center text-sm text-admin-textMuted ring-1 ring-admin-border/60">
                На эту дату нет свободного времени
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {availableSlots.map((slot) => {
                  const selected = form.selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => patch({ selectedSlot: slot })}
                      className={`rounded-lg py-2 text-sm font-semibold tabular-nums transition ${
                        selected
                          ? 'bg-admin-accent text-white shadow-sm'
                          : 'bg-white text-admin-text ring-1 ring-admin-border/70 hover:ring-admin-accent/40'
                      }`}
                    >
                      {formatSlotTime(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="Клиент" icon={UserPlus}>
          <div className="mb-3 inline-flex rounded-lg bg-white p-0.5 ring-1 ring-admin-border/70">
            <button
              type="button"
              onClick={() => patch({ mode: 'existing', clientId: null, clientSearch: '' })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                form.mode === 'existing'
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-textMuted hover:text-admin-text'
              }`}
            >
              Из базы
            </button>
            <button
              type="button"
              onClick={() => patch({ mode: 'new', clientId: null })}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                form.mode === 'new'
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-textMuted hover:text-admin-text'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Новый
            </button>
          </div>

          {form.mode === 'existing' ? (
            <ClientPicker
              clients={clients}
              selectedClient={selectedClient}
              search={form.clientSearch}
              onSearchChange={(value) => patch({ clientSearch: value, clientId: null })}
              onSelect={(client) => patch({ clientId: client.id, clientSearch: clientLabel(client) })}
              onClear={() => patch({ clientId: null, clientSearch: '' })}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Имя"
                required
                value={form.clientName}
                onChange={(e) => patch({ clientName: e.target.value })}
                placeholder="Анна"
                error={form.clientName ? getClientNameError(form.clientName) : null}
              />
              <PhoneRuInput
                label="Телефон"
                value={form.clientPhone}
                onChange={(phone) => patch({ clientPhone: phone })}
                hint="Необязательно"
              />
            </div>
          )}
        </FormSection>
      </form>
    </Modal>
  );
}
