import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Phone, Send, MessageCircle } from 'lucide-react';
import { AuthContext } from '../App';
import { useToast } from '../context/ToastContext';
import DashboardLayout, { StatCard, MiniChart } from '../components/layout/DashboardLayout';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import MaxLogo from '../components/brand/MaxLogo';
import { IconTelegram } from '../components/brand/SocialBrandIcons';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import BookingLinkCard from '../components/dashboard/BookingLinkCard';
import { DAYS, STATUS_LABELS, formatDate, formatDateTime, formatPrice, formatServicePrice } from '../lib/format';
import { mediaUrl } from '../lib/media';
import TeamMasterSelect from '../components/dashboard/TeamMasterSelect';
import SalonMastersSection from '../components/dashboard/SalonMastersSection';
import ClientDetailModal from '../components/dashboard/ClientDetailModal';
import ClientCard from '../components/dashboard/ClientCard';
import ClientAvatar from '../components/dashboard/ClientAvatar';
import AnalyticsSection from '../components/dashboard/AnalyticsSection';
import ReviewsSection from '../components/dashboard/ReviewsSection';
import RepeatInvitesSection from '../components/dashboard/RepeatInvitesSection';
import NotifySettingsCard from '../components/dashboard/NotifySettingsCard';
import AddressSuggestField from '../components/maps/AddressSuggestField';
import AddressMap from '../components/maps/AddressMap';
import ThemesSection from '../components/dashboard/ThemesSection';
import MasterSocialLinksCard from '../components/dashboard/MasterSocialLinksCard';
import ScheduleSection from '../components/dashboard/ScheduleSection';
import BillingSection from '../components/dashboard/BillingSection';
import BlacklistSection from '../components/dashboard/BlacklistSection';
import VideoReelCard from '../components/dashboard/VideoReelCard';
import ServicePriceModal from '../components/dashboard/ServicePriceModal';
import { MASTER_SOCIAL_FIELDS } from '../lib/socialLinks';

