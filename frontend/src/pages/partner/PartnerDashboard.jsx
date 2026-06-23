import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpRight,
  CalendarRange,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  LogOut,
  Snowflake,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import partnerApi, { downloadPartnerFile } from '../../lib/partnerApi';
import { clearPartnerToken } from '../../lib/partnerStorage';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import Logo from '../../components/brand/Logo';

function fmtRub(n) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(n || 0));
}

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthAgoIso() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const WITHDRAWAL_STATUS = {
  pending: { label: 'В обработке', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  completed: { label: 'Выплачено', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  rejected: { label: 'Отклонено', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
};

function StatCard({ icon: Icon, label, value, hint, accent = 'violet' }) {
  const accents = {
    violet: 'from-violet-500/10 to-violet-600/5 text-violet-600',
    emerald: 'from-emerald-500/10 to-emerald-600/5 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-600/5 text-amber-600',
    slate: 'from-slate-500/10 to-slate-600/5 text-slate-600',
  };
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, description, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Icon size={18} />
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
    >
      <Copy size={14} />
      {ok ? 'Скопировано' : 'Копировать'}
    </button>
  );
}

function formatCardInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function buildExportPath({ mode, month, from, to, format }) {
  const params = new URLSearchParams({ format });
  if (mode === 'month') params.set('month', month);
  else {
    params.set('from', from);
    params.set('to', to);
  }
  return `/api/partner/commissions/export?${params}`;
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [postTemplates, setPostTemplates] = useState([]);
  const [error, setError] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bank_name: '', card_number: '', full_name: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [exportMode, setExportMode] = useState('month');
  const [exportMonth, setExportMonth] = useState(currentMonthValue);
  const [exportFrom, setExportFrom] = useState(monthAgoIso);
  const [exportTo, setExportTo] = useState(todayIso);

  const load = useCallback(async () => {
    setError('');
    try {
      const [dash, assetsRes, postsRes] = await Promise.all([
        partnerApi.get('/dashboard'),
        partnerApi.get('/assets'),
        partnerApi.get('/post-templates'),
      ]);
      setData(dash.data);
      setAssets(assetsRes.data.assets || []);
      setPostTemplates(postsRes.data.templates || []);
      setWithdrawForm((f) => ({ ...f, full_name: f.full_name || dash.data.partner?.full_name || '' }));
    } catch (err) {
      if (err?.response?.status === 401) {
        clearPartnerToken();
        navigate('/partner/login', { replace: true });
        return;
      }
      setError(err?.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = () => {
    clearPartnerToken();
    navigate('/partner/login');
  };

  const requestWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawError('');
    try {
      await partnerApi.post('/withdrawals', {
        ...withdrawForm,
        card_number: withdrawForm.card_number.replace(/\s/g, ''),
      });
      setWithdrawForm({ amount: '', bank_name: '', card_number: '', full_name: data.partner.full_name });
      setWithdrawSuccess(true);
      await load();
    } catch (err) {
      setWithdrawError(err?.response?.data?.error || 'Ошибка заявки');
    } finally {
      setWithdrawing(false);
    }
  };

  const openWithdraw = () => {
    setWithdrawSuccess(false);
    setWithdrawError('');
    setWithdrawOpen(true);
  };

  const closeWithdraw = () => {
    setWithdrawOpen(false);
    setWithdrawSuccess(false);
    setWithdrawError('');
  };

  const exportParams = useMemo(
    () => (exportMode === 'month'
      ? { mode: 'month', month: exportMonth }
      : { mode: 'range', from: exportFrom, to: exportTo }),
    [exportMode, exportMonth, exportFrom, exportTo]
  );

  const downloadExport = (format) => {
    const path = buildExportPath({ ...exportParams, format });
    const name = exportMode === 'month' ? `woner-${exportMonth}` : `woner-${exportFrom}_${exportTo}`;
    downloadPartnerFile(path, `${name}.${format === 'html' ? 'html' : 'csv'}`);
  };

  if (loading) return <PageLoader />;

  const p = data?.partner;
  const stats = data?.stats;
  const minWithdraw = data?.min_withdrawal ?? 1000;
  const balance = Number(p?.available_balance ?? p?.balance ?? 0);
  const frozen = Number(p?.frozen_balance ?? 0);
  const totalEarned = Number(p?.total_earned ?? 0);
  const totalWithdrawn = Number(p?.total_withdrawn ?? 0);
  const hasPending = Boolean(p?.has_pending_withdrawal);
  const canWithdraw = balance >= minWithdraw && !hasPending;
  const referralsCount = data?.referrals?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f2ff]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 sm:inline">
              Partner
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{p?.full_name}</p>
              <p className="text-xs text-slate-500">{p?.email}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={logout}>
              <LogOut size={16} className="mr-1" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-8">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Партнёрский кабинет</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              Здравствуйте, {p?.full_name?.split(' ')[0]}
            </h1>
            <p className="mt-2 text-slate-500">
              Комиссия {data?.commission_percent || 30}% с оплат привлечённых мастеров
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              onClick={openWithdraw}
              disabled={!canWithdraw}
              className="shadow-lg shadow-violet-500/20"
            >
              <Wallet size={18} className="mr-2" />
              Вывести средства
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadPartnerFile('/api/partner/offer', 'partner-offer-woner.html')}
            >
              <FileText size={16} className="mr-2" />
              Договор
            </Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard icon={Wallet} label="Доступно к выводу" value={fmtRub(balance)} accent="violet" />
          <StatCard
            icon={Snowflake}
            label="Заморожено"
            value={fmtRub(frozen)}
            hint={hasPending ? 'Ожидает обработки заявки' : 'Нет активных заявок'}
            accent="amber"
          />
          <StatCard icon={TrendingUp} label="Заработано всего" value={fmtRub(totalEarned)} accent="emerald" />
          <StatCard
            icon={ArrowDownCircle}
            label="Выведено всего"
            value={fmtRub(totalWithdrawn)}
            hint="Зачислено на карту за всё время"
            accent="slate"
          />
          <StatCard icon={Users} label="Мастеров" value={referralsCount} hint={`+${stats?.month?.referrals ?? 0} за 30 дней`} accent="slate" />
        </section>

        {hasPending ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-900">
            <strong>{fmtRub(frozen)}</strong> заморожено на балансе — заявка на вывод в обработке. Повторная заявка недоступна до решения.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <Panel title="Реферальная ссылка" description="Мастер закрепляется за вами навсегда" icon={Link2}>
              <div className="space-y-3">
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Короткая ссылка</p>
                  <code className="mt-2 block break-all text-sm font-medium text-violet-800">{data?.short_url}</code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyBtn text={data?.short_url} />
                    <a
                      href={data?.short_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Открыть <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
                <details className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">Полная ссылка</summary>
                  <code className="mt-3 block break-all text-xs text-slate-600">{data?.referral_url}</code>
                </details>
              </div>
            </Panel>

            <Panel title="Доход за период" icon={TrendingUp}>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Сегодня', value: stats?.day?.earnings },
                  { label: '7 дней', value: stats?.week?.earnings },
                  { label: '30 дней', value: stats?.month?.earnings },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{fmtRub(item.value)}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {data?.referrals?.length > 0 ? (
              <Panel title="Ваши мастера" description={`${referralsCount} привлечённых`} icon={Users}>
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Мастер</th>
                        <th className="hidden px-4 py-3 sm:table-cell">Email</th>
                        <th className="px-4 py-3 text-right">Комиссия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{r.name}</p>
                            {r.salon_name ? <p className="text-xs text-slate-500">{r.salon_name}</p> : null}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{r.email}</td>
                          <td className="px-4 py-3 text-right font-semibold text-violet-700">{fmtRub(r.earned)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            ) : null}
          </div>

          <div className="space-y-6 xl:col-span-5">
            <Panel title="Выгрузка отчёта" description="CSV для банка и учёта" icon={CalendarRange}>
              <div className="space-y-4">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {[
                    { id: 'month', label: 'Месяц' },
                    { id: 'range', label: 'Период' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setExportMode(tab.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        exportMode === tab.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {exportMode === 'month' ? (
                  <Input
                    label="Месяц"
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="С" type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                    <Input label="По" type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                  </div>
                )}

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-1">
                  <p>В CSV: заработано всего с Woner, за период, баланс, заморожено.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="flex-1" onClick={() => downloadExport('csv')}>
                    <Download size={16} className="mr-2" />
                    Скачать CSV
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => downloadExport('html')}>
                    HTML
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="История выводов" icon={ArrowUpRight}>
              {!data?.withdrawals?.length ? (
                <p className="text-sm text-slate-400">Заявок на вывод пока нет</p>
              ) : (
                <ul className="space-y-3">
                  {data.withdrawals.map((w) => {
                    const st = WITHDRAWAL_STATUS[w.status] || WITHDRAWAL_STATUS.pending;
                    return (
                      <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{fmtRub(w.amount)}</p>
                          <p className="text-xs text-slate-500">{fmtDate(w.created_at)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${st.className}`}>
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Готовые посты для публикации" description="Скопируйте текст в Telegram, WhatsApp или соцсети — ваша реферальная ссылка уже подставлена" icon={FileText}>
              {postTemplates.length === 0 ? (
                <p className="text-sm text-slate-400">Готовые посты появятся после добавления администратором</p>
              ) : (
                <ul className="space-y-4">
                  {postTemplates.map((t) => (
                    <li key={t.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-800">{t.title}</p>
                        <CopyBtn text={t.body} />
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{t.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Рекламные материалы" icon={ImageIcon}>
              {assets.length === 0 ? (
                <p className="text-sm text-slate-400">Материалы появятся после загрузки администратором</p>
              ) : (
                <ul className="space-y-2">
                  {assets.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{a.title}</p>
                        <p className="truncate text-xs text-slate-500">{a.file_name}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadPartnerFile(`/api/partner/assets/${a.id}/download`, a.file_name)}
                      >
                        <Download size={14} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </main>

      <Modal
        open={withdrawOpen}
        onClose={closeWithdraw}
        size="md"
        title={withdrawSuccess ? 'Заявка принята' : 'Вывод средств'}
        description={
          withdrawSuccess
            ? 'Сумма заморожена на балансе до завершения перевода.'
            : `Доступно: ${fmtRub(balance)} · минимум ${fmtRub(minWithdraw)}`
        }
        footer={
          withdrawSuccess ? (
            <Button type="button" onClick={closeWithdraw} className="w-full sm:w-auto">
              Готово
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={closeWithdraw} disabled={withdrawing}>
                Отмена
              </Button>
              <Button type="submit" form="partner-withdraw-form" loading={withdrawing} disabled={!canWithdraw}>
                Отправить заявку
              </Button>
            </>
          )
        }
      >
        {withdrawSuccess ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Wallet size={28} />
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Перевод поступит на карту в течение 5 рабочих дней. Повторная заявка будет доступна после обработки.
            </p>
          </div>
        ) : (
          <form id="partner-withdraw-form" onSubmit={requestWithdraw} className="space-y-4">
            {withdrawError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{withdrawError}</div>
            ) : null}

            {hasPending ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                У вас уже есть заявка в обработке. Дождитесь решения.
              </div>
            ) : null}

            <div>
              <Input
                label="Сумма"
                type="number"
                required
                min={minWithdraw}
                max={balance}
                step="1"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                hint={`От ${fmtRub(minWithdraw)} до ${fmtRub(balance)}`}
                disabled={!canWithdraw}
              />
              <button
                type="button"
                disabled={!canWithdraw}
                onClick={() => setWithdrawForm((f) => ({ ...f, amount: String(Math.floor(balance)) }))}
                className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50"
              >
                Вывести всю доступную сумму
              </button>
            </div>

            <Input
              label="ФИО получателя"
              required
              value={withdrawForm.full_name}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, full_name: e.target.value })}
              placeholder="Как на карте"
              disabled={!canWithdraw}
            />

            <Input
              label="Номер карты"
              required
              inputMode="numeric"
              autoComplete="cc-number"
              value={withdrawForm.card_number}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, card_number: formatCardInput(e.target.value) })}
              placeholder="0000 0000 0000 0000"
              disabled={!canWithdraw}
            />

            <Input
              label="Банк карты"
              required
              value={withdrawForm.bank_name}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
              placeholder="Например: Сбербанк"
              disabled={!canWithdraw}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
