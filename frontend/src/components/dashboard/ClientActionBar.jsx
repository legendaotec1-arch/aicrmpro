import { MessageCircle, Phone, RefreshCw, Trash2 } from 'lucide-react';
import MessengerLabel from '../brand/MessengerLabel';

const TONE_CLASS = {
  call: 'text-emerald-700 hover:bg-emerald-50',
  message: 'text-violet-700 hover:bg-violet-50',
  accent: 'text-admin-accent hover:bg-admin-accentSoft/40',
  danger: 'text-red-600 hover:bg-red-50'
};

function ActionSlot({ icon: Icon, label, tone = 'message', href, onClick, disabled, customIcon }) {
  const base =
    'flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[2.75rem] transition active:scale-[0.98]';
  const stateClass = disabled
    ? 'text-slate-300 pointer-events-none'
    : TONE_CLASS[tone] || TONE_CLASS.message;

  const content = (
    <>
      {customIcon || (Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={2} /> : null)}
      <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">{label}</span>
    </>
  );

  if (!disabled && href) {
    return (
      <a href={href} className={`${base} ${stateClass}`}>
        {content}
      </a>
    );
  }

  if (disabled) {
    return <span className={`${base} ${stateClass}`}>{content}</span>;
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${stateClass}`}>
      {content}
    </button>
  );
}

export function ClientListActionBar({ telHref, canMessage, onMessage, onDelete, client }) {
  return (
    <div className="grid grid-cols-3 gap-1 border-t border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <ActionSlot icon={Phone} label="Звонок" tone="call" href={telHref} disabled={!telHref} />
      <ActionSlot
        icon={MessageCircle}
        label="Написать"
        tone="message"
        onClick={() => onMessage?.(client)}
        disabled={!canMessage || !onMessage}
      />
      <ActionSlot
        icon={Trash2}
        label="Удалить"
        tone="danger"
        onClick={() => onDelete?.(client)}
        disabled={!onDelete}
      />
    </div>
  );
}

export function ClientDetailActionBar({ telHref, hasTelegram, hasMax, onMessage, onRepeatInvite, client }) {
  return (
    <div className="grid grid-cols-4 gap-1 border-b border-slate-100 bg-slate-50/90 px-2 py-1.5">
      <ActionSlot icon={Phone} label="Звонок" tone="call" href={telHref} disabled={!telHref} />
      <ActionSlot
        label="Telegram"
        tone="message"
        customIcon={<MessengerLabel channel="telegram" showName={false} size="sm" />}
        onClick={() => onMessage?.(client, 'telegram')}
        disabled={!hasTelegram || !onMessage}
      />
      <ActionSlot
        label="MAX"
        tone="message"
        customIcon={<MessengerLabel channel="max" showName={false} size="sm" />}
        onClick={() => onMessage?.(client, 'max')}
        disabled={!hasMax || !onMessage}
      />
      <ActionSlot
        icon={RefreshCw}
        label="Повтор"
        tone="accent"
        onClick={onRepeatInvite}
        disabled={!onRepeatInvite}
      />
    </div>
  );
}
