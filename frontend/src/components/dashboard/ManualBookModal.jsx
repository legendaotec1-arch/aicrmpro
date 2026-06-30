import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, UserPlus, X } from 'lucide-react';
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

function nextDays(count = 14) {
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

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-admin-text">{label}</p>
      {children}
    </div>
  );
}

function DateStrip({ selectedDate, onChange, disabled }) {
  const days = useMemo(() => nextDays(14), []);
  const monthLabel = useMemo(() => {
    const d = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  return (
    <div className={disabled ? 'pointer-events-none opacity-45' : ''}>
      <p className="mb-2 text-xs capitalize text-admin-textMuted">{monthLabel}</p>
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        {days.map((day) => {
          const key = formatDateKey(day);
          const selected = key === selectedDate;
          const isToday = key === todayDateStr();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex min-w-[2.75rem] shrink-0 flex-col items-center rounded-lg px-1.5 py-1.5 transition ${
                selected
                  ? 'bg-admin-accent text-white'
                  : 'bg-slate-100 text-admin-text hover:bg-slate-200/80'
              }`}
            >
              <span className={`text-[9px] font-medium ${selected ? 'text-white/80' : 'text-admin-textMuted'}`}>
                {WEEKDAY_SHORT[day.getDay()]}
              </span>
              <span className="text-sm font-bold tabular-nums">{day.getDate()}</span>
              {isToday && !selected ? <span className="mt-0.5 h-1 w-1 rounded-full bg-admin-accent" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function serviceMeta(service) {
  return [
    formatServicePrice(service),
    service.duration_minutes ? `${service.duration_minutes} мин` : ''
  ].filter(Boolean).join(' · ');
}

function ServiceSelect({ services, selectedName, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = services.find((s) => s.name === selectedName);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  if (loading) return <p className="text-sm text-admin-textMuted">Загрузка услуг…</p>;
  if (services.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        Нет услуг в прайсе — добавьте в разделе «Услуги».
      </p>
    );
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field flex w-full items-center justify-between gap-2 py-2.5 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="truncate text-sm font-medium text-admin-text">{selected.name}</span>
              <span className="shrink-0 text-xs text-admin-textMuted">{serviceMeta(selected)}</span>
            </span>
          ) : (
            <span className="text-sm text-admin-textMuted">Выберите услугу</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-admin-textMuted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <ul
          className="mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {services.map((service) => {
            const isSelected = service.name === selectedName;
            return (
              <li key={service.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(service.name);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 ${
                    isSelected
                      ? 'bg-violet-50 text-violet-900'
                      : 'text-admin-text hover:bg-slate-50'
                  }`}
                >
                  <span className={`min-w-0 truncate text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                    {service.name}
                  </span>
                  <span className="shrink-0 text-xs text-admin-textMuted">{serviceMeta(service)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
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
      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
        <ClientAvatar client={selectedClient} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-admin-text">{clientLabel(selectedClient)}</p>
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
          className="rounded-lg p-1.5 text-admin-textMuted hover:bg-white hover:text-admin-text"
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
          placeholder="Имя или телефон"
          className="input-field pl-9 pr-9"
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
      </div>

      <div className="max-h-[140px] overflow-y-auto overscroll-contain rounded-xl ring-1 ring-slate-200">
        {clients.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-admin-textMuted">Клиентов в базе пока нет</p>
        ) : filteredClients.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-admin-textMuted">Никого не найдено</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredClients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => onSelect(client)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-violet-50/50"
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
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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

  const summaryChips = useMemo(() => {
    const chips = [];
    if (selectedMaster && activeMasters.length > 1) chips.push(selectedMaster.name);
    if (selectedService) chips.push(selectedService.name);
    if (form.selectedSlot) {
      chips.push(
        new Date(form.selectedSlot).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    }
    if (form.mode === 'existing' && selectedClient) chips.push(clientLabel(selectedClient));
    else if (form.mode === 'new' && form.clientName.trim()) chips.push(form.clientName.trim());
    return chips;
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
    <Modal open={open} onClose={onClose} size="md" unified footer={null}>
      <form id="manual-book-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-admin-text">Новая запись</h2>
            {summaryChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-admin-textMuted">Услуга, дата, время и клиент</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-admin-textMuted transition hover:bg-slate-100 hover:text-admin-text"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
          {activeMasters.length > 1 ? (
            <Field label="Мастер">
              <div className="flex flex-wrap gap-2">
                {activeMasters.map((m) => {
                  const active = m.id === selectedMasterId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleMasterChange(m.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? 'bg-admin-accent text-white'
                          : 'bg-slate-100 text-admin-text hover:bg-slate-200'
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/25">
                        {m.photo_url ? (
                          <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className={`text-[10px] font-bold ${active ? 'text-white' : 'text-admin-accent'}`}>
                            {m.name?.[0] || '?'}
                          </span>
                        )}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : null}

          <Field label="Услуга">
            <ServiceSelect
              services={services}
              selectedName={form.serviceName}
              onSelect={(name) => patch({ serviceName: name, selectedSlot: null })}
              loading={loadingServices}
            />
          </Field>

          <Field label="Дата">
            <DateStrip
              selectedDate={form.selectedDate}
              onChange={(date) => patch({ selectedDate: date, selectedSlot: null })}
              disabled={!visitReady}
            />
          </Field>

          <Field label="Время">
            {!visitReady ? (
              <p className="text-sm text-admin-textMuted">Сначала выберите услугу</p>
            ) : loadingSlots ? (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-sm text-admin-textMuted">
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
                          ? 'bg-admin-accent text-white'
                          : 'bg-slate-100 text-admin-text hover:bg-slate-200'
                      }`}
                    >
                      {formatSlotTime(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field label="Клиент">
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => patch({ mode: 'existing', clientId: null, clientSearch: '' })}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  form.mode === 'existing' ? 'bg-white text-admin-accent shadow-sm' : 'text-admin-textMuted'
                }`}
              >
                Из базы
              </button>
              <button
                type="button"
                onClick={() => patch({ mode: 'new', clientId: null })}
                className={`inline-flex items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition ${
                  form.mode === 'new' ? 'bg-white text-admin-accent shadow-sm' : 'text-admin-textMuted'
                }`}
              >
                <UserPlus className="h-4 w-4" />
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
          </Field>
        </div>

        <div className="shrink-0 px-4 pb-4 pt-2 sm:px-5">
          <p className="mb-2 text-center text-xs text-admin-textMuted">{footerHint}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="w-full">
              Отмена
            </Button>
            <Button type="submit" loading={submitting} disabled={!canSubmit} className="w-full">
              Создать
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
