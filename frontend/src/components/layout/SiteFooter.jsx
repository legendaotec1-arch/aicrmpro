import { Link } from 'react-router-dom';
import {
  Clock,
  Cloud,
  Mail,
  MonitorSmartphone,
  ShieldCheck
} from 'lucide-react';
import Logo from '../brand/Logo';
import BrandName from '../brand/BrandName';
import ScrollToSectionLink from './ScrollToSectionLink';
import { SITE_LEGAL } from '../../config/siteLegal';

const TRUST = [
  { Icon: MonitorSmartphone, label: 'Без установки' },
  { Icon: Clock, label: 'Доступ 24/7' },
  { Icon: ShieldCheck, label: 'Защита данных' },
  { Icon: Cloud, label: 'Облако в РФ' }
];

const LEGAL_LINKS = [
  { to: '/legal/offer', label: 'Договор оферты' },
  { to: '/legal/privacy', label: 'Персональные данные' },
  { to: '/legal/payment', label: 'Оплата и возврат' }
];

const PRODUCT_LINKS = [
  { type: 'section', sectionId: 'features', label: 'Функционал' },
  { type: 'section', sectionId: 'pricing', label: 'Тарифы' },
  { type: 'route', to: '/register', label: 'Регистрация' },
  { type: 'route', to: '/login', label: 'Вход в кабинет' }
];

export default function SiteFooter({ compact = false }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-14">
        {!compact && (
          <>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Link to="/">
                  <Logo light />
                </Link>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                  CRM и онлайн-запись для мастеров: Telegram, MAX, соцсети. Платите за результат, а не за подписку.
                </p>
                <a
                  href={`mailto:${SITE_LEGAL.supportEmail}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-white transition"
                >
                  <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {SITE_LEGAL.supportEmail}
                </a>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Сервис</p>
                <ul className="mt-4 space-y-2.5">
                  {PRODUCT_LINKS.map((item) => (
                    <li key={item.label}>
                      {item.type === 'section' ? (
                        <ScrollToSectionLink
                          sectionId={item.sectionId}
                          className="text-sm text-slate-300 hover:text-white transition"
                        >
                          {item.label}
                        </ScrollToSectionLink>
                      ) : (
                        <Link to={item.to} className="text-sm text-slate-300 hover:text-white transition">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Документы</p>
                <ul className="mt-4 space-y-2.5">
                  {LEGAL_LINKS.map(({ to, label }) => (
                    <li key={to}>
                      <Link to={to} className="text-sm text-slate-300 hover:text-white transition">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Надёжность</p>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {TRUST.map(({ Icon, label }) => (
                    <li key={label} className="flex items-center gap-2 text-xs text-slate-400">
                      <Icon className="h-4 w-4 shrink-0 text-violet-400" strokeWidth={1.75} />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-800 pt-8">
              <p className="text-xs leading-relaxed text-slate-500">
                Используя сервис <BrandName className="text-slate-400" tldClassName="text-white" />, вы подтверждаете ознакомление с{' '}
                <Link to="/legal/offer" className="text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline">
                  договором оферты
                </Link>
                ,{' '}
                <Link to="/legal/privacy" className="text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline">
                  политикой обработки персональных данных
                </Link>{' '}
                и{' '}
                <Link to="/legal/payment" className="text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline">
                  условиями оплаты и возврата
                </Link>
                . Сервис предназначен для самозанятых, ИП и юридических лиц, оказывающих услуги клиентам (B2B).
              </p>
              <p className="mt-4 text-xs leading-relaxed text-slate-500" data-nosnippet>
                <span className="font-semibold text-slate-400">* </span>
                {SITE_LEGAL.instagramFooterNote}{' '}
                <Link to="/legal/privacy" className="text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline">
                  Подробнее
                </Link>
              </p>
            </div>
          </>
        )}

        {compact && (
          <p className="mb-6 text-xs leading-relaxed text-slate-500" data-nosnippet>
            <span className="font-semibold text-slate-400">* </span>
            {SITE_LEGAL.instagramFooterNote}
          </p>
        )}

        <div
          className={`flex flex-col gap-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between ${
            compact ? '' : 'mt-8 border-t border-slate-800 pt-8'
          }`}
        >
          <div className="space-y-1">
            <p>
              © {year} <BrandName className="text-slate-400" tldClassName="text-white" />
            </p>
            <p className="text-slate-500">{SITE_LEGAL.footerRequisites}</p>
            <p className="text-slate-500">Адрес: {SITE_LEGAL.legalAddress}</p>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {LEGAL_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} className="hover:text-slate-300 transition">
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
