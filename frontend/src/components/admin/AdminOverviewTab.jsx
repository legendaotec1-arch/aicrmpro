import { useMemo, useState } from 'react';
import { Users, CreditCard, Wallet, CalendarClock, ExternalLink, Repeat, Crown } from 'lucide-react';
import { formatRub, formatDate } from './adminFormat';
import AdminTablePagination from './AdminTablePagination';

const MASTERS_PAGE_SIZE = 10;
const PAYMENTS_PAGE_SIZE = 5;

function masterClientPagePath(row) {
  const segment = row.public_slug || row.id;
  return segment ? `/m/${encodeURIComponent(segment)}` : null;
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function tariffLabel(row) {
  if (row.tariff_type === 'unlimited') {
    const exp = row.tariff_expires_at ? new Date(row.tariff_expires_at) : null;
    if (exp && exp.getTime() > Date.now()) {
      return `Безлимит до ${exp.toLocaleDateString('ru-RU')}`;
    }
    return 'Безлимит (истёк)';
  }
  return 'За запись';
}

function purposeLabel(purpose) {
  if (purpose === 'unlimited') return 'Безлимит';
  if (purpose === 'topup') return 'Пополнение';
  return purpose || '—';
}

function statusBadge(status) {
  const map = {
    succeeded: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    canceled: 'bg-slate-100 text-slate-600',
  };
  const labels = { succeeded: 'Оплачен', pending: 'Ожидает', canceled: 'Отменён' };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminOverviewTab({ overview, masters, payments }) {
  const [mastersPage, setMastersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const mastersSlice = useMemo(() => {
    const start = (mastersPage - 1) * MASTERS_PAGE_SIZE;
    return masters.slice(start, start + MASTERS_PAGE_SIZE);
  }, [masters, mastersPage]);

  const paymentsSlice = useMemo(() => {
    const start = (paymentsPage - 1) * PAYMENTS_PAGE_SIZE;
    return payments.slice(start, start + PAYMENTS_PAGE_SIZE);
  }, [payments, paymentsPage]);

  return (
    <div className="space-y-8">
      {overview ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard icon={Users} label="Всего мастеров" value={overview.mastersTotal} hint={`+${overview.mastersThisMonth} в этом месяце`} />
          <StatCard icon={Crown} label="Тариф «Безлимит»" value={overview.unlimitedActive} hint="Активная подписка" />
          <StatCard icon={Repeat} label="Тариф «За запись»" value={overview.perBookingActive} hint="Оплата за каждую запись" />
          <StatCard icon={CreditCard} label="Оплаты (всего)" value={formatRub(overview.paymentsTotalRub)} hint={`${formatRub(overview.paymentsThisMonthRub)} в этом месяце`} />
          <StatCard icon={Wallet} label="Списания за записи" value={formatRub(overview.bookingFeesThisMonthRub)} hint="В этом месяце" />
          <StatCard icon={CalendarClock} label="Платежи в ожидании" value={overview.paymentsPending} hint="Статус pending в ЮKassa" />
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Регистрации мастеров</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Дата</th>
                <th className="px-5 py-3 font-medium">Салон / имя</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Баланс</th>
                <th className="px-5 py-3 font-medium">Тариф</th>
                <th className="px-5 py-3 font-medium w-28">Страница</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mastersSlice.map((row) => {
                const clientPagePath = masterClientPagePath(row);
                return (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(row.created_at)}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{row.salon_name || row.display_name}</td>
                  <td className="px-5 py-3 text-slate-600">{row.email}</td>
                  <td className="px-5 py-3 font-medium">{formatRub(row.balance)}</td>
                  <td className="px-5 py-3 text-slate-600">{tariffLabel(row)}</td>
                  <td className="px-5 py-3">
                    {clientPagePath ? (
                      <a
                        href={clientPagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50"
                        title="Открыть страницу мастера для клиентов"
                      >
                        <ExternalLink size={13} strokeWidth={2.25} />
                        Профиль
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
              {masters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Регистраций пока нет
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <AdminTablePagination
            page={mastersPage}
            pageSize={MASTERS_PAGE_SIZE}
            total={masters.length}
            onPageChange={setMastersPage}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Платежи ЮKassa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Дата</th>
                <th className="px-5 py-3 font-medium">Мастер</th>
                <th className="px-5 py-3 font-medium">Сумма</th>
                <th className="px-5 py-3 font-medium">Тип</th>
                <th className="px-5 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentsSlice.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(row.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{row.salon_name || row.master_name}</div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-5 py-3 font-medium">{formatRub(row.amount)}</td>
                  <td className="px-5 py-3 text-slate-600">{purposeLabel(row.purpose)}</td>
                  <td className="px-5 py-3">{statusBadge(row.status)}</td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Платежей пока нет
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <AdminTablePagination
            page={paymentsPage}
            pageSize={PAYMENTS_PAGE_SIZE}
            total={payments.length}
            onPageChange={setPaymentsPage}
          />
        </div>
      </section>
    </div>
  );
}
