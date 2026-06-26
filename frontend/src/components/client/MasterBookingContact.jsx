import MaxLogo from '../brand/MaxLogo';
import MasterCallButton from './MasterCallButton';

export function pickMasterContact(master) {
  if (!master) return null;
  const phone = String(master.phone || '').trim();
  if (phone) return { type: 'phone', phone };
  const links = master.socialLinks || {};
  if (links.telegram) return { type: 'telegram', href: links.telegram };
  if (links.max) return { type: 'max', href: links.max };
  return null;
}

export function bookingUnavailableContactHint(contact) {
  if (!contact) {
    return 'Онлайн-запись временно недоступна. Попробуйте связаться с мастером позже.';
  }
  switch (contact.type) {
    case 'phone':
      return 'Сообщите об этом мастеру по телефону.';
    case 'telegram':
      return 'Сообщите об этом мастеру в Telegram.';
    case 'max':
      return 'Сообщите об этом мастеру в MAX.';
    default:
      return 'Онлайн-запись временно недоступна.';
  }
}

function MessengerContactButton({ href, variant, label }) {
  const isTelegram = variant === 'telegram';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px 20px',
        borderRadius: '16px',
        fontWeight: 700,
        fontSize: '15px',
        textDecoration: 'none',
        color: '#fff',
        background: isTelegram ? '#2AABEE' : 'var(--ct-accent, #7c3aed)',
        boxShadow: isTelegram
          ? '0 8px 24px rgba(42, 171, 238, 0.28)'
          : '0 8px 24px rgba(124, 58, 237, 0.22)',
      }}
    >
      {isTelegram ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.82.42z" />
        </svg>
      ) : (
        <MaxLogo className="h-5 w-5 shrink-0" />
      )}
      {label}
    </a>
  );
}

export default function MasterBookingContact({ master, size = 'md', variant = 'theme' }) {
  const contact = pickMasterContact(master);
  if (!contact) return null;

  if (contact.type === 'phone') {
    return <MasterCallButton phone={contact.phone} size={size} variant={variant} />;
  }

  return (
    <MessengerContactButton
      href={contact.href}
      variant={contact.type}
      label={contact.type === 'telegram' ? 'Написать в Telegram' : 'Написать в MAX'}
    />
  );
}
