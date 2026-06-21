import { useState } from 'react';
import { CalendarCheck, ChevronRight, ShieldCheck } from 'lucide-react';
import MaxLogo from '../brand/MaxLogo';
import BrandName from '../brand/BrandName';
import { mediaUrl } from '../../lib/media';
import { formatMasterPublicTitle } from '../../lib/masterDisplay';

function MessengerButton({ href, variant, label, sublabel }) {
  const isTelegram = variant === 'telegram';

  return (
    <a
      href={href}
      className={`relative flex w-full min-w-0 items-center gap-3 rounded-2xl px-4 py-3.5 no-underline transition active:scale-[0.98] sm:px-5 sm:py-4 ${
        isTelegram
          ? 'bg-[#229ED9] text-white shadow-lg shadow-sky-500/30 hover:bg-[#1e8fc4]'
          : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isTelegram ? 'bg-white/20' : 'bg-white ring-1 ring-white/50'
        }`}
      >
        {isTelegram ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.128-3.615-1.657-5.233-3.96 9.128-1.97 1.69 1.69z" />
          </svg>
        ) : (
          <MaxLogo className="h-7 w-7 shrink-0" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold leading-snug">{label}</span>
        {sublabel && (
          <span className={`mt-0.5 block text-xs ${isTelegram ? 'text-white/85' : 'text-white/80'}`}>
            {sublabel}
          </span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 opacity-80" strokeWidth={2.5} />
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
        <div className="flex w-full flex-1 flex-col items-center justify-center py-6">
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
                Выберите мессенджер — так мы сохраним ваши записи и напоминания
              </p>
            </div>

            {hasAnyLink ? (
              <div className="mt-6 flex w-full flex-col gap-3">
                {telegramBotDeepLink && (
                  <MessengerButton
                    href={telegramBotDeepLink}
                    variant="telegram"
                    label="Продолжить в Telegram"
                    sublabel="Открыть бота и записаться"
                  />
                )}
                {maxBotDeepLink && (
                  <MessengerButton
                    href={maxBotDeepLink}
                    variant="max"
                    label="Продолжить в MAX"
                    sublabel="Открыть бота и записаться"
                  />
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
