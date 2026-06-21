import { Link, useLocation, useNavigate } from 'react-router-dom';
import { scrollToSection } from '../../lib/scrollToSection';
import {
  BarChart3,
  BellRing,
  CalendarClock,
  CalendarRange,
  Images,
  MapPinned,
  Megaphone,
  Tags
} from 'lucide-react';
import Button from '../ui/Button';

const iconStroke = { strokeWidth: 1.75 };

const FEATURES = [
  {
    Icon: CalendarClock,
    tag: 'Запись',
    title: 'Автоматическая запись клиентов',
    description:
      'Клиент сам выбирает услугу, дату и время на вашей странице — без звонков и переписки. Запись подтверждается в MAX или Telegram, попадает в ваш кабинет. Можно добавить запись вручную.',
    points: ['Работает 24/7', 'Одна ссылка для всех каналов', 'Запись в пару кликов'],
    theme: {
      card: 'border-violet-200/70 bg-gradient-to-br from-violet-100 via-white to-indigo-50/80',
      hover: 'hover:border-violet-300 hover:shadow-xl hover:shadow-violet-200/40',
      icon: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-300/50',
      tag: 'bg-violet-600/10 text-violet-800 ring-1 ring-violet-200/80',
      bullet: 'bg-violet-500',
      divider: 'border-violet-100/90',
      title: 'text-violet-950',
      glow: 'bg-violet-400'
    }
  },
  {
    Icon: Images,
    tag: 'Витрина',
    title: 'Портфолио работ',
    description:
      'Загружайте фото лучших работ — клиенты видят их на странице записи ещё до визита. Так проще доверять мастеру и чаще записываться.',
    points: ['Галерея на странице мастера', 'Повышает доверие', 'Обновляется в кабинете'],
    theme: {
      card: 'border-rose-200/70 bg-gradient-to-br from-rose-100 via-white to-pink-50/80',
      hover: 'hover:border-rose-300 hover:shadow-xl hover:shadow-rose-200/40',
      icon: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-300/50',
      tag: 'bg-rose-600/10 text-rose-800 ring-1 ring-rose-200/80',
      bullet: 'bg-rose-500',
      divider: 'border-rose-100/90',
      title: 'text-rose-950',
      glow: 'bg-rose-400'
    }
  },
  {
    Icon: Tags,
    tag: 'Витрина',
    title: 'Прайс-лист с услугами',
    description:
      'Услуги с названием, ценой, длительностью и фото. Клиент сразу понимает, сколько стоит визит и что входит — меньше вопросов в чате.',
    points: ['Фото и цены у каждой услуги', 'Удобно на телефоне', 'Редактирование за минуты'],
    theme: {
      card: 'border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-100 via-white to-purple-50/80',
      hover: 'hover:border-fuchsia-300 hover:shadow-xl hover:shadow-fuchsia-200/40',
      icon: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-300/50',
      tag: 'bg-fuchsia-600/10 text-fuchsia-800 ring-1 ring-fuchsia-200/80',
      bullet: 'bg-fuchsia-500',
      divider: 'border-fuchsia-100/90',
      title: 'text-fuchsia-950',
      glow: 'bg-fuchsia-400'
    }
  },
  {
    Icon: MapPinned,
    tag: 'Локация',
    title: 'Адрес и карта',
    description:
      'Укажите адрес салона или студии — на странице записи отобразится карта. Клиенту проще найти вас; для выезда на дом можно описать зону работы.',
    points: ['Карта на странице клиента', 'Адрес в один клик', 'Подходит салону и выезду'],
    theme: {
      card: 'border-sky-200/70 bg-gradient-to-br from-sky-100 via-white to-blue-50/80',
      hover: 'hover:border-sky-300 hover:shadow-xl hover:shadow-sky-200/40',
      icon: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-300/50',
      tag: 'bg-sky-600/10 text-sky-800 ring-1 ring-sky-200/80',
      bullet: 'bg-sky-500',
      divider: 'border-sky-100/90',
      title: 'text-sky-950',
      glow: 'bg-sky-400'
    }
  },
  {
    Icon: Megaphone,
    tag: 'Связь',
    title: 'Рассылка по клиентской базе',
    description:
      'Отправьте сообщение всем клиентам или выбранным — акция, новое время, напоминание об открытых слотах. Рассылка уходит в MAX и Telegram из кабинета.',
    points: ['Вся база в одном месте', 'MAX и Telegram', 'Экономия времени'],
    theme: {
      card: 'border-cyan-200/70 bg-gradient-to-br from-cyan-100 via-white to-teal-50/80',
      hover: 'hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-200/40',
      icon: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-300/50',
      tag: 'bg-cyan-600/10 text-cyan-900 ring-1 ring-cyan-200/80',
      bullet: 'bg-cyan-500',
      divider: 'border-cyan-100/90',
      title: 'text-cyan-950',
      glow: 'bg-cyan-400'
    }
  },
  {
    Icon: BellRing,
    tag: 'Автоматизация',
    title: 'Напоминания клиентам',
    description:
      'Система сама напомнит о записи за 1 день и за 3 часа до визита — в мессенджер. Меньше неявок и забытых визитов, меньше ручных «напомните, пожалуйста».',
    points: ['За 24 часа до записи', 'За 3 часа до записи', 'Автоматически в боте'],
    theme: {
      card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-100 via-white to-green-50/80',
      hover: 'hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-200/40',
      icon: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-300/50',
      tag: 'bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-200/80',
      bullet: 'bg-emerald-500',
      divider: 'border-emerald-100/90',
      title: 'text-emerald-950',
      glow: 'bg-emerald-400'
    }
  },
  {
    Icon: BarChart3,
    tag: 'Рост',
    title: 'Аналитика для мастера',
    description:
      'Смотрите записи, выручку, динамику и загрузку в кабинете. Понятные цифры помогают планировать график, цены и рекламу без таблиц в блокноте.',
    points: ['Выручка и записи', 'Статистика по периодам', 'Всё в одном дашборде'],
    theme: {
      card: 'border-amber-200/70 bg-gradient-to-br from-amber-100 via-white to-orange-50/80',
      hover: 'hover:border-amber-300 hover:shadow-xl hover:shadow-amber-200/40',
      icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-300/50',
      tag: 'bg-amber-600/10 text-amber-900 ring-1 ring-amber-200/80',
      bullet: 'bg-amber-500',
      divider: 'border-amber-100/90',
      title: 'text-amber-950',
      glow: 'bg-amber-400'
    }
  },
  {
    Icon: CalendarRange,
    tag: 'Расписание',
    title: 'Календарь: дни, выходные, праздники',
    description:
      'Настройте рабочие часы по дням недели, отметьте выходные и праздники, добавьте исключения. Клиенты видят только свободные слоты — вы не получаете запись «в закрытое» время.',
    points: ['График по дням недели', 'Выходные и праздники', 'Исключения в один клик'],
    theme: {
      card: 'border-indigo-200/70 bg-gradient-to-br from-indigo-100 via-white to-violet-50/80',
      hover: 'hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-200/40',
      icon: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-300/50',
      tag: 'bg-indigo-600/10 text-indigo-800 ring-1 ring-indigo-200/80',
      bullet: 'bg-indigo-500',
      divider: 'border-indigo-100/90',
      title: 'text-indigo-950',
      glow: 'bg-indigo-400'
    }
  }
];

