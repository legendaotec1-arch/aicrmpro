import { Calendar, CheckCircle2, Phone, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import MessengerLabel from '../brand/MessengerLabel';
import ClientAvatar from './ClientAvatar';
import { STATUS_LABELS, formatPrice, formatTime } from '../../lib/format';
import { appointmentClientForAvatar } from '../../lib/appointments';
import { formatRuPhoneDisplay, isRuPhoneComplete, toTelHref } from '../../lib/phoneRu';

function statusTone(tone) {
  if (tone === 'success') return 'success';
  if (tone === 'danger') return 'danger';
  return 'neutral';
}

function formatAppointmentDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
}

function MessengerWriteLink({ channel, href, onClick }) {
  const className =
    'inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-admin-border bg-white px-3 py-2 text-xs font-semibold text-admin-text shadow-sm transition hover:border-admin-accent/40 hover:bg-admin-hover active:scale-[0.98]';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <MessengerLabel channel={channel} showName={false} size="sm" />
        <span>Написать</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <MessengerLabel channel={channel} showName={false} size="sm" />
      <span>Написать</span>
    </button>
  );
}

export default function AppointmentDetailModal({
  open,
  appointment: apt,
  contact,
  onClose,
  onComplete,
  onCancel,
  onMessage
}) {
  if (!apt) return null;

  const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
  const contactPhone = contact?.phone || apt.client_phone;
  const phoneDisplay = formatRuPhoneDisplay(contactPhone);
  const phoneComplete = isRuPhoneComplete(contactPhone);
  const telHref = toTelHref(contactPhone);
  const isTelegram = apt.client_messenger === 'telegram';
  const telegramUrl = contact?.telegramUrl;
  const canMessageViaBot = contact?.canMessage ?? !!(apt.telegram_user_id || apt.max_user_id);
  const isConfirmed = apt.status === 'confirmed';
  const clientForAvatar = appointmentClientForAvatar(apt);

  return (
    <Modal open={open} onClose={onClose} size="sm" bleed footer={null}>
      <div className="w-full min-w-0">
        <div className="px-4 pt-4 pb-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[2rem] font-bold leading-none tabular-nums tracking-tight text-admin-text">
                {formatTime(apt.appointment_time)}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm capitalize text-admin-textMuted">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                <span className="truncate">{formatAppointmentDate(apt.appointment_time)}</span>
              </p>
            </div>
            <Badge tone={statusTone(st.tone)} className="shrink-0 mt-0.5">
              {st.label}
            </Badge>
          </div>
        </div>

        <div className="mx-4 mb-3 rounded-xl border border-admin-border/70 bg-gradient-to-br from-admin-bg to-white px-3.5 py-3 sm:mx-5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-semibold leading-snug text-admin-text">{apt.service_name}</p>
            <p className="shrink-0 text-base font-bold tabular-nums text-admin-accent">
              {formatPrice(apt.service_price)}
            </p>
          </div>
          {apt.salon_master_name && (
            <p className="mt-1.5 text-xs text-admin-textMuted">Мастер · {apt.salon_master_name}</p>
          )}
        </div>

        <div className="mx-4 mb-3 rounded-xl border border-admin-border/70 bg-white p-3 sm:mx-5">
          <div className="flex items-center gap-3">
            <ClientAvatar client={clientForAvatar} size="sm" className="ring-admin-accent/15" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-admin-text">{apt.client_name || 'Гость'}</p>
              {phoneComplete ? (
                <p className="mt-0.5 text-sm tabular-nums text-admin-textSecondary">{phoneDisplay}</p>
              ) : (
                <p className="mt-0.5 text-sm text-admin-textMuted">Телефон не указан</p>
              )}
              <div className="mt-1">
                <Badge tone={isTelegram ? 'telegram' : 'max'} />
              </div>
            </div>
            {phoneComplete && telHref && (
              <a href={telHref} className="shrink-0" title="Позвонить">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200/50 transition hover:bg-emerald-600 active:scale-95">
                  <Phone className="h-4 w-4" />
                </span>
              </a>
            )}
          </div>

          {(isTelegram ? telegramUrl : canMessageViaBot) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {isTelegram && telegramUrl && (
                <MessengerWriteLink channel="telegram" href={telegramUrl} />
              )}
              {!isTelegram && canMessageViaBot && onMessage && (
                <MessengerWriteLink channel="max" onClick={() => onMessage(apt)} />
              )}
            </div>
          )}
        </div>

        {apt.client_notes && (
          <div className="mx-4 mb-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2.5 sm:mx-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/80">Заметка</p>
            <p className="mt-1 text-sm leading-relaxed text-admin-text">{apt.client_notes}</p>
          </div>
        )}

        <div className="border-t border-admin-border px-4 py-3 sm:px-5">
          {isConfirmed ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onComplete} className="w-full">
                <CheckCircle2 className="h-4 w-4" />
                Завершить
              </Button>
              <Button variant="danger" onClick={onCancel} className="w-full">
                <XCircle className="h-4 w-4" />
                Отменить
              </Button>
            </div>
          ) : null}
          <Button
            variant={isConfirmed ? 'ghost' : 'secondary'}
            onClick={onClose}
            className={`w-full ${isConfirmed ? 'mt-2' : ''}`}
          >
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
