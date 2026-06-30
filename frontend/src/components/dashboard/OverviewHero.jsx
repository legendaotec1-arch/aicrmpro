import { mediaUrl } from '../../lib/media';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function todayLabel() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function recordsLabel(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'записей';
  if (mod10 === 1) return 'запись';
  if (mod10 >= 2 && mod10 <= 4) return 'записи';
  return 'записей';
}

export default function OverviewHero({ profile, todayCount = 0 }) {
  const displayName = profile?.salon_name || profile?.name || 'Мастер';
  const avatarLetter = (profile?.name?.[0] || 'М').toUpperCase();
  const avatarSrc = profile?.logo_url ? mediaUrl(profile.logo_url) : null;

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 py-5 text-white shadow-xl shadow-violet-500/25 sm:px-5 sm:py-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-2 ring-white/25 shadow-lg">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold">{avatarLetter}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{greeting()}</p>
          <h1 className="mt-1 font-display text-[1.35rem] font-bold leading-tight sm:text-2xl">{displayName}</h1>
          <p className="mt-1.5 text-sm capitalize text-white/75">{todayLabel()}</p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">Сегодня</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{todayCount}</p>
          <p className="text-[11px] text-white/70">{recordsLabel(todayCount)}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">Кабинет</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">Онлайн-запись и клиенты</p>
          <p className="text-[11px] text-white/70">Woner.ru</p>
        </div>
      </div>
    </section>
  );
}