export default function FeaturesSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const goToPricing = () => {
    if (location.pathname === '/') scrollToSection('pricing');
    else navigate('/', { state: { scrollTo: 'pricing' } });
  };

  return (
    <section
      id="features"
      className="scroll-mt-24 border-t border-violet-100/80 bg-white px-4 py-16 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black leading-tight text-[#2b2b2b] sm:text-4xl lg:text-[2.5rem]">
            Всё, что нужно мастеру в одном сервисе
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-5">
          {FEATURES.map(({ Icon, tag, title, theme }) => (
            <article
              key={title}
              className={`group flex flex-col items-start gap-3 rounded-2xl border p-4 transition-all duration-300 sm:p-5 ${theme.card} ${theme.hover}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 [&_svg]:h-5 [&_svg]:w-5 ${theme.icon}`}
                >
                  <Icon {...iconStroke} />
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${theme.tag}`}
                >
                  {tag}
                </span>
              </div>

              <h3 className={`text-base font-bold leading-snug ${theme.title}`}>{title}</h3>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-[1.75rem] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-6 py-8 text-center sm:px-10 sm:py-10">
          <p className="text-lg font-bold text-[#2b2b2b] sm:text-xl">
            Все эти функции включены — платите только за записи или безлимит
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
            Нет скрытых модулей и доплат за портфолио, аналитику или напоминания.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="min-w-[220px] shadow-lg shadow-primary/25">
                Попробовать бесплатно
              </Button>
            </Link>
            <Button variant="secondary" size="lg" type="button" onClick={goToPricing}>
              Смотреть тарифы
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
