import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../lib/adminApi';
import { clearAdminToken } from '../lib/adminStorage';
import { ensureFreshAdminBundle } from '../lib/adminBundleCheck';
import { useSafeInterval } from '../lib/usePageVisible';
import { PageLoader } from '../components/ui/Spinner';
import AdminLayout, { useAdminTab } from '../components/admin/AdminLayout';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminTasksTab from '../components/admin/AdminTasksTab';
import AdminDriveTab from '../components/admin/AdminDriveTab';
import AdminFinanceTab from '../components/admin/AdminFinanceTab';
import AdminAdsTab from '../components/admin/AdminAdsTab';
import AdminVaultTab from '../components/admin/AdminVaultTab';
import AdminSeoTab from '../components/admin/AdminSeoTab';
import AdminPartnersTab from '../components/admin/AdminPartnersTab';
import AdminCrmTab from '../components/admin/AdminCrmTab';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const tab = useAdminTab();
  const [loading, setLoading] = useState(tab === 'overview');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [masters, setMasters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasksUnread, setTasksUnread] = useState(0);

  useEffect(() => {
    ensureFreshAdminBundle();
  }, []);

  const refreshTasksUnread = useCallback(async () => {
    try {
      const res = await adminApi.get('/tasks/unread-total');
      setTasksUnread(Number(res.data?.total ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshTasksUnread();
  }, [refreshTasksUnread, tab]);

  useSafeInterval(refreshTasksUnread, 30000, tab !== 'tasks');

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [overviewRes, mastersRes, paymentsRes] = await Promise.all([
        adminApi.get('/overview'),
        adminApi.get('/masters?limit=200'),
        adminApi.get('/payments?limit=100'),
      ]);
      setOverview(overviewRes.data);
      setMasters(mastersRes.data.masters || []);
      setPayments(paymentsRes.data.payments || []);
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      setError(err?.response?.data?.error || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (tab === 'overview') loadOverview();
    else setLoading(false);
  }, [tab, loadOverview]);

  const logout = () => {
    clearAdminToken();
    navigate('/admin', { replace: true });
  };

  if (loading) return <PageLoader />;

  return (
    <AdminLayout
      onRefresh={tab === 'overview' ? () => loadOverview(true) : undefined}
      refreshing={refreshing}
      onLogout={logout}
      tasksUnread={tasksUnread}
    >
      {error && tab === 'overview' ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <AdminOverviewTab overview={overview} masters={masters} payments={payments} />
      ) : null}
      {tab === 'tasks' ? <AdminTasksTab onUnreadTotal={setTasksUnread} /> : null}
      {tab === 'crm' ? <AdminCrmTab /> : null}
      {tab === 'drive' ? <AdminDriveTab /> : null}
      {tab === 'finance' ? <AdminFinanceTab /> : null}
      {tab === 'ads' ? <AdminAdsTab /> : null}
      {tab === 'seo' ? <AdminSeoTab /> : null}
      {tab === 'partners' ? <AdminPartnersTab /> : null}
      {tab === 'vault' ? <AdminVaultTab /> : null}
    </AdminLayout>
  );
}
