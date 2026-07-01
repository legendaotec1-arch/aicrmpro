import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileSearch,
  Globe,
  Lightbulb,
  MousePointerClick,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import seoAdminApi from '../../lib/seoAdminApi';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';

function fmtNum(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(n)));
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${(Number(n) * 100).toFixed(2)}%`;
}

function fmtPos(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(1);
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'violet' }) {
  const tones = {
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    error: 'bg-rose-100 text-rose-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-slate-100 text-slate-600',
  };
  const labels = { error: 'Ошибка', warning: 'Предупр.', info: 'Инфо' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[severity] || map.info}`}>
      {labels[severity] || severity}
    </span>
  );
}

function MiniBarChart({ daily = [] }) {
  const max = Math.max(...daily.map((d) => Number(d.impressions || 0)), 1);
  if (!daily.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
        Нет данных за период — подключите Вебмастер и нажмите «Синхронизировать»
      </div>
    );
  }
  return (
    <div className="flex h-32 items-end gap-1">
      {daily.map((row) => {
        const h = Math.max(4, (Number(row.impressions || 0) / max) * 100);
        return (
          <div
            key={row.metric_date}
            className="group relative min-w-0 flex-1"
            title={`${row.metric_date}: ${fmtNum(row.impressions)} показов, ${fmtNum(row.clicks)} кликов`}
          >
            <div
              className="w-full rounded-t bg-violet-500/80 transition group-hover:bg-violet-600"
              style={{ height: `${h}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AdminSeoTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [externalLinks, setExternalLinks] = useState(null);
  const [updatingLinkId, setUpdatingLinkId] = useState(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoSubmitPreview, setAutoSubmitPreview] = useState(null);
  const [autoSubmitLog, setAutoSubmitLog] = useState('');
  const [runningIntel, setRunningIntel] = useState(false);
  const [indexNow, setIndexNow] = useState(null);
  const [submittingIndexNow, setSubmittingIndexNow] = useState(false);
  const [articleStats, setArticleStats] = useState(null);
  const [syncingArticles, setSyncingArticles] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [articleSyncMsg, setArticleSyncMsg] = useState('');

  const loadExternalLinks = useCallback(async () => {
    try {
      const res = await seoAdminApi.get('/external-links');
      setExternalLinks(res.data);
    } catch {
      setExternalLinks(null);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [dashRes, indexNowRes, articlesRes] = await Promise.all([
        seoAdminApi.get('/dashboard'),
        seoAdminApi.get('/indexnow/status').catch(() => ({ data: null })),
        seoAdminApi.get('/articles/stats').catch(() => ({ data: null })),
      ]);
      await loadExternalLinks();
      setData(dashRes.data);
      setIndexNow(indexNowRes?.data || null);
      setArticleStats(articlesRes?.data || null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить SEO-панель');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadExternalLinks]);

  useEffect(() => {
    load();
  }, [load]);

  const runAudit = async () => {
    setAuditing(true);
    setError('');
    try {
      await seoAdminApi.post('/audit');
      await load(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка аудита');
    } finally {
      setAuditing(false);
    }
  };

  const updateLinkStatus = async (id, status, externalUrl) => {
    setUpdatingLinkId(id);
    try {
      await seoAdminApi.patch(`/external-links/${id}`, {
        status,
        external_url: externalUrl || undefined,
      });
      await loadExternalLinks();
      const dashRes = await seoAdminApi.get('/dashboard');
      setData(dashRes.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка обновления ссылки');
    } finally {
      setUpdatingLinkId(null);
    }
  };

  const runAutoSubmitBatch = async (platform) => {
    setAutoSubmitting(true);
    setError('');
    setAutoSubmitLog('');
    try {
      const res = await seoAdminApi.post('/auto-submit/run', { limit: 10, platform });
      setAutoSubmitLog(JSON.stringify(res.data, null, 2));
      await loadExternalLinks();
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка автосабмита');
    } finally {
      setAutoSubmitting(false);
    }
  };

  const previewAutoSubmit = async (linkKey) => {
    try {
      const res = await seoAdminApi.post('/auto-submit/link', { link_key: linkKey, dryRun: true });
      setAutoSubmitPreview(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка preview');
    }
  };

  const submitOneLink = async (linkKey) => {
    setAutoSubmitting(true);
    setError('');
    try {
      const res = await seoAdminApi.post('/auto-submit/link', { link_key: linkKey });
      setAutoSubmitLog(JSON.stringify(res.data, null, 2));
      await loadExternalLinks();
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка сабмита');
    } finally {
      setAutoSubmitting(false);
    }
  };

  const syncMetrics = async () => {
    setSyncing(true);
    setError('');
    try {
      const res = await seoAdminApi.post('/metrics/sync', { days: 28 });
      setData(res.data.dashboard);
      if (res.data.sync?.errors?.length) {
        setError(res.data.sync.errors.map((e) => `${e.source}: ${e.message}`).join('; '));
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const runIntelligence = async () => {
    setRunningIntel(true);
    setError('');
    try {
      await seoAdminApi.post('/intelligence/run', { generatePages: true });
      await load(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка SEO-анализа');
    } finally {
      setRunningIntel(false);
    }
  };

  const generateAiArticles = async () => {
    setGeneratingAi(true);
    setError('');
    setArticleSyncMsg('');
    try {
      const limit = articleStats?.aiBatchSize || 10;
      const res = await seoAdminApi.post('/articles/ai-generate', { limit });
      const r = res.data;
      if (r.started) {
        setArticleSyncMsg(`AI: запущено в фоне (до ${r.limit} статей). Обновим статистику через ~30 сек.`);
        setTimeout(async () => {
          try {
            const statsRes = await seoAdminApi.get('/articles/stats');
            setArticleStats(statsRes.data);
          } catch {}
        }, 30_000);
        return;
      }
      setArticleSyncMsg(
        `AI: готово ${r.enriched}, ошибок ${r.failed}`
        + (r.skipped ? ` (${r.reason || 'пропуск'})` : '')
        + `. Всего AI-статей: ${r.aiTotal ?? '—'}`
      );
      const statsRes = await seoAdminApi.get('/articles/stats');
      setArticleStats(statsRes.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка AI-генерации статей');
    } finally {
      setGeneratingAi(false);
    }
  };

  const syncArticles = async () => {
    setSyncingArticles(true);
    setError('');
    setArticleSyncMsg('');
    try {
      const res = await seoAdminApi.post('/articles/sync', { reschedule: 'pending' });
      const s = res.data;
      setArticleSyncMsg(
        `Каталог: ${s.catalog}, опубликовано: ${s.live}, в очереди: ${s.scheduled}`
        + (s.added ? `, добавлено: ${s.added}` : '')
        + (s.rescheduled ? `, перепланировано: ${s.rescheduled}` : '')
        + (s.aiEnrichment?.enriched ? `, AI: ${s.aiEnrichment.enriched}` : '')
        + ` (${s.articlesPerDay || articleStats?.articlesPerDay || 10} в день)`
      );
      const statsRes = await seoAdminApi.get('/articles/stats');
      setArticleStats(statsRes.data);
      await load(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка синхронизации статей');
    } finally {
      setSyncingArticles(false);
    }
  };

  const submitIndexNow = async (scope = 'recent') => {
    setSubmittingIndexNow(true);
    setError('');
    try {
      const res = await seoAdminApi.post('/indexnow/submit', { scope });
      if (res.data?.skipped && res.data?.reason === 'not_configured') {
        setError('IndexNow не настроен — задайте INDEXNOW_KEY в .env');
      } else if (!res.data?.ok) {
        setError('IndexNow: не все endpoints ответили успешно — проверьте ключ в Вебмастере');
      }
      const statusRes = await seoAdminApi.get('/indexnow/status');
      setIndexNow(statusRes.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка IndexNow');
    } finally {
      setSubmittingIndexNow(false);
    }
  };

  const search = data?.search;
  const index = data?.index;
  const audit = data?.audit;
  const extStats = data?.externalLinks || externalLinks?.stats;
  const intel = data?.intelligence;
  const configured = search?.configured;

  const periodLabel = useMemo(() => {
    if (!search?.period) return '';
    const from = new Date(search.period.from).toLocaleDateString('ru-RU');
    const to = new Date(search.period.to).toLocaleDateString('ru-RU');
    return `${from} — ${to}`;
  }, [search?.period]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">SEO</p>
          <h2 className="text-2xl font-bold text-slate-900">Поисковая аналитика</h2>
          <p className="mt-1 text-sm text-slate-500">
            Позиции, показы, индексация и ошибки — {data?.siteUrl || 'woner.ru'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => load(true)} loading={refreshing}>
            <RefreshCw size={16} className="mr-1.5" />
            Обновить
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={runAudit} loading={auditing}>
            <FileSearch size={16} className="mr-1.5" />
            Аудит
          </Button>
          <Button type="button" size="sm" onClick={syncMetrics} loading={syncing}>
            <BarChart3 size={16} className="mr-1.5" />
            Синхронизировать метрики
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={runIntelligence} loading={runningIntel}>
            <Lightbulb size={16} className="mr-1.5" />
            Анализ контента
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!configured?.any ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
          <p className="font-semibold">Подключите Яндекс.Вебмастер и/или Google Search Console</p>
          <p className="mt-2 text-amber-900/90">
            Добавьте в <code className="rounded bg-white/60 px-1">.env</code> переменные:
            <code className="mt-1 block text-xs">YANDEX_WEBMASTER_OAUTH_TOKEN, YANDEX_WEBMASTER_HOST_URL</code>
            <code className="block text-xs">GSC_SERVICE_ACCOUNT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL</code>
            Затем нажмите «Синхронизировать метрики». Индексация и аудит работают без API.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          {configured.yandex ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
              <CheckCircle2 size={14} /> Яндекс.Вебмастер
            </span>
          ) : null}
          {configured.google ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
              <CheckCircle2 size={14} /> Google Search Console
            </span>
          ) : null}
          {search?.lastSyncedAt ? (
            <span className="text-slate-500">
              Обновлено: {new Date(search.lastSyncedAt).toLocaleString('ru-RU')}
            </span>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="Средняя позиция"
          value={fmtPos(search?.totals?.avgPosition)}
          hint={periodLabel}
          tone="amber"
        />
        <MetricCard
          icon={Eye}
          label="Показы"
          value={fmtNum(search?.totals?.impressions)}
          hint="За период"
          tone="sky"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Клики"
          value={fmtNum(search?.totals?.clicks)}
          hint="За период"
          tone="emerald"
        />
        <MetricCard
          icon={BarChart3}
          label="CTR"
          value={fmtPct(search?.totals?.ctr)}
          hint="Клики / показы"
          tone="violet"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Динамика показов</h3>
          <p className="mt-1 text-xs text-slate-500">{periodLabel || 'Последние 28 дней'}</p>
          <div className="mt-4">
            <MiniBarChart daily={search?.daily || []} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-2 text-emerald-800">
              <Globe size={18} />
              <h3 className="font-semibold">Индексируемые</h3>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {fmtNum(index?.indexable?.total)}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-emerald-900/80">
              <li>SEO-страницы: {fmtNum(index?.indexable?.seoPages)}</li>
              <li>Статьи блога: {fmtNum(index?.indexable?.articles)}</li>
              <li>Страницы мастеров: {fmtNum(index?.indexable?.masters)}</li>
              <li>Статические: {fmtNum(index?.indexable?.static)}</li>
            </ul>
            <a
              href={`${data?.siteUrl || ''}/sitemap.xml`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              sitemap.xml <ExternalLink size={12} />
            </a>
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">IndexNow</p>
              <p className="mt-1 text-xs text-violet-900/80">
                {indexNow?.configured
                  ? 'Яндекс уведомляется автоматически при публикации статей и страниц'
                  : 'Добавьте INDEXNOW_KEY в .env и перезапустите backend'}
              </p>
              {indexNow?.keyLocation ? (
                <a
                  href={indexNow.keyLocation}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
                >
                  Ключ IndexNow <ExternalLink size={12} />
                </a>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" loading={submittingIndexNow} onClick={() => submitIndexNow('recent')}>
                  Уведомить об изменениях
                </Button>
                <Button type="button" size="sm" variant="secondary" loading={submittingIndexNow} onClick={() => submitIndexNow('sitemap')}>
                  Весь sitemap
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-slate-700">
              <XCircle size={18} />
              <h3 className="font-semibold">Не в индексе</h3>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {fmtNum(index?.nonIndexable?.total)}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>Запланированные статьи: {fmtNum(index?.nonIndexable?.scheduledArticles)}</li>
              <li>Черновики статей: {fmtNum(index?.nonIndexable?.draftArticles)}</li>
              <li>Мастера скрыты: {fmtNum(index?.nonIndexable?.mastersHidden)}</li>
              <li>Без slug: {fmtNum(index?.nonIndexable?.mastersNoSlug)}</li>
              <li>Служебные пути: {fmtNum(index?.nonIndexable?.systemPaths)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <Newspaper size={18} className="text-violet-600" />
              <h3 className="font-semibold">Автоблог</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Публикация: <strong>{articleStats?.articlesPerDay ?? 10} статей в день</strong>
              {' · '}
              AI OpenRouter:{' '}
              <strong className={articleStats?.openRouterConfigured ? 'text-emerald-700' : 'text-amber-700'}>
                {articleStats?.openRouterConfigured ? 'подключён' : 'нет ключа'}
              </strong>
              {' · '}
              В каталоге: {fmtNum(articleStats?.catalogSize)} шаблонов
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={syncArticles} loading={syncingArticles}>
              <Newspaper size={16} className="mr-1.5" />
              Синхронизировать
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={generateAiArticles}
              loading={generatingAi}
              disabled={!articleStats?.openRouterConfigured}
            >
              <Sparkles size={16} className="mr-1.5" />
              AI: {articleStats?.aiBatchSize ?? 10} статей
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-violet-50 px-4 py-3">
            <p className="text-xs text-violet-700">AI-контент</p>
            <p className="text-2xl font-bold text-violet-900">{fmtNum(articleStats?.ai_total)}</p>
            <p className="text-xs text-violet-600">в очереди AI: {fmtNum(articleStats?.ai_pending)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">Шаблон в очереди</p>
            <p className="text-2xl font-bold text-slate-900">{fmtNum(articleStats?.template_pending)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-700">Опубликовано</p>
            <p className="text-2xl font-bold text-emerald-900">{fmtNum(articleStats?.live)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-700">Всего в очереди</p>
            <p className="text-2xl font-bold text-amber-900">{fmtNum(articleStats?.scheduled)}</p>
          </div>
        </div>
        {articleStats?.nextPublications?.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ближайшие публикации</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {articleStats.nextPublications.map((row) => (
                <li key={row.slug} className="flex flex-wrap justify-between gap-2">
                  <span className="truncate font-mono text-xs">
                    {row.slug}
                    {row.content_source === 'ai' ? (
                      <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] text-violet-700">AI</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {new Date(row.published_at).toLocaleString('ru-RU')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {articleSyncMsg ? (
          <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">{articleSyncMsg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Топ запросов</h3>
            <p className="text-xs text-slate-500">Позиция · показы · клики · CTR</p>
          </div>
          <Search size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Запрос</th>
                <th className="px-3 py-3 font-semibold">Источник</th>
                <th className="px-3 py-3 font-semibold text-right">Поз.</th>
                <th className="px-3 py-3 font-semibold text-right">Показы</th>
                <th className="px-3 py-3 font-semibold text-right">Клики</th>
                <th className="px-5 py-3 font-semibold text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {(search?.topQueries || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Нет данных — синхронизируйте метрики из Вебмастера
                  </td>
                </tr>
              ) : (
                search.topQueries.map((row, i) => (
                  <tr key={`${row.query}-${row.source}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800" title={row.query}>
                      {row.query}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{row.source === 'google' ? 'Google' : 'Яндекс'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtPos(row.position)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtNum(row.impressions)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtNum(row.clicks)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{fmtPct(row.ctr)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <div>
              <h3 className="font-semibold text-slate-900">Ошибки и предупреждения</h3>
              <p className="text-xs text-slate-500">
                {audit?.runAt
                  ? `Аудит: ${new Date(audit.runAt).toLocaleString('ru-RU')} · проверено ${audit.pagesChecked} стр.`
                  : 'Аудит ещё не запускался'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="font-semibold text-rose-600">{audit?.errors ?? 0} ошибок</span>
            <span className="font-semibold text-amber-600">{audit?.warnings ?? 0} предупр.</span>
          </div>
        </div>
        <ul className="max-h-80 divide-y divide-slate-50 overflow-y-auto">
          {(audit?.issues || []).length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-slate-400">
              {audit?.runAt ? 'Проблем не найдено' : 'Нажмите «Аудит» для проверки'}
            </li>
          ) : (
            audit.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm">
                <SeverityBadge severity={issue.severity} />
                <span className="text-slate-700">{issue.message}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              <div>
                <h3 className="font-semibold text-slate-900">Страницы без показов</h3>
                <p className="text-xs text-slate-500">
                  {intel?.analyzedAt
                    ? `Обновлено: ${new Date(intel.analyzedAt).toLocaleString('ru-RU')}`
                    : 'Запустите «Анализ контента»'}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700">{fmtNum(intel?.zeroImpressions ?? '—')}</p>
          </div>
          <ul className="max-h-72 divide-y divide-slate-50 overflow-y-auto">
            {(intel?.topGaps || []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-400">
                Нет рекомендаций — запустите анализ
              </li>
            ) : (
              intel.topGaps.map((gap, i) => (
                <li key={`${gap.slug}-${gap.issue_type}-${i}`} className="px-5 py-3 text-sm">
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={gap.severity} />
                    <div>
                      <a
                        href={`${data?.siteUrl || ''}${gap.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-violet-600 hover:underline"
                      >
                        {gap.path}
                      </a>
                      <p className="mt-1 text-slate-600">{gap.recommendation}</p>
                      {gap.impressions > 0 ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {fmtNum(gap.impressions)} показов · {fmtNum(gap.clicks)} кликов
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-violet-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">Кластеры ключевых слов</h3>
              <p className="text-xs text-slate-500">
                {fmtNum(intel?.clusters)} кластеров · {fmtNum(intel?.gapClusters)} без посадочной
              </p>
            </div>
            <p className="text-sm font-semibold text-violet-600">{fmtNum(intel?.recommendations)} рекоменд.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                  <th className="px-5 py-2 font-semibold">Кластер</th>
                  <th className="px-3 py-2 font-semibold">Интент</th>
                  <th className="px-3 py-2 text-right font-semibold">Показы</th>
                  <th className="px-5 py-2 font-semibold">Страница</th>
                </tr>
              </thead>
              <tbody>
                {(intel?.topClusters || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Кластеры появятся после анализа
                    </td>
                  </tr>
                ) : (
                  intel.topClusters.map((c) => (
                    <tr key={c.cluster_key} className="border-b border-slate-50">
                      <td className="max-w-[140px] truncate px-5 py-2 font-medium text-slate-800" title={c.label}>
                        {c.label}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{c.intent}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.total_impressions)}</td>
                      <td className="px-5 py-2">
                        {c.mapped_slug ? (
                          <span className="text-emerald-600">/{c.mapped_slug}</span>
                        ) : (
                          <span className="text-amber-600">{c.status === 'gap' ? 'нет' : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Внешние ссылки</h3>
            <p className="text-xs text-slate-500">
              82 площадки: VC.ru, Reddit, GitHub, Product Hunt, каталоги, соцсети — цель {extStats?.target || 30} live
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-2xl font-bold text-violet-700">
              {fmtNum(extStats?.live || 0)} / {fmtNum(extStats?.target || 30)}
            </p>
            <p className="text-xs text-slate-500">опубликовано</p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={autoSubmitting}
                onClick={() => runAutoSubmitBatch()}
                className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                title="Запустить автосабмит для 10 запланированных площадок"
              >
                Автосабмит (10)
              </button>
              <button
                type="button"
                disabled={autoSubmitting}
                onClick={() => runAutoSubmitBatch('reddit,producthunt,hackernews')}
                className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                Launch-пакет
              </button>
              <button
                type="button"
                disabled={autoSubmitting}
                onClick={() => runAutoSubmitBatch('telegram,vk,social')}
                className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                Соцсети
              </button>
              <button
                type="button"
                disabled={autoSubmitting}
                onClick={() => runAutoSubmitBatch('bookmark')}
                className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                Закладки
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          {[
            { label: 'VC.ru', key: 'vc' },
            { label: 'Дзен', key: 'dzen' },
            { label: 'Каталоги', key: 'catalogs' },
            { label: 'Партнёры', key: 'partners' },
          ].map(({ label, key }) => (
            <div key={key} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-bold text-slate-800">{fmtNum(extStats?.[key] || 0)}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-xs">
          <a
            href={`${data?.siteUrl || ''}/press`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline"
          >
            Пресс-кит <ExternalLink size={12} />
          </a>
          <a
            href={`${data?.siteUrl || ''}/partners`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline"
          >
            Партнёрам <ExternalLink size={12} />
          </a>
          <a
            href={`${data?.siteUrl || ''}/blog/feed.xml`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline"
          >
            RSS для Дзена <ExternalLink size={12} />
          </a>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Площадка</th>
                <th className="px-3 py-3 font-semibold">Задача</th>
                <th className="px-3 py-3 font-semibold">Статус</th>
                <th className="px-5 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {(externalLinks?.links || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    Каталог загружается при старте сервера
                  </td>
                </tr>
              ) : (
                externalLinks.links.map((link) => (
                  <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-600">{link.platformLabel}</td>
                    <td className="max-w-xs px-3 py-3">
                      <p className="font-medium text-slate-800">{link.title}</p>
                      {link.instructions ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{link.instructions}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            link.status === 'live'
                              ? 'bg-emerald-100 text-emerald-800'
                              : link.status === 'in_progress'
                                ? 'bg-sky-100 text-sky-800'
                                : link.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {link.status === 'live'
                            ? 'Live'
                            : link.status === 'in_progress'
                              ? 'В работе'
                              : link.status === 'rejected'
                                ? 'Отклонено'
                                : 'План'}
                        </span>
                        {link.auto_submit && link.auto_submit !== 'manual' ? (
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              link.auto_submit === 'api'
                                ? 'bg-violet-100 text-violet-700'
                                : link.auto_submit === 'webhook'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                            title={`Способ автосабмита: ${link.auto_submit}${link.requires_review ? ' (требует проверки)' : ''}`}
                          >
                            {link.auto_submit === 'api' ? 'API' : link.auto_submit === 'webhook' ? 'Webhook' : 'Form'}
                            {link.requires_review ? ' ⚠' : ''}
                          </span>
                        ) : null}
                        {link.last_attempt_status ? (
                          <span className="text-[10px] text-slate-400" title={link.last_attempt_message || ''}>
                            {link.last_attempt_at ? new Date(link.last_attempt_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''} · {link.last_attempt_status}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {link.auto_submit && link.auto_submit !== 'manual' && link.status !== 'live' ? (
                          <>
                            <button
                              type="button"
                              disabled={autoSubmitting}
                              onClick={() => previewAutoSubmit(link.link_key)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              title="Показать, что будет отправлено"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              disabled={autoSubmitting}
                              onClick={() => submitOneLink(link.link_key)}
                              className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                              title="Отправить на площадку прямо сейчас"
                            >
                              Auto
                            </button>
                          </>
                        ) : null}
                        {link.status !== 'live' ? (
                          <button
                            type="button"
                            disabled={updatingLinkId === link.id}
                            onClick={() => {
                              const url = window.prompt('URL публикации на внешней площадке:', link.external_url || '');
                              if (url !== null) updateLinkStatus(link.id, 'live', url);
                            }}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Live
                          </button>
                        ) : null}
                        {link.status !== 'in_progress' && link.status !== 'live' ? (
                          <button
                            type="button"
                            disabled={updatingLinkId === link.id}
                            onClick={() => updateLinkStatus(link.id, 'in_progress')}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            В работе
                          </button>
                        ) : null}
                        {link.trackedUrl ? (
                          <a
                            href={link.trackedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50"
                          >
                            UTM
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(autoSubmitLog || autoSubmitPreview) && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-700">
                {autoSubmitPreview ? 'Preview payload' : 'Результат автосабмита'}
              </h4>
              <button
                type="button"
                onClick={() => { setAutoSubmitLog(''); setAutoSubmitPreview(null); }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Закрыть
              </button>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
              {JSON.stringify(autoSubmitPreview || autoSubmitLog, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