function buildScheduleDraft(apiSchedule) {
  return Array.from({ length: 7 }, (_, day) => {
    const row = apiSchedule.find((s) => s.day_of_week === day);
    return row
      ? { ...row }
      : { day_of_week: day, start_time: '09:00', end_time: '18:00', is_day_off: day === 0 };
  });
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, api } = useContext(AuthContext);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(() => searchParams.get('section') || 'overview');
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [profile, setProfile] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState(() => buildScheduleDraft([]));
  const [exceptions, setExceptions] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [links, setLinks] = useState(null);
  const [profileTab, setProfileTab] = useState('main');
  const [profileForm, setProfileForm] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({
    id: null,
    name: '',
    price: '',
    price_max: '',
    price_type: 'fixed',
    duration_minutes: 60,
    is_active: true
  });
  const [priceImage, setPriceImage] = useState(null);
  const [savingPrice, setSavingPrice] = useState(false);

  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ exception_date: '', is_working: false, start_time: '09:00', end_time: '18:00' });

  const [showManualBook, setShowManualBook] = useState(false);
  const [manualBookForm, setManualBookForm] = useState({ clientName: '', clientPhone: '', serviceName: '', servicePrice: '', appointmentTime: '', duration: 60 });

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [clientMessage, setClientMessage] = useState('');

  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [salonMasters, setSalonMasters] = useState([]);
  const [selectedSalonMasterId, setSelectedSalonMasterId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDeleteTarget, setClientDeleteTarget] = useState(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [messageTargetClient, setMessageTargetClient] = useState(null);
  const [navBadges, setNavBadges] = useState({ chatUnread: 0, reviewsPending: 0 });

  const refreshNavBadges = useCallback(async () => {
    try {
      const res = await api.get('/master/me/nav-badges');
      setNavBadges(res.data);
    } catch {
      /* ignore */
    }
  }, [api]);

  const teamParams = useCallback(
    () => (selectedSalonMasterId ? { params: { salonMasterId: selectedSalonMasterId } } : {}),
    [selectedSalonMasterId]
  );

  const loadTeamScoped = useCallback(
    async (teamId) => {
      if (!teamId) return;
      const params = { params: { salonMasterId: teamId } };
      const [scheduleRes, pricesRes, portfolioRes, exceptionsRes] = await Promise.all([
        api.get('/master/me/schedule', params),
        api.get('/master/me/prices', params),
        api.get('/master/me/portfolio', params),
        api.get('/master/me/exceptions', params)
      ]);
      setScheduleDraft(buildScheduleDraft(scheduleRes.data));
      setPriceList(pricesRes.data);
      setPortfolio(portfolioRes.data);
      setExceptions(exceptionsRes.data);
    },
    [api]
  );

  const loadData = useCallback(async () => {
    try {
      const [profileRes, appointmentsRes, clientsRes, linkRes, teamRes] = await Promise.all([
        api.get('/master/me/profile'),
        api.get('/appointments'),
        api.get('/master/me/clients'),
        api.get('/master/me/link'),
        api.get('/master/me/salon-masters')
      ]);

      const profileData = profileRes.data;
      const socialDefaults = Object.fromEntries(
        MASTER_SOCIAL_FIELDS.map((f) => [f.key, profileData[f.key] ?? ''])
      );
      setProfile(profileData);
      setProfileForm({ ...profileData, ...socialDefaults });
      setAppointments(appointmentsRes.data);
      setClients(clientsRes.data);
      setLinks(linkRes.data.links);

      const active = teamRes.data.filter((m) => m.is_active !== false);
      setSalonMasters(teamRes.data);
      const teamId =
        active.find((m) => m.id === selectedSalonMasterId)?.id || active[0]?.id || null;
      setSelectedSalonMasterId(teamId);
      if (teamId) await loadTeamScoped(teamId);
    } catch (err) {
      console.error(err);
      toast('Не удалось загрузить данные', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, toast, loadTeamScoped, selectedSalonMasterId]);

  const handleTeamMasterChange = async (teamId) => {
    setSelectedSalonMasterId(teamId);
    try {
      await loadTeamScoped(teamId);
    } catch {
      toast('Не удалось загрузить данные мастера', 'error');
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
    refreshNavBadges();
    const t = setInterval(refreshNavBadges, 20000);
    return () => clearInterval(t);
  }, [user, navigate, loadData, refreshNavBadges]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) setActiveSection(section);
  }, [searchParams]);

  const handleSectionChange = useCallback(
    (id) => {
      setActiveSection(id);
      if (id === 'overview') setSearchParams({});
      else setSearchParams({ section: id });
    },
    [setSearchParams]
  );

  const handleDeleteClient = async () => {
    if (!clientDeleteTarget) return;
    setDeletingClient(true);
    try {
      await api.delete(`/master/me/clients/${clientDeleteTarget.id}`);
      setClients((items) => items.filter((item) => item.id !== clientDeleteTarget.id));
      if (selectedClientId === clientDeleteTarget.id) setSelectedClientId(null);
      setClientDeleteTarget(null);
      toast('Клиент удалён из базы');
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка удаления клиента', 'error');
    } finally {
      setDeletingClient(false);
    }
  };

  const stats = useMemo(() => {
    const upcoming = appointments.filter((a) => a.status === 'confirmed' && new Date(a.appointment_time) >= new Date());
    const today = upcoming.filter((a) => new Date(a.appointment_time).toDateString() === new Date().toDateString());
    const revenue = appointments
      .filter((a) => a.status !== 'cancelled' && a.service_price)
      .reduce((s, a) => s + Number(a.service_price), 0);
    const weekChart = [0, 0, 0, 0, 0, 0, 0];
    if (appointments.length > 0) {
      const byDay = [0, 0, 0, 0, 0, 0, 0];
      appointments.forEach((a) => {
        const d = new Date(a.appointment_time).getDay();
        const idx = d === 0 ? 6 : d - 1;
        byDay[idx]++;
      });
      for (let i = 0; i < 7; i++) weekChart[i] = byDay[i];
    }
    return {
      total: appointments.length,
      upcoming: upcoming.length,
      today: today.length,
      clients: clients.length,
      services: priceList.filter((p) => p.is_active !== false).length,
      revenue,
      weekChart
    };
  }, [appointments, clients, priceList]);

  const handleProfileUpdate = async () => {
    setSavingProfile(true);
    try {
      const res = await api.put('/master/me/profile', profileForm);
      if (res.data?.address) {
        setProfileForm((prev) => ({
          ...prev,
          address: res.data.address ?? prev.address,
          latitude: res.data.latitude ?? prev.latitude,
          longitude: res.data.longitude ?? prev.longitude,
          yandex_maps_link: res.data.yandex_maps_link ?? prev.yandex_maps_link
        }));
      }
      toast('Профиль сохранён');
      loadData();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка сохранения профиля', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await api.post('/master/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Логотип обновлён');
      loadData();
    } catch {
      toast('Ошибка загрузки логотипа', 'error');
    }
  };

  const handleScheduleSaveAll = async () => {
    setSavingSchedule(true);
    try {
      await api.post('/master/me/schedule', { schedule: scheduleDraft, salonMasterId: selectedSalonMasterId });
      toast('Расписание сохранено');
      loadData();
    } catch {
      toast('Ошибка сохранения расписания', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateScheduleDay = (day, patch) => {
    setScheduleDraft((prev) =>
      prev.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d))
    );
  };

  const handleExceptionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/master/me/exceptions', { ...exceptionForm, salonMasterId: selectedSalonMasterId });
      toast('Исключение добавлено');
      setShowExceptionModal(false);
      setExceptionForm({ exception_date: '', is_working: false, start_time: '09:00', end_time: '18:00' });
      loadData();
    } catch {
      toast('Ошибка сохранения', 'error');
    }
  };

  const handleExceptionDelete = async (id) => {
    if (!confirm('Удалить исключение?')) return;
    try {
      await api.delete(`/master/me/exceptions/${id}`, teamParams());
      toast('Удалено');
      loadData();
    } catch {
      toast('Ошибка удаления', 'error');
    }
  };

  const openPriceModal = (item = null) => {
    if (item) {
      setPriceForm({
        id: item.id,
        name: item.name,
        price: item.price ?? '',
        price_max: item.price_max ?? '',
        price_type: item.price_type || 'fixed',
        duration_minutes: item.duration_minutes,
        is_active: item.is_active !== false,
        image_url: item.image_url
      });
    } else {
      setPriceForm({
        id: null,
        name: '',
        price: '',
        price_max: '',
        price_type: 'fixed',
        duration_minutes: 60,
        is_active: true
      });
    }
    setPriceImage(null);
    setShowPriceModal(true);
  };

  const handlePriceSubmit = async (e) => {
    e.preventDefault();
    const priceNum = Number(priceForm.price);
    const priceMaxNum = priceForm.price_max !== '' ? Number(priceForm.price_max) : null;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast('Укажите корректную стоимость', 'error');
      return;
    }
    if (priceForm.price_type === 'range' && (!Number.isFinite(priceMaxNum) || priceMaxNum < priceNum)) {
      toast('Для диапазона «до» должно быть не меньше «от»', 'error');
      return;
    }
    try {
      setSavingPrice(true);
      let image_url = priceForm.image_url;
      if (priceImage) {
        const fd = new FormData();
        fd.append('image', priceImage);
        const up = await api.post('/master/me/prices/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        image_url = up.data.image_url;
      }
      await api.post('/master/me/prices', {
        id: priceForm.id,
        name: priceForm.name,
        price: priceNum,
        price_max: priceForm.price_type === 'range' ? priceMaxNum : null,
        price_type: priceForm.price_type,
        duration_minutes: Number(priceForm.duration_minutes),
        is_active: priceForm.is_active,
        image_url,
        salonMasterId: selectedSalonMasterId
      });
      toast(priceForm.id ? 'Услуга обновлена' : 'Услуга добавлена');
      setShowPriceModal(false);
      loadData();
    } catch {
      toast('Ошибка сохранения услуги', 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  const handlePriceDelete = async (id) => {
    if (!confirm('Удалить услугу?')) return;
    try {
      await api.delete(`/master/me/prices/${id}`, teamParams());
      toast('Услуга удалена');
      loadData();
    } catch {
      toast('Ошибка удаления', 'error');
    }
  };

  const handlePortfolioUpload = async (e) => {
    e.preventDefault();
    if (!portfolioFile) {
      toast('Выберите файл', 'error');
      return;
    }
    setUploadingPortfolio(true);
    try {
      const fd = new FormData();
      fd.append('media', portfolioFile);
      fd.append('title', portfolioTitle);
      fd.append('salonMasterId', selectedSalonMasterId || '');
      fd.append('media_type', portfolioFile.type.startsWith('video/') ? 'video' : 'image');
      await api.post('/master/me/portfolio', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Медиа добавлено');
      setPortfolioFile(null);
      setPortfolioTitle('');
      loadData();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка загрузки', 'error');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handlePortfolioDelete = async (id) => {
    if (!confirm('Удалить фото?')) return;
    try {
      await api.delete(`/master/me/portfolio/${id}`, teamParams());
      toast('Фото удалено');
      loadData();
    } catch {
      toast('Ошибка удаления', 'error');
    }
  };

  const handleManualBook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appointments', {
        clientName: manualBookForm.clientName,
        clientPhone: manualBookForm.clientPhone,
        serviceName: manualBookForm.serviceName,
        servicePrice: manualBookForm.servicePrice ? Number(manualBookForm.servicePrice) : null,
        appointmentTime: new Date(manualBookForm.appointmentTime).toISOString(),
        duration: Number(manualBookForm.duration) || 60
      });
      toast('Запись создана');
      setShowManualBook(false);
      setManualBookForm({ clientName: '', clientPhone: '', serviceName: '', servicePrice: '', appointmentTime: '', duration: 60 });
      loadData();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка создания записи', 'error');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      const res = await api.post('/master/me/broadcast', { message: broadcastMessage });
      toast(`Рассылка: ${res.data.recipients} получателей`);
      setShowBroadcast(false);
      setBroadcastMessage('');
    } catch {
      toast('Ошибка рассылки', 'error');
    }
  };

  const handleAppointmentStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast('Статус обновлён');
      loadData();
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      await api.put(`/appointments/${cancelTarget.id}`, { status: 'cancelled' });
      toast('Запись отменена. Клиент уведомлён.');
      setCancelTarget(null);
      loadData();
    } catch {
      toast('Ошибка отмены', 'error');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast('Запись удалена');
      loadData();
    } catch {
      toast('Ошибка удаления', 'error');
    }
  };

  const sendClientMessage = async () => {
    if (!clientMessage.trim()) return;
    const target = messageTargetClient || messageTarget;
    if (!target) return;
    try {
      if (messageTargetClient) {
        await api.post(`/master/me/clients/${messageTargetClient.id}/message`, { message: clientMessage });
      } else {
        await api.post(`/appointments/${messageTarget.id}/message`, { message: clientMessage });
      }
      toast('Сообщение отправлено');
      setShowMessageModal(false);
      setClientMessage('');
      setMessageTarget(null);
      setMessageTargetClient(null);
    } catch (err) {
      toast(err.response?.data?.error || 'Не удалось отправить сообщение', 'error');
    }
  };

  const openClientMessage = (client) => {
    setMessageTargetClient(client);
    setMessageTarget(null);
    setClientMessage('');
    setShowMessageModal(true);
  };

  const clientBookingUrl = links?.client?.web || links?.max?.web;

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout
      profile={profile}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      navBadges={navBadges}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    >
      {activeSection === 'overview' && (
        <div className="space-y-5">
          {clientBookingUrl && (
            <BookingLinkCard
              url={clientBookingUrl}
              salonName={profile?.salon_name || profile?.name}
              onCopied={(msg, tone) => toast(msg, tone || 'success')}
              onQrError={(msg) => toast(msg, 'error')}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Сегодня" value={stats.today} trend={stats.today > 0 ? '+' : undefined} />
            <StatCard label="Клиенты" value={stats.clients} />
            <StatCard label="Выручка" value={formatPrice(stats.revenue)} accent="text-admin-accent" />
            <StatCard label="Услуги" value={stats.services} />
          </div>

          <Card>
            <CardHeader title="Записи на сегодня" action={<Button size="sm" variant="soft" onClick={() => setActiveSection('appointments')}>Все</Button>} />
            {appointments.filter((a) => {
              const d = new Date(a.appointment_time);
              return d.toDateString() === new Date().toDateString() && a.status === 'confirmed';
            }).length === 0 ? (
              <p className="text-sm text-admin-textMuted py-4 text-center">На сегодня записей нет</p>
            ) : (
              <ul className="space-y-2">
                {appointments
                  .filter((a) => {
                    const d = new Date(a.appointment_time);
                    return d.toDateString() === new Date().toDateString();
                  })
                  .slice(0, 6)
                  .map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between gap-3 rounded-xl bg-admin-surface px-4 py-3 border border-admin-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold text-admin-accent shrink-0">
                          {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-admin-text truncate">{apt.client_name || 'Клиент'}</p>
                          <p className="text-xs text-admin-textMuted truncate">{apt.service_name}</p>
                        </div>
                      </div>
                      <Badge tone={apt.status === 'confirmed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'warning'}>
                        {STATUS_LABELS[apt.status]?.label || apt.status}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Последние клиенты" action={<Button size="sm" variant="ghost" onClick={() => setActiveSection('clients')}>Все</Button>} />
            {clients.length === 0 ? (
              <p className="text-sm text-admin-textMuted">Клиентов пока нет</p>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClientId(c.id)}
                    className="flex items-center gap-3 rounded-xl bg-admin-surface p-3 w-full text-left hover:bg-admin-hover transition border border-admin-border"
                  >
                    <ClientAvatar client={c} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-admin-text truncate">{c.display_name || c.name || 'Клиент'}</p>
                      <p className="text-xs text-admin-textMuted truncate">{c.phone || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeSection === 'analytics' && (
        <AnalyticsSection api={api} toast={toast} />
      )}

      {activeSection === 'appointments' && (
        <Card>
          <CardHeader
            title="Записи"
            description="Управление визитами клиентов"
            action={<Button onClick={() => setShowManualBook(true)}>+ Новая запись</Button>}
          />
          {appointments.length === 0 ? (
            <EmptyState icon="◷" title="Записей пока нет" description="Клиенты появятся после бронирования по вашей ссылке или ручного добавления" actionLabel="Записать клиента" onAction={() => setShowManualBook(true)} />
          ) : (
            <div className="divide-y divide-gray-100">
              {(() => {
                // Group appointments by date
                const groups = {};
                const sorted = [...appointments].sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));
                sorted.forEach((apt) => {
                  const day = new Date(apt.appointment_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                  if (!groups[day]) groups[day] = [];
                  groups[day].push(apt);
                });

                return Object.entries(groups).map(([day, dayAppts]) => (
                  <div key={day}>
                    {/* Day header */}
                    <div className="sticky top-0 bg-admin-bg z-10 px-4 py-2">
                      <p className="text-xs font-bold text-admin-textSecondary uppercase tracking-wide">{day}</p>
                    </div>
                    {/* Appointments for this day */}
                    {dayAppts.map((apt) => {
                      const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
                      const isConfirmed = apt.status === 'confirmed';
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => { setSelectedAppointment(apt); setShowAppointmentDetail(true); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-admin-bg transition"
                        >
                          {/* Time */}
                          <div className="shrink-0 w-12 text-center">
                            <p className="text-sm font-bold text-admin-accent">
                              {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-admin-accent to-purple-400 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">
                              {(apt.client_name || 'Г')[0].toUpperCase()}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-admin-text truncate">{apt.client_name || 'Гость'}</p>
                            <p className="text-xs text-admin-textMuted truncate">{apt.service_name}</p>
                          </div>

                          {/* Status */}
                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            st.tone === 'success' ? 'bg-green-100 text-green-700' :
                            st.tone === 'danger' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {st.label}
                          </span>

                          {/* Arrow */}
                          <ChevronRight size={14} className="text-admin-textMuted shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'reviews' && (
        <ReviewsSection api={api} toast={toast} onBadgesChange={refreshNavBadges} />
      )}

      {activeSection === 'invites' && (
        <RepeatInvitesSection api={api} toast={toast} />
      )}

      {activeSection === 'clients' && (
        <Card>
          <CardHeader title="Клиенты" description="Все, кто записывался к вам" action={<Button onClick={() => setShowBroadcast(true)}>Рассылка</Button>} />
          {clients.length === 0 ? (
            <EmptyState icon="◎" title="Клиентов пока нет" description="Они появятся после входа через MAX или Telegram" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  onOpen={(client) => setSelectedClientId(client.id)}
                  onMessage={openClientMessage}
                  onDelete={setClientDeleteTarget}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'team' && (
        <SalonMastersSection masters={salonMasters} api={api} onChanged={loadData} toast={toast} />
      )}

      {activeSection === 'schedule' && (
        <ScheduleSection
          scheduleDraft={scheduleDraft}
          exceptions={exceptions}
          salonMasters={salonMasters}
          selectedSalonMasterId={selectedSalonMasterId}
          onMasterChange={handleTeamMasterChange}
          onDayChange={updateScheduleDay}
          onSave={handleScheduleSaveAll}
          onExceptionDelete={handleExceptionDelete}
          onAddException={() => {
            setExceptionForm({ exception_date: '', is_working: false, start_time: '09:00', end_time: '18:00' });
            setShowExceptionModal(true);
          }}
          saving={savingSchedule}
          api={api}
          toast={toast}
        />
      )}

      {activeSection === 'prices' && (
        <Card className="overflow-hidden">
          <div className="mb-4 pb-4 border-b border-admin-border">
            <TeamMasterSelect
              masters={salonMasters}
              value={selectedSalonMasterId}
              onChange={handleTeamMasterChange}
            />
          </div>
          <CardHeader title="Услуги и прайс" description="Прайс привязан к выбранному мастеру" action={<Button onClick={() => openPriceModal()}>+ Услуга</Button>} />
          {priceList.length === 0 ? (
            <EmptyState icon="◇" title="Прайс пуст" description="Добавьте услуги с ценой и длительностью" actionLabel="Добавить услугу" onAction={() => openPriceModal()} />
          ) : (
            <div className="space-y-3">
              {priceList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-admin-border p-4 transition hover:border-admin-accent/50 md:flex md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {item.image_url && (
                      <img
                        src={mediaUrl(item.image_url)}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-semibold leading-snug text-admin-text">{item.name}</p>
                        {item.is_active === false && <Badge tone="neutral">Скрыта</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-admin-textMuted">{item.duration_minutes} мин</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 border-t border-admin-border pt-3 md:mt-0 md:shrink-0 md:flex-row md:items-center md:gap-3 md:border-0 md:pt-0">
                    <p className="font-display text-lg font-bold tabular-nums text-admin-accent md:whitespace-nowrap">
                      {formatServicePrice(item)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full md:w-auto"
                        onClick={() => openPriceModal(item)}
                      >
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="w-full md:w-auto"
                        onClick={() => handlePriceDelete(item.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeSection === 'portfolio' && (
        <div className="space-y-6">
          <TeamMasterSelect
            masters={salonMasters}
            value={selectedSalonMasterId}
            onChange={handleTeamMasterChange}
          />
          <Card>
            <CardHeader title="Загрузить медиа" description="Фото или видео появятся на странице записи" />
            <form onSubmit={handlePortfolioUpload} className="space-y-4">
              <Input
                label="Подпись"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
                placeholder="Работа, кабинет, процесс..."
              />

              {/* File Drop Zone */}
              <div>
                <label className="label-field">Файл</label>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${portfolioFile ? 'border-admin-accent bg-admin-accentSoft' : 'border-admin-border hover:border-admin-accent/50 hover:bg-admin-bg'}`}>
                  {portfolioFile ? (
                    <div className="flex flex-col items-center gap-2 p-4">
                      {portfolioFile.type.startsWith('video/') ? (
                        <video src={URL.createObjectURL(portfolioFile)} className="h-16 w-16 object-cover rounded-lg" />
                      ) : (
                        <img src={URL.createObjectURL(portfolioFile)} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-admin-text truncate max-w-[200px]">{portfolioFile.name}</p>
                        <p className="text-xs text-admin-textMuted">{(portfolioFile.size / 1024 / 1024).toFixed(2)} МБ</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setPortfolioFile(null); }}
                        className="text-xs text-danger hover:underline"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <div className="w-12 h-12 rounded-full bg-admin-bg flex items-center justify-center">
                        <svg className="w-6 h-6 text-admin-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-admin-textMuted">Нажмите или перетащите файл сюда</p>
                      <p className="text-xs text-admin-textMuted">JPG, PNG, MP4 — до 50 МБ</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {uploadingPortfolio && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-admin-textMuted">Загрузка...</span>
                    <span className="text-admin-accent font-semibold">100%</span>
                  </div>
                  <div className="w-full h-2 bg-admin-bg rounded-full overflow-hidden">
                    <div className="h-full bg-admin-accent rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                loading={uploadingPortfolio}
                disabled={!portfolioFile}
                className="w-full"
              >
                Загрузить
              </Button>
            </form>
          </Card>
          <Card>
            {portfolio.length === 0 ? (
              <EmptyState icon="▤" title="Медиа пока нет" description="Добавьте фото или видео для главной клиентской страницы" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {portfolio.map((item) => (
                  <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-admin-surface border border-admin-border">
                    {item.media_type === 'video' ? (
                      <video src={mediaUrl(item.video_url)} className="h-full w-full object-cover" muted />
                    ) : item.media_type === 'external_video' ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-admin-bg p-4 text-center text-admin-textMuted">
                        <span className="text-3xl">▶</span>
                        <span className="mt-2 text-xs break-all">{item.video_url}</span>
                      </div>
                    ) : (
                      <img src={mediaUrl(item.image_url)} alt={item.title} className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold uppercase text-white">
                      {item.media_type === 'image' ? 'Фото' : 'Видео'}
                    </span>
                    {item.title && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="text-white text-sm font-medium">{item.title}</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handlePortfolioDelete(item.id)}
                        className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-danger/90 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeSection === 'themes' && (
        <ThemesSection
          currentThemeId={profile?.client_theme}
          onSave={async (themeId) => {
            const res = await api.put('/master/me/client-theme', { client_theme: themeId });
            setProfile((prev) => ({ ...prev, client_theme: res.data.client_theme }));
          }}
          toast={toast}
        />
      )}

      {activeSection === 'links' && links && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-admin-text">Ссылка для клиентов</h1>
            <p className="mt-1 text-sm text-admin-textSecondary">
              Одна ссылка для соцсетей, визитки и QR. На странице клиент сам выберет вход через Telegram или MAX.
            </p>
          </div>

          <BookingLinkCard
            url={links.client?.web || links.max?.web}
            salonName={profile?.salon_name || profile?.name}
            onCopied={(msg, tone) => toast(msg, tone || 'success')}
            onQrError={(msg) => toast(msg, 'error')}
          />
        </div>
      )}

      {activeSection === 'billing' && (
        <BillingSection api={api} toast={toast} />
      )}

      {activeSection === 'blacklist' && (
        <BlacklistSection api={api} toast={toast} />
      )}

      {activeSection === 'profile' && (
        <div className="space-y-4">
          {/* Page header */}
          <div>
            <h1 className="text-xl font-bold text-admin-text">Настройки профиля</h1>
            <p className="text-sm text-admin-textSecondary mt-0.5">Всё, что видит клиент на вашей странице записи</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-admin-bg rounded-xl p-1">
            {[
              { id: 'main', label: 'Профиль' },
              { id: 'contacts', label: 'Контакты' },
              { id: 'socials', label: 'Соцсети' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border-2 ${
                  profileTab === tab.id
                    ? 'bg-white text-admin-accent border-admin-accent shadow-sm'
                    : 'text-admin-textSecondary border-transparent hover:text-admin-text hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="rounded-xl bg-white border border-admin-border shadow-sm">

            {/* TAB: Main profile */}
            {profileTab === 'main' && (
              <div className="p-5 pb-8 space-y-6">
                {/* Logo + Identity */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                  <div className="h-20 w-20 rounded-2xl bg-admin-bg overflow-hidden flex items-center justify-center shrink-0 border-2 border-dashed border-admin-border">
                    {profile?.logo_url ? (
                      <img src={mediaUrl(profile.logo_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-display font-bold text-admin-accent">{profile?.name?.[0] || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-admin-text mb-1">Логотип</p>
                    <p className="text-xs text-admin-textSecondary mb-2">Рекомендуемый размер 256×256 px</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-sm file:rounded-lg file:border-0 file:bg-admin-accent file:px-4 file:py-2 file:font-semibold file:text-white file:shadow-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div className="h-px bg-admin-border" />

                {/* Identity fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Имя"
                      value={profileForm.name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                    <Input
                      label="Фамилия"
                      value={profileForm.last_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Название салона"
                    value={profileForm.salon_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, salon_name: e.target.value })}
                    hint="Если указано — показывается только название, без имени мастера"
                  />

                  <Textarea
                    label="Описание"
                    value={profileForm.description || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    rows={3}
                    placeholder="Расскажите клиентам о себе и своих услугах"
                  />

                  <Input
                    label="Телефон"
                    value={profileForm.phone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div className="h-px bg-admin-border" />

                {/* Address */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-admin-text">Адрес</p>
                  <AddressSuggestField
                    api={api}
                    value={profileForm.address || ''}
                    onChange={(address) => setProfileForm({ ...profileForm, address })}
                    onSelect={(geo) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        address: geo.address || prev.address,
                        latitude: geo.latitude,
                        longitude: geo.longitude,
                        yandex_maps_link: geo.yandex_maps_link || prev.yandex_maps_link
                      }))
                    }
                  />
                  {(profileForm.latitude != null && profileForm.longitude != null) && (
                    <div>
                      <p className="label-field mb-2">Метка на карте</p>
                      <AddressMap
                        latitude={profileForm.latitude}
                        longitude={profileForm.longitude}
                        address={profileForm.address}
                        className="h-[180px] w-full rounded-xl border border-admin-border"
                      />
                    </div>
                  )}
                </div>

                <div className="h-px bg-admin-border" />

                <VideoReelCard
                  api={api}
                  toast={toast}
                  videoUrl={profile?.video_reel_url}
                  onChanged={loadData}
                />
              </div>
            )}

            {/* TAB: Contacts (notify settings) */}
            {profileTab === 'contacts' && (
              <div className="p-5">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-admin-text">Каналы уведомлений</p>
                  <p className="text-xs text-admin-textSecondary mt-0.5">Куда приходят заявки и уведомления о записях</p>
                </div>
                <NotifySettingsCard api={api} toast={toast} />
              </div>
            )}

            {/* TAB: Socials */}
            {profileTab === 'socials' && (
              <div className="p-5">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-admin-text">Соцсети и сайт</p>
                  <p className="text-xs text-admin-textSecondary mt-0.5">Отображаются на вашей странице записи</p>
                </div>
                <MasterSocialLinksCard form={profileForm} onChange={setProfileForm} />
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button onClick={handleProfileUpdate} loading={savingProfile} className="w-full sm:w-auto">
              Сохранить
            </Button>
          </div>
        </div>
      )}

      <ServicePriceModal
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        form={priceForm}
        onChange={(patch) => setPriceForm((prev) => ({ ...prev, ...patch }))}
        imageFile={priceImage}
        onImageChange={setPriceImage}
        onSubmit={handlePriceSubmit}
        saving={savingPrice}
      />

      <Modal open={showExceptionModal} onClose={() => setShowExceptionModal(false)} title="Исключение в расписании" footer={
        <>
          <Button variant="secondary" onClick={() => setShowExceptionModal(false)}>Отмена</Button>
          <Button type="submit" form="exception-form">Сохранить</Button>
        </>
      }>
        <form id="exception-form" onSubmit={handleExceptionSubmit} className="space-y-4">
          <Input label="Дата" type="date" required value={exceptionForm.exception_date} onChange={(e) => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={exceptionForm.is_working} onChange={(e) => setExceptionForm({ ...exceptionForm, is_working: e.target.checked })} />
            Особый рабочий день (иначе — выходной)
          </label>
          {exceptionForm.is_working && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="С" type="time" value={exceptionForm.start_time} onChange={(e) => setExceptionForm({ ...exceptionForm, start_time: e.target.value })} />
              <Input label="До" type="time" value={exceptionForm.end_time} onChange={(e) => setExceptionForm({ ...exceptionForm, end_time: e.target.value })} />
            </div>
          )}
        </form>
      </Modal>

      <Modal open={showManualBook} onClose={() => setShowManualBook(false)} title="Запись клиента" size="lg" footer={
        <>
          <Button variant="secondary" onClick={() => setShowManualBook(false)}>Отмена</Button>
          <Button type="submit" form="manual-book-form">Создать</Button>
        </>
      }>
        <form id="manual-book-form" onSubmit={handleManualBook} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Имя" value={manualBookForm.clientName} onChange={(e) => setManualBookForm({ ...manualBookForm, clientName: e.target.value })} />
            <Input label="Телефон" value={manualBookForm.clientPhone} onChange={(e) => setManualBookForm({ ...manualBookForm, clientPhone: e.target.value })} />
          </div>
          <Input label="Услуга" required value={manualBookForm.serviceName} onChange={(e) => setManualBookForm({ ...manualBookForm, serviceName: e.target.value })} list="services-list" />
          <datalist id="services-list">
            {priceList.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Цена" type="number" value={manualBookForm.servicePrice} onChange={(e) => setManualBookForm({ ...manualBookForm, servicePrice: e.target.value })} />
            <Input label="Длительность, мин" type="number" value={manualBookForm.duration} onChange={(e) => setManualBookForm({ ...manualBookForm, duration: e.target.value })} />
            <Input label="Дата и время" type="datetime-local" required value={manualBookForm.appointmentTime} onChange={(e) => setManualBookForm({ ...manualBookForm, appointmentTime: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="Рассылка" description="Сообщение уйдёт клиентам в MAX или Telegram" footer={
        <>
          <Button variant="secondary" onClick={() => setShowBroadcast(false)}>Отмена</Button>
          <Button onClick={handleBroadcast}>Отправить</Button>
        </>
      }>
        <Textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Текст сообщения..." rows={5} />
      </Modal>

      <ClientDetailModal
        clientId={selectedClientId}
        api={api}
        onClose={() => setSelectedClientId(null)}
        toast={toast}
        onSaved={async () => {
          try {
            const res = await api.get('/master/me/clients');
            setClients(res.data);
          } catch { /* ignore */ }
        }}
        onMessage={(client) => {
          setSelectedClientId(null);
          openClientMessage(client);
        }}
        onRepeatInvite={async (client) => {
          try {
            await api.post(`/master/me/clients/${client.id}/repeat-invite`);
            toast('Приглашение отправлено');
          } catch (err) {
            toast(err.response?.data?.error || 'Ошибка отправки', 'error');
          }
        }}
      />

      <Modal
        open={!!clientDeleteTarget}
        onClose={() => !deletingClient && setClientDeleteTarget(null)}
        title="Удалить клиента из базы?"
        description={clientDeleteTarget?.display_name || clientDeleteTarget?.name || 'Клиент'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClientDeleteTarget(null)} disabled={deletingClient}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDeleteClient} loading={deletingClient}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-admin-textSecondary">
          Клиент исчезнет из раздела «Клиенты». История записей и сообщения не удаляются.
        </p>
      </Modal>

      <Modal open={showMessageModal} onClose={() => { setShowMessageModal(false); setMessageTargetClient(null); }} title="Сообщение клиенту" footer={
        <>
          <Button variant="secondary" onClick={() => setShowMessageModal(false)}>Отмена</Button>
          <Button onClick={sendClientMessage}>Отправить</Button>
        </>
      }>
        <Textarea value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} placeholder="Напоминание или уточнение..." rows={4} />
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal
        open={showAppointmentDetail}
        onClose={() => { setShowAppointmentDetail(false); setSelectedAppointment(null); }}
        title="Запись"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAppointmentDetail(false)}>Закрыть</Button>
            {selectedAppointment?.status === 'confirmed' && (
              <>
                <Button onClick={() => { handleAppointmentStatus(selectedAppointment.id, 'completed'); setShowAppointmentDetail(false); }}>Завершить</Button>
                <Button variant="danger" onClick={() => { setCancelTarget(selectedAppointment); setShowAppointmentDetail(false); }}>Отменить</Button>
              </>
            )}
          </>
        }
      >
        {selectedAppointment && (() => {
          const apt = selectedAppointment;
          const st = STATUS_LABELS[apt.status] || STATUS_LABELS.confirmed;
          return (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  st.tone === 'success' ? 'bg-green-100 text-green-700' :
                  st.tone === 'danger' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {st.label}
                </span>
                <p className="text-sm text-admin-textMuted">
                  {new Date(apt.appointment_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                </p>
              </div>

              {/* Service info */}
              <div className="rounded-xl bg-admin-bg p-4">
                <p className="font-semibold text-admin-text">{apt.service_name}</p>
                <p className="text-sm text-admin-accent font-bold mt-1">{formatPrice(apt.service_price)}</p>
                <p className="text-sm text-admin-textMuted mt-1">
                  {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {apt.salon_master_name && (
                  <p className="text-xs text-admin-textMuted mt-1">Мастер: {apt.salon_master_name}</p>
                )}
              </div>

              {/* Client info */}
              <div>
                <p className="text-xs font-bold text-admin-textSecondary uppercase tracking-wide mb-2">Клиент</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-admin-accent to-purple-400 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{(apt.client_name || 'Г')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-admin-text">{apt.client_name || 'Гость'}</p>
                    {apt.client_messenger === 'telegram' ? (
                      <span className="text-xs text-sky-500 font-medium">Telegram</span>
                    ) : (
                      <span className="text-xs text-blue-500 font-medium">MAX</span>
                    )}
                  </div>
                </div>

                {/* Contact buttons */}
                <div className="flex flex-wrap gap-2">
                  {apt.client_phone && (
                    <a
                      href={`tel:${apt.client_phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium hover:bg-green-100 transition"
                    >
                      <Phone size={14} />
                      {apt.client_phone}
                    </a>
                  )}
                  {apt.client_messenger === 'telegram' && apt.telegram_user_id && (
                    <a
                      href={`https://t.me/${apt.telegram_user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100 transition"
                    >
                      <Send size={14} />
                      Написать в TG
                    </a>
                  )}
                  {apt.client_messenger === 'max' && apt.max_user_id && (
                    <a
                      href={`https://max.ru/${apt.max_user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-100 transition"
                    >
                      <MessageCircle size={14} />
                      Написать в MAX
                    </a>
                  )}
                </div>
              </div>

              {apt.notes && (
                <div>
                  <p className="text-xs font-bold text-admin-textSecondary uppercase tracking-wide mb-1">Заметка</p>
                  <p className="text-sm text-admin-textMuted">{apt.notes}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Отменить запись?" footer={
        <>
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>Не отменять</Button>
          <Button onClick={handleCancelAppointment}>Отменить запись</Button>
        </>
      }>
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-admin-text">
              Запись клиента <strong>{cancelTarget.client_name || 'Гость'}</strong> на <strong>{cancelTarget.service_name}</strong> будет отменена.
            </p>
            <p className="text-sm text-admin-textMuted">
              Клиент получит уведомление об отмене в Telegram или MAX.
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
