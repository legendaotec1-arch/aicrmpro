import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Rss } from 'lucide-react';
import api from '../lib/http';
import SeoHead from '../seo/SeoHead';
import SiteHeader, { SITE_HEADER_OFFSET } from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

function CopyButton({ text, label = 'Копировать' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
    >
      <Copy size={14} />
      {copied ? 'Скопировано' : label}
    </button>
  );
}

export default function PressPage({ mode = 'press' }) {
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPartners = mode === 'partners';

  useEffect(() => {
    api.get('/seo/press')
      .then((res) => setKit(res.data))
      .catch(() => setKit(null))
      .finally(() => setLoading(false));
  }, []);

  const title = isPartners ? 'Партнёрская программа' : 'Пресс-кит';
  const h1 = isPartners
    ? 'Партнёрская программа Woner.ru'
    : 'Пресс-кит и материалы для публикаций';

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader showCta={false} />
        <div className={SITE_HEADER_OFFSET}>
          <PageLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <SeoHead
        title={isPartners ? 'Партнёрская программа Woner.ru' : 'Пресс-кит Woner.ru — материалы для СМИ'}
        description={
          isPartners
            ? 'Готовые ссылки с UTM для блогов партнёров, школ и салонов.'
            : 'Логотипы, описание, RSS для Дзена, гайды для VC.ru и Habr.'
        }
        canonical={isPartners ? '/partners' : '/press'}
      />
      <SiteHeader
        showCta={false}
        backLink={
          <Link to="/" className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap">
            ← На главную
          </Link>
        }
      />

      <main className={`${SITE_HEADER_OFFSET} px-4 pb-10 lg:px-8 lg:pb-14`}>
        <div className="mx-auto max-w-4xl pt-2 sm:pt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              to="/press"
              className={`rounded-full px-4 py-1.5 font-semibold ${
                !isPartners ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Пресс-кит
            </Link>
            <Link
              to="/partners"
              className={`rounded-full px-4 py-1.5 font-semibold ${
                isPartners ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Партнёрам
            </Link>
          </div>

          <h1 className="mt-6 text-3xl font-black text-slate-900 sm:text-4xl">{h1}</h1>
          <p className="mt-4 text-lg text-slate-600">{kit?.tagline || kit?.shortDescription}</p>

          {!isPartners && kit ? (
            <section className="mt-10 space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-bold text-slate-900">Описание для публикаций</h2>
                <p className="mt-3 text-slate-700 leading-relaxed">{kit.boilerplate}</p>
                <div className="mt-4">
                  <CopyButton text={kit.boilerplate} label="Копировать текст" />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-6">
                  <h2 className="font-bold text-slate-900">Логотип</h2>
                  <img
                    src={kit.logoUrl}
                    alt="Woner.ru"
                    className="mt-4 h-24 w-24 rounded-2xl shadow-sm"
                  />
                  <a
                    href={kit.logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline"
                  >
                    Скачать PNG <ExternalLink size={14} />
                  </a>
                </div>
                <div className="rounded-2xl border border-slate-200 p-6">
                  <h2 className="font-bold text-slate-900">RSS для Дзена</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Подключите импорт статей блога в Яндекс Дзен.
                  </p>
                  <code className="mt-3 block break-all rounded-lg bg-slate-100 px-3 py-2 text-xs">
                    {kit.rssFeedUrl}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton text={kit.rssFeedUrl} />
                    <a
                      href={kit.rssFeedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      <Rss size={14} /> Открыть feed
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900">Синдикация контента</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {Object.entries(kit.syndication || {}).map(([key, block]) => (
                    <div key={key} className="rounded-xl bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-800">{block.title}</h3>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-600">
                        {block.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900">Ключевые страницы для ссылок</h2>
                <ul className="mt-4 space-y-2">
                  {(kit.keyPages || []).map((page) => (
                    <li key={page.path}>
                      <a
                        href={`${kit.siteUrl}${page.path}`}
                        className="text-violet-600 hover:underline"
                      >
                        {page.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-slate-500">
                Пресс-запросы:{' '}
                <a href={`mailto:${kit.contacts?.pressEmail}`} className="text-violet-600 hover:underline">
                  {kit.contacts?.pressEmail}
                </a>
              </p>
            </section>
          ) : null}

          {isPartners && kit ? (
            <section className="mt-10 space-y-8">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6">
                <h2 className="text-lg font-bold text-slate-900">Как это работает</h2>
                <p className="mt-3 text-slate-700 leading-relaxed">
                  Разместите ссылку на Woner в блоге, на сайте школы или в материалах для мастеров.
                  Используйте готовые UTM-ссылки — мы отслеживаем переходы и конверсии в регистрацию.
                </p>
                <Link to="/register" className="mt-4 inline-block">
                  <Button>Стать партнёром — зарегистрироваться</Button>
                </Link>
                <p className="mt-4 text-sm">
                  Уже партнёр?{' '}
                  <Link to="/partner/login" className="font-semibold text-violet-600 hover:underline">
                    Войти в кабинет
                  </Link>
                  {' · '}
                  <Link to="/partner/register" className="font-semibold text-violet-600 hover:underline">
                    Регистрация
                  </Link>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900">Готовые ссылки с UTM</h2>
                <ul className="mt-4 space-y-4">
                  {(kit.partnerLinks || []).map((link) => (
                    <li key={link.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-800">{link.label}</p>
                      <p className="mt-1 text-sm text-slate-500">Анкор: «{link.anchor}»</p>
                      <code className="mt-2 block break-all text-xs text-slate-700">{link.url}</code>
                      <div className="mt-2">
                        <CopyButton text={link.url} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900">HTML для вставки</h2>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                  {kit.embedHtml}
                </pre>
                <div className="mt-3">
                  <CopyButton text={kit.embedHtml} label="Копировать HTML" />
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Вопросы по партнёрству:{' '}
                <a href={`mailto:${kit.contacts?.supportEmail}`} className="text-violet-600 hover:underline">
                  {kit.contacts?.supportEmail}
                </a>
              </p>
            </section>
          ) : null}
        </div>
      </main>

      <SiteFooter compact />
    </div>
  );
}
