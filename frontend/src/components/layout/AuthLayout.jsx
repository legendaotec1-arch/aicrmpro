import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import BrandName from '../brand/BrandName';
import { SITE_LEGAL } from '../../config/siteLegal';

const HERO = {
  master: {
    title: (
      <>
        Управляйте
        <br />
        <span className="text-white">записями</span>
        <br />
        как профи
      </>
    ),
    subtitle:
      'Кабинет мастера и страница записи. Одна ссылка — Telegram, MAX, ВКонтакте, Instagram*.',
  },
  partner: {
    title: (
      <>
        Платформа,
        <br />
        <span className="text-white">которая зарабатывает</span>
        <br />
        вместе с тобой
      </>
    ),
    subtitle:
      'Партнёрская программа Woner: делитесь ссылкой, приводите мастеров — получайте 30% с их пополнений и подписки. Мы развиваем продукт, вы строите доход без потолка.',
  },
};

export default function AuthLayout({ children, title, subtitle, variant = 'master' }) {
  const hero = HERO[variant] || HERO.master;

  return (
    <div className="min-h-[100dvh] flex overflow-y-auto bg-[#6A5ACD]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <Logo light />
        <div>
          <h2 className="text-4xl font-black text-white leading-tight">{hero.title}</h2>
          <p className="mt-4 text-white/70 max-w-sm">{hero.subtitle}</p>
        </div>
        <div className="text-xs text-white/40 space-y-2">
          <p className="text-white/40">© <BrandName light className="text-white/40" /></p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <Link to="/legal/offer" className="hover:text-white/70 transition">
              Оферта
            </Link>
            <Link to="/legal/privacy" className="hover:text-white/70 transition">
              Политика ПДн
            </Link>
            <Link to="/legal/personal-data-consent" className="hover:text-white/70 transition">
              Согласие на ПДн
            </Link>
            <Link to="/legal/payment" className="hover:text-white/70 transition">
              Оплата и возврат
            </Link>
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 py-8 sm:items-center sm:p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo light />
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-elevated border border-white/10">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl font-bold text-[#2b2b2b]">{title}</h1>
              <p className="mt-1 text-[#6b7579] text-sm">{subtitle}</p>
            </div>
            {children}
          </div>
          <p className="mt-6 text-center">
            <Link to="/" className="text-sm text-white/60 hover:text-white transition">
              ← На главную
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
