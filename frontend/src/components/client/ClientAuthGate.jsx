import { useState } from 'react';
import { CalendarCheck, ShieldCheck } from 'lucide-react';
import MaxLogo from '../brand/MaxLogo';
import BrandName from '../brand/BrandName';
import { mediaUrl } from '../../lib/media';
import { formatMasterPublicTitle } from '../../lib/masterDisplay';

function MessengerButton({ href, variant, children }) {
  const isTelegram = variant === 'telegram';
  return (
    <a
      href={href}
      className={`group flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 text-[15px] font-semibold no-underline transition active:scale-[0.98] ${
        isTelegram
          ? 'bg-[#229ED9] text-white shadow-lg shadow-sky-500/25 hover:bg-[#1e8fc4]'
          : 'bg-white text-[#2b2b2b] ring-1 ring-black/[0.08] hover:bg-slate-50 hover:ring-violet-200'
      }`}
    >
      {children}
    </a>
  );
}

export default function ClientAuthGate({
  master,
  telegramBotDeepLink,
  maxBotDeepLink,
}) {
  const salonName = formatMasterPublicTitle(master) || 'мастеру';
  const specialty = master?.specialty || master?.salon_tagline || null;
  const photoSrc = master?.logo_url ? mediaUrl(master.logo_url) : null;
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const hasAnyLink = Boolean(telegramBotDeepLink || maxBotDeepLink);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-50/90 via-white to-slate-50" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-violet-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sky-100/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <div className="w-full rounded-[1.75rem] bg-white/90 p-6 shadow-[0_8px_40px_rgba(106,90,205,0.08)] ring-1 ring-black/[0.05] backdrop-blur-xl sm:p-8">
            <div className="mx-auto mb-5 flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-2xl bg-violet-50 ring-2 ring-violet-100 shadow-[0_0_0_4px_rgba(106,90,205,0.08)]">
              {photoSrc ? (
                <>
                  <img
                    src={photoSrc}
                    alt=""
                    className={`h-full w-full object-cover ${avatarLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setAvatarLoaded(true)}
                  />
                  {!avatarLoaded && (
                    <span className="text-3xl font-bold text-primary">{salonName[0] || '?'}</span>
                  )}
                </>
              ) : (
                <span className="text-3xl font-bold text-primary">{salonName[0] || '?'}</span>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600/80">Онлайн-запись</p>
              <h1 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#2b2b2b] sm:text-2xl">
                {salonName}
              </h1>
              {specialty && (
                <p className="mt-1 text-sm text-slate-500">{specialty}</p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Войдите через мессенджер — так мы сохраним ваши записи и напоминания
              </p>
            </div>

            {hasAnyLink ? (
              <div className="mt-6 space-y-3">
                {telegramBotDeepLink && (
                  <MessengerButton href={telegramBotDeepLink} variant="telegram">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.128-3.615-1.657-5.233-3.96 9.128-1.97 1.69 1.69z" />
                    </svg>
                    Telegram
                  </MessengerButton>
                )}
                {maxBotDeepLink && (
                  <MessengerButton href={maxBotDeepLink} variant="max">
                    <MaxLogo className="h-[22px] w-[22px] shrink-0" />
                    MAX
                  </MessengerButton>
                )}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 ring-1 ring-amber-200/80">
                Запись через мессенджер временно недоступна. Свяжитесь с салоном напрямую.
              </p>
            )}

            <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
              <li className="flex items-start gap-2.5 text-xs text-slate-500">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                Запись, перенос и отмена визита
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                Без пароля — только подтверждение в боте
              </li>
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Сервис <BrandName className="text-primary" tldClassName="text-slate-400" />
          </p>
        </div>
      </div>
    </div>
  );
}
