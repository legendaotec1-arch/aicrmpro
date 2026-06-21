import { Link } from 'react-router-dom';
import { Check, Crown, Infinity, Wallet } from 'lucide-react';
import Button from '../ui/Button';

const PLANS = [
  {
    id: 'per-booking',
    badge: 'Старт без риска',
    title: 'За запись',
    price: '20 ₽',
    period: 'за каждую запись — онлайн или в кабинете',
    description:
      'Идеально, чтобы попробовать без обязательств. Подписки нет — платите только когда создаёте записи.',
    highlights: [
      'Абонентская плата — 0 ₽',
      '20 ₽ за каждую запись — по ссылке или вручную в кабинете',
      'На тарифе «Безлимит» — записи без списаний'
    ],
    Icon: Wallet,
    accent: 'border-slate-200 bg-white',
    iconVariant: 'soft'
  },
  {
    id: 'unlimited',
    badge: 'Популярный выбор',
    title: 'Безлимит',
    price: '900 ₽',
    period: 'на 30 дней · записей без ограничений',
    description:
      'Один платёж — и вы спокойно принимаете любой поток клиентов. Выгодно при большом потоке записей. Подключите до 10 мастеров в одном кабинете.',
    highlights: [
      'Неограниченное число записей',
      'До 10 мастеров в кабинете',
      'Автопродление каждые 30 дней (отключение в кабинете)',
      'Все функции системы включены'
    ],
    Icon: Infinity,
    accent: 'border-primary/40 bg-gradient-to-b from-violet-50 to-white ring-2 ring-primary/20',
    iconVariant: 'gradient',
    featured: true
  }
];

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-16 lg:px-8 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-[#2b2b2b] sm:text-4xl lg:text-[2.5rem] leading-tight">
            Простые тарифы
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-[1.75rem] border p-6 sm:p-8 shadow-lg shadow-violet-100/50 ${plan.accent}`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-bold text-white shadow-md">
                  <Crown className="h-3.5 w-3.5" strokeWidth={2} />
                  {plan.badge}
                </span>
              )}
              {!plan.featured && (
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 mb-4">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    plan.iconVariant === 'gradient'
                      ? 'bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-lg shadow-primary/25'
                      : 'bg-violet-50 text-[#2b2b2b]'
                  }`}
                >
                  <plan.Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.title}</h3>
                  <p className="mt-3">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{plan.period}</p>
                </div>
              </div>

              <p className="mt-5 text-sm text-slate-600 leading-relaxed">{plan.description}</p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button
                  className="w-full"
                  variant={plan.featured ? 'primary' : 'secondary'}
                  size="lg"
                >
                  {plan.featured ? 'Подключить безлимит' : 'Начать бесплатно'}
                </Button>
              </Link>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
