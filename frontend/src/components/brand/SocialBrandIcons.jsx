/** Логотипы мессенджеров и соцсетей */
import MaxLogo from './MaxLogo';

export { default as MaxLogo, MAX_LOGO_SRC } from './MaxLogo';

export const TELEGRAM_LOGO_SRC = '/images/telegram-logo.png';
export const VK_LOGO_SRC = '/images/vk-logo.png';

export function IconTelegram({ className = 'h-6 w-6', alt = 'Telegram', ...props }) {
  return (
    <img
      src={TELEGRAM_LOGO_SRC}
      alt={alt}
      className={`object-contain select-none ${className}`}
      draggable={false}
      {...props}
    />
  );
}

export function IconVk({ className = 'h-6 w-6', alt = 'ВКонтакте', ...props }) {
  return (
    <img
      src={VK_LOGO_SRC}
      alt={alt}
      className={`object-contain select-none ${className}`}
      draggable={false}
      {...props}
    />
  );
}

/** @deprecated use MaxLogo */
export function IconMax(props) {
  return <MaxLogo {...props} />;
}

export function IconInstagram({ className = 'h-6 w-6', ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export function ChannelIcon({ id, className = 'h-6 w-6', iconClassName, alt }) {
  const ch = CHANNELS.find((c) => c.id === id);
  if (!ch) return null;
  if (ch.useLogo) {
    if (ch.id === 'max') return <MaxLogo className={className} alt={alt || ch.name} />;
    const Logo = ch.Icon;
    return <Logo className={className} alt={alt || ch.name} />;
  }
  const Icon = ch.Icon;
  return <Icon className={iconClassName || className} />;
}

export const CHANNELS = [
  {
    id: 'telegram',
    name: 'Telegram',
    hint: 't.me / бот',
    cardClass: 'bg-white text-slate-900 border border-slate-100 shadow-sm hover:shadow-md',
    stripClass: 'bg-transparent p-0 shadow-none',
    compactClass: 'bg-white text-slate-800 border border-slate-200',
    Icon: IconTelegram,
    useLogo: true
  },
  {
    id: 'max',
    name: 'MAX',
    hint: 'max.ru',
    cardClass: 'bg-slate-900 ring-1 ring-slate-700',
    stripClass: 'bg-transparent p-0 shadow-none',
    compactClass: 'bg-slate-100 text-slate-800 border border-slate-200',
    Icon: null,
    useLogo: true
  },
  {
    id: 'vk',
    name: 'ВКонтакте',
    hint: 'vk.com',
    cardClass: 'bg-white text-slate-900 border border-slate-100 shadow-sm hover:shadow-md',
    stripClass: 'bg-transparent p-0 shadow-none',
    compactClass: 'bg-white text-slate-800 border border-slate-200',
    Icon: IconVk,
    useLogo: true
  },
  {
    id: 'instagram',
    name: 'Instagram*',
    hint: 'ссылка на запись',
    cardClass: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    stripClass: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    compactClass: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white',
    Icon: IconInstagram,
    useLogo: false
  }
];
