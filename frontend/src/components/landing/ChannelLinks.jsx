import { CHANNELS, ChannelIcon } from '../brand/SocialBrandIcons';

function ChannelLogoBox({ channel, size = 'md' }) {
  const box =
    size === 'sm'
      ? 'h-9 w-9 rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 rounded-xl'
        : 'h-11 w-11 rounded-xl sm:h-12 sm:w-12';

  const icon =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-10 w-10 sm:h-11 sm:w-11';

  const isInstagram = channel.id === 'instagram';

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden ${box} ${
        isInstagram
          ? 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
          : 'bg-slate-50 ring-1 ring-slate-100'
      }`}
    >
      <ChannelIcon
        id={channel.id}
        className={`${icon} object-contain ${isInstagram ? 'text-white' : ''}`}
        iconClassName={isInstagram ? 'h-6 w-6 text-white' : undefined}
      />
    </span>
  );
}

/**
 * @param {'cards' | 'strip' | 'compact'} variant
 */
export default function ChannelLinks({
  variant = 'cards',
  title = 'Получайте ссылки и делитесь с клиентами',
  subtitle = 'Одна ссылка на запись — работает в любом мессенджере и соцсети',
  className = '',
  light = false,
  align = 'center'
}) {
  if (variant === 'strip') {
    return (
      <div className={className}>
        <p
          className={`mb-4 text-sm font-medium ${align === 'left' ? 'text-left' : 'text-center'} ${
            light ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </p>
        <div className={`flex flex-wrap items-center gap-3 ${align === 'left' ? 'justify-start' : 'justify-center'}`}>
          {CHANNELS.map((channel) => (
            <div key={channel.id} title={channel.name} className="shrink-0 shadow-md">
              <ChannelLogoBox channel={channel} size="lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {CHANNELS.map((channel) => (
          <span
            key={channel.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
          >
            <ChannelLogoBox channel={channel} size="sm" />
            {channel.name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-slate-900 sm:text-base">{title}</p>
      {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{subtitle}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {CHANNELS.map((channel) => (
          <div
            key={channel.id}
            className="flex min-h-[76px] items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-sm ring-1 ring-slate-100/80 transition hover:border-violet-200/80 hover:shadow-md sm:min-h-[80px] sm:gap-3 sm:p-3"
          >
            <ChannelLogoBox channel={channel} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">{channel.name}</p>
              <p className="mt-0.5 truncate text-[10px] leading-snug text-slate-500 sm:text-[11px]">{channel.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
