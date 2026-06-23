import { useState } from 'react';
import { BellRing, CalendarCheck, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import MaxLogo from '../brand/MaxLogo';
import BrandName from '../brand/BrandName';
import { mediaUrl } from '../../lib/media';
import { formatMasterPublicTitle } from '../../lib/masterDisplay';
import ClientPublicSeoBlock from './ClientPublicSeoBlock';

function MessengerButton({ href, variant, label, sublabel }) {
  const isTelegram = variant === 'telegram';

  return (
    <a
      href={href}
      className={`group relative flex w-full min-w-0 items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-4 no-underline transition duration-200 active:scale-[0.98] ${
        isTelegram
          ? 'bg-[#2AABEE] text-white shadow-[0_10px_28px_rgba(42,171,238,0.35)] hover:bg-[#229ED9]'
          : 'bg-[var(--ct-accent)] text-[var(--ct-on-accent)] shadow-[0_10px_28px_var(--ct-accent-ring)] hover:opacity-95'
      }`}
    >
      <span
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          isTelegram ? 'bg-white/20' : 'bg-white/15 ring-1 ring-white/25'
        }`}
      >
        {isTelegram ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.82.42z" />
          </svg>
        ) : (
          <MaxLogo className="h-7 w-7 shrink-0" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold leading-snug tracking-tight">{label}</span>
        {sublabel && (
          <span className="mt-0.5 block text-xs opacity-85">{sublabel}</span>
        )}
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        strokeWidth={2.5}
      />
    </a>
  );
}

function FeatureChip({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--ct-bg-soft)] px-3 py-2.5 text-xs leading-snug text-[var(--ct-text-muted)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--ct-accent)]" strokeWidth={2} />
      <span>{children}</span>
    </div>
  );
}

export default function ClientAuthGate({
  master,
  telegramBotDeepLink,
  maxBotDeepLink,
  priceList = [],
  reviewSummary = { count: 0, average: null },
}) {
  const salonName = formatMasterPublicTitle(master) || 'мастеру';
  const specialty = master?.specialty || master?.salon_tagline || null;
  const photoSrc = master?.logo_url ? mediaUrl(master.logo_url) : null;
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const hasAnyLink = Boolean(telegramBotDeepLink || maxBotDeepLink);

  return (
    <div className="min-h-dvh bg-[var(--ct-bg)] text-[var(--ct-text)]">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{ background: 'var(--ct-hero-gradient)' }}
        aria-hidden
      />
      <div className="pointer-events-none fixed -left-20 top-10 h-56 w-56 rounded-full bg-[var(--ct-accent-soft)] blur-3xl" aria-hidden />
      <div className="pointer-events-none fixed -right-16 bottom-24 h-48 w-48 rounded-full bg-[var(--ct-accent-muted)] blur-3xl" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="w-full flex-1 space-y-4">
          <div className="ct-surface overflow-hidden rounded-[1.75rem] border border-[var(--ct-border)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="h-1.5 w-full bg-gradient-to-r from-[var(--ct-accent)] via-[var(--ct-accent-hover)] to-[var(--ct-accent-muted)]" />

            <div className="px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 scale-110 rounded-[1.35rem] bg-[var(--ct-accent-soft)] blur-md" />
                  <div className="relative flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[1.35rem] bg-[var(--ct-bg-soft)] ring-2 ring-[var(--ct-border)] shadow-lg">
                    {photoSrc ? (
                      <>
                        <img
                          src={photoSrc}
                          alt=""
                          className={`h-full w-full object-cover ${avatarLoaded ? 'block' : 'hidden'}`}
                          onLoad={() => setAvatarLoaded(true)}
                        />
                        {!avatarLoaded && (
                          <span className="text-3xl font-bold text-[var(--ct-accent)]">{salonName[0] || '?'}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-[var(--ct-accent)]">{salonName[0] || '?'}</span>
                    )}
                  </div>
                </div>

                <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ct-accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ct-accent)]">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Онлайн-запись
                </p>

                <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-[var(--ct-text)]">
                  {salonName}
                </h1>

                {specialty ? (
                  <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-[var(--ct-text-muted)]">{specialty}</p>
                ) : null}
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--ct-border-soft)] bg-[var(--ct-bg-soft)]/80 px-4 py-3.5 text-center">
                <p className="text-sm font-medium leading-relaxed text-[var(--ct-text)]">
                  Войдите через мессенджер
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ct-text-muted)]">
                  Сохраним записи и пришлём напоминания о визите
                </p>
              </div>

              {hasAnyLink ? (
                <div className="mt-5 flex w-full flex-col gap-3">
                  {telegramBotDeepLink && (
                    <MessengerButton
                      href={telegramBotDeepLink}
                      variant="telegram"
                      label="Telegram"
                      sublabel="Открыть бота и записаться"
                    />
                  )}
                  {maxBotDeepLink && (
                    <MessengerButton
                      href={maxBotDeepLink}
                      variant="max"
                      label="MAX"
                      sublabel="Открыть бота и записаться"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 text-center text-sm leading-relaxed text-amber-950">
                  Запись через мессенджер временно недоступна. Свяжитесь с мастером напрямую.
                </p>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-1">
                <FeatureChip icon={CalendarCheck}>Запись, перенос и отмена визита</FeatureChip>
                <FeatureChip icon={BellRing}>Напоминания перед визитом</FeatureChip>
                <FeatureChip icon={ShieldCheck}>Без пароля — только подтверждение в боте</FeatureChip>
              </div>
            </div>
          </div>

          <ClientPublicSeoBlock
            master={master}
            priceList={priceList}
            reviewSummary={reviewSummary}
            variant="card"
          />
        </div>

        <p className="mt-8 text-center text-xs text-[var(--ct-text-muted)]">
          Сервис <BrandName className="text-[var(--ct-accent)]" tldClassName="text-[var(--ct-text-muted)]" />
        </p>
      </div>
    </div>
  );
}
