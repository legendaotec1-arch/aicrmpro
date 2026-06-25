import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { scrollToSection } from '../lib/scrollToSection';
import {
  Building2,
  Calendar,
  Check,
  Ellipsis,
  Images,
  Link2
} from 'lucide-react';
import { LANDING_MASTERS } from '../config/landingMasters';
import BrandName from '../components/brand/BrandName';
import Button from '../components/ui/Button';
import IconBox from '../components/ui/IconBox';
import HeroMockups from '../components/landing/HeroMockups';
import PricingSection from '../components/landing/PricingSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader, { SITE_HEADER_OFFSET } from '../components/layout/SiteHeader';
import SeoHead from '../seo/SeoHead';

const HOME_SEO = {
  title: 'Woner.ru — онлайн-запись и CRM для мастеров',
  description:
    'Woner.ru — сервис онлайн-записи для мастеров и салонов. Расписание, клиенты, прайс, портфолио и рассылки в MAX и Telegram. Начните бесплатно.',
  canonical: 'https://woner.ru/',
};

const iconStroke = { strokeWidth: 1.75 };

const STEPS = [
  { Icon: Building2, text: 'Мастер создаёт свою компанию. Добавляет фото, описание, услуги, прайс и портфолио.' },
  { Icon: Link2, text: 'Получает одну ссылку для Telegram, MAX, ВКонтакте и Instagram* — и делится ею с клиентами.' },
  { Icon: Calendar, text: 'Клиент выбирает дату и время. И записывается на услугу или вызывает мастера на дом.' },
  { Icon: Images, text: 'Клиент изучает. Портфолио, прайс-листы, услуги и отзывы о мастере.' }
];

const BENEFITS = [
  'Удобно для мастеров',
  'Просто для клиентов',
  'Больше записей и прибыли',
  'Автоматизация и аналитика',
  'Работает в Telegram, MAX, ВК и Instagram*'
];

export default function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    const fromHash = location.hash?.replace('#', '');
    const fromState = location.state?.scrollTo;
    const sectionId = fromHash || fromState;
    if (!sectionId) return;

    const timer = window.setTimeout(() => scrollToSection(sectionId), 50);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash, location.state]);

  return (
    <div className="min-h-screen bg-white text-ink">
      <SeoHead {...HOME_SEO} />
      <SiteHeader />

      <main className={SITE_HEADER_OFFSET}>
        <section className="relative px-4 pt-6 pb-10 sm:pt-8 sm:pb-12 lg:px-8 lg:pt-12 lg:pb-24 overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F0F0F0] via-[#FFFFFF] to-[#F0F0F0]" />
          <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-14">
              <div className="flex flex-col justify-center pt-0 sm:pt-2">
                <h1 className="text-[2rem] font-black leading-[1.12] tracking-tight text-[#2b2b2b] sm:text-5xl lg:text-[3.15rem]">
                  Сервис онлайн записи клиентов
                </h1>

                <p className="mt-3 text-lg font-semibold text-[#2b2b2b] sm:text-xl">
                  <BrandName className="text-primary" /> — больше чем бизнес
                </p>

                <p className="mt-3 mb-6 max-w-lg text-base text-slate-600 leading-relaxed sm:text-lg">
                  Онлайн-запись, база клиентов, расписание, прайс, портфолио и рассылки в MAX и Telegram — без лишних
                  сервисов.
                </p>




              </div>

              <div className="flex flex-col items-center sm:items-end lg:pt-8 lg:pl-4">
                <HeroMockups />
                <div className="mt-10 flex flex-wrap gap-3 sm:mt-12">
                  <Link to="/register">
                    <Button size="lg" className="min-w-[200px] shadow-lg shadow-primary/25">
                      Начать бесплатно
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="secondary" size="lg">
                      Войти в кабинет
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FeaturesSection />

        <section className="bg-white px-4 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black text-[#2b2b2b] sm:text-4xl">Как это работает?</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Четыре шага — от настройки профиля до первой записи клиента
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 items-stretch gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              {STEPS.map(({ Icon, text }, i) => (
                <article
                  key={text}
                  className="flex h-full flex-col rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5 text-center shadow-sm sm:p-6 sm:text-left"
                >
                  <div className="mb-4 flex flex-col items-center gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                    <IconBox size="lg" variant="gradient" className="shrink-0">
                      <Icon {...iconStroke} />
                    </IconBox>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                      {i + 1}
                    </span>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="mx-4 mb-16 lg:mx-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#0f172a] px-6 py-12 text-white lg:px-14 lg:py-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-black text-white sm:text-4xl">Для любых мастеров</h2>
                <div className="mt-8 flex flex-wrap gap-4 sm:gap-5">
                  {LANDING_MASTERS.map(({ id, label, image, ringClass }) => (
                    <div key={id} className="flex w-[88px] flex-col items-center sm:w-[96px]">
                      <div
                        className={`relative h-[72px] w-[72px] overflow-hidden rounded-full ring-4 ring-white/15 sm:h-[76px] sm:w-[76px] ${ringClass}`}
                      >
                        <img
                          src={image}
                          alt={label}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          width={76}
                          height={76}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] leading-tight text-slate-300 sm:text-[11px]">{label}</p>
                    </div>
                  ))}
                  <div className="flex w-[88px] flex-col items-center sm:w-[96px]">
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-slate-700 ring-4 ring-white/10 sm:h-[76px] sm:w-[76px]">
                      <Ellipsis className="h-8 w-8 text-slate-300" strokeWidth={1.75} />
                    </div>
                    <p className="mt-2 text-center text-[10px] text-slate-300 sm:text-[11px]">И любые другие</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-4">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-base sm:text-lg">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
