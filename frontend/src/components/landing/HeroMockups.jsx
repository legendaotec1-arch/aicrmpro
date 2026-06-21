import { Star } from 'lucide-react';
import { PHONE_MOCKUP_IMAGES } from '../../config/landingMasters';

function DashboardMockup() {
  const menu = [
    'Главная',
    'Клиенты',
    'Записи',
    'Услуги',
    'Портфолио',
    'Отзывы',
    'Аналитика',
    'Финансы',
    'Настройки'
  ];

  const stats = [
    { label: 'Записи сегодня', value: '12', trend: '+8%' },
    { label: 'Клиенты', value: '248', trend: '' },
    { label: 'Выручка', value: '125 430 ₽', trend: '' },
    { label: 'Рейтинг', value: '4.9', trend: '' }
  ];

  const rows = [
    { time: '10:00', name: 'Анна И.', service: 'Маникюр', status: 'Подтверждено', ok: true },
    { time: '12:30', name: 'Мария К.', service: 'Педикюр', status: 'Ожидание', ok: false },
    { time: '15:00', name: 'Елена С.', service: 'Гель-лак', status: 'Подтверждено', ok: true }
  ];

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_32px_64px_-12px_rgba(99,102,241,0.25)] sm:rounded-[24px]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-auto truncate text-[10px] text-slate-400 sm:text-[11px]">Wonder.ru · кабинет</span>
      </div>

      <div className="grid min-h-[260px] grid-cols-[minmax(72px,88px)_1fr] sm:min-h-[280px] sm:grid-cols-[110px_1fr] md:min-h-[300px] md:grid-cols-[130px_1fr] lg:grid-cols-[140px_1fr]">
        <aside className="bg-[#0f172a] p-2 sm:p-3">
          <p className="mb-2 text-[9px] font-bold text-white sm:mb-4 sm:text-xs">
            Master<span className="text-violet-400">Client45</span>
          </p>
          <nav className="space-y-0.5">
            {menu.map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-1.5 py-1 text-[8px] sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-[10px] ${
                  i === 0 ? 'bg-primary font-semibold text-white' : 'text-slate-500'
                }`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 bg-slate-50/80 p-2 sm:p-3">
          <p className="mb-2 text-[10px] font-bold text-slate-800 sm:text-xs">Главная</p>
          <div className="mb-2 grid grid-cols-2 gap-1 sm:mb-3 sm:gap-1.5 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-sm sm:p-2">
                <p className="text-[8px] leading-tight text-slate-500 sm:text-[9px]">{s.label}</p>
                <p className="flex items-center gap-0.5 text-[9px] font-bold text-slate-900 sm:text-[11px]">
                  <span className="truncate">{s.value}</span>
                  {s.label === 'Рейтинг' && (
                    <Star className="h-2 w-2 shrink-0 fill-amber-400 text-amber-400 sm:h-2.5 sm:w-2.5" strokeWidth={0} />
                  )}
                </p>
                {s.trend && <p className="text-[8px] font-medium text-emerald-500 sm:text-[9px]">{s.trend}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
            <div className="rounded-lg border border-slate-100 bg-white p-1.5 sm:p-2">
              <p className="mb-1 text-[9px] font-semibold text-slate-700 sm:mb-1.5 sm:text-[10px]">Расписание на сегодня</p>
              <div className="space-y-0.5 sm:space-y-1">
                {rows.map((r) => (
                  <div
                    key={r.time}
                    className="flex items-center justify-between gap-0.5 rounded-md bg-slate-50 px-1 py-0.5 text-[8px] sm:gap-1 sm:px-1.5 sm:py-1 sm:text-[9px]"
                  >
                    <span className="shrink-0 text-slate-400">{r.time}</span>
                    <span className="min-w-0 truncate font-medium text-slate-800">{r.name}</span>
                    <span
                      className={`hidden shrink-0 rounded px-1 py-0.5 text-[7px] min-[400px]:inline sm:text-[8px] ${
                        r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden rounded-lg border border-slate-100 bg-white p-1.5 sm:block sm:p-2">
              <p className="mb-1.5 text-[10px] font-semibold text-slate-700">Активность за неделю</p>
              <div className="flex h-16 items-end gap-1 sm:h-20">
                {[35, 50, 45, 70, 55, 80, 65].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-violet-600 to-violet-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** iPhone 17 Pro Max — Cosmic Orange, компактный мокап */
function PhoneMockup() {
  const services = [
    { name: 'Маникюр', price: '1 200 ₽' },
    { name: 'Педикюр', price: '1 800 ₽' }
  ];

  return (
    <div
      className="relative shrink-0 w-[148px] sm:w-[156px]"
      style={{ aspectRatio: '9 / 19.5' }}
      aria-hidden
    >
      {/* Боковые кнопки */}
      <span className="absolute -left-[2px] top-[72px] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-orange-300 to-orange-600" />
      <span className="absolute -left-[2px] top-[108px] h-11 w-[3px] rounded-l-sm bg-gradient-to-b from-orange-300 to-orange-600" />
      <span className="absolute -right-[2px] top-[88px] h-14 w-[3px] rounded-r-sm bg-gradient-to-b from-orange-300 to-orange-600" />

      {/* Корпус Cosmic Orange */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#ffb07a] via-[#f77e2d] to-[#c45112] p-[5px] shadow-[0_16px_40px_-8px_rgba(247,126,45,0.55),0_4px_12px_rgba(0,0,0,0.12)] sm:rounded-[2.125rem] sm:p-[5.5px]">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.65rem] bg-black sm:rounded-[1.75rem]">
          {/* Dynamic Island + статус-бар */}
          <div className="relative shrink-0 bg-white pt-1.5 pb-1">
            <div className="mx-auto h-[11px] w-[46px] rounded-full bg-black shadow-inner" />
            <div className="mt-1 flex items-center justify-between px-3 text-[7px] font-semibold text-slate-800">
              <span>9:41</span>
              <div className="flex items-center gap-0.5">
                <span className="h-1.5 w-2.5 rounded-sm bg-slate-800" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
              </div>
            </div>
          </div>

          {/* Экран приложения */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="shrink-0 border-b border-slate-100 px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold text-slate-900 leading-tight">Beauty Studio</p>
              <div className="mt-0.5 flex items-center justify-center gap-px">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" strokeWidth={0} />
                ))}
                <span className="ml-0.5 text-[7px] font-medium text-slate-500">4.9</span>
              </div>
            </div>

            <div className="relative h-[52px] shrink-0 overflow-hidden">
              <img
                src={PHONE_MOCKUP_IMAGES.cover}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <p className="absolute bottom-1 left-2 text-[7px] font-semibold text-white">Маникюр</p>
            </div>

            <div className="shrink-0 border-b border-slate-50 px-2 py-1.5">
              <div className="grid grid-cols-3 gap-1">
                {PHONE_MOCKUP_IMAGES.portfolio.map((src) => (
                  <div key={src} className="aspect-square overflow-hidden rounded-md bg-slate-100">
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-2 py-1.5">
              <div className="mb-1 flex gap-0.5">
                {['Маникюр', 'Педикюр'].map((tab, i) => (
                  <span
                    key={tab}
                    className={`rounded-full px-1.5 py-px text-[6px] font-medium ${
                      i === 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>

              <div className="space-y-0.5">
                {services.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-1 text-[7px]"
                  >
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className="font-bold text-primary">{s.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-0.5">
                {['11:00', '12:30'].map((t, i) => (
                  <div
                    key={t}
                    className={`rounded py-0.5 text-center text-[7px] font-medium ${
                      i === 0 ? 'bg-primary text-white' : 'border border-slate-200 text-slate-600'
                    }`}
                  >
                    {t}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-auto w-full rounded-lg bg-primary py-1.5 text-[8px] font-bold text-white shadow-md shadow-primary/25"
              >
                Записаться
              </button>
            </div>
          </div>

          {/* Home indicator */}
          <div className="shrink-0 bg-white pb-1 pt-0.5">
            <div className="mx-auto h-[3px] w-10 rounded-full bg-slate-900/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroMockups() {
  return (
    <div className="w-full min-w-0 lg:max-w-[600px] xl:max-w-[640px] lg:ml-auto">
      {/* Телефон наезжает на дашборд (как на макете); на узком экране — компактнее */}
      <div className="relative w-full min-h-[300px] pt-1 sm:min-h-[320px] sm:pt-3 md:min-h-[340px]">
        <div className="absolute bottom-0 left-0 z-20 drop-shadow-2xl">
          <PhoneMockup />
        </div>
        <div className="relative z-10 min-w-0 pb-1 pl-[92px] sm:pl-[100px] md:pl-[108px] lg:pl-[112px]">
          <DashboardMockup />
        </div>
      </div>

    </div>
  );
}
