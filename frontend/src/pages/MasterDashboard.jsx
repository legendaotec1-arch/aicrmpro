import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AuthContext } from '../App';
import { useToast } from '../context/ToastContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import BookingLinkCard from '../components/dashboard/BookingLinkCard';
import { DAYS, STATUS_LABELS, formatDate, formatDateTime, formatPrice, formatServicePrice } from '../lib/format';
import { mediaUrl } from '../lib/media';
import TeamMasterSelect from '../components/dashboard/TeamMasterSelect';
import SalonMastersSection from '../components/dashboard/SalonMastersSection';
import ClientDetailModal from '../components/dashboard/ClientDetailModal';
import ClientsSection from '../components/dashboard/ClientsSection';
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
import InstallPwaBanner, { showInstallPwaBanner } from '../components/pwa/InstallPwaBanner';
import VideoReelCard from '../components/dashboard/VideoReelCard';
import ServicePriceModal from '../components/dashboard/ServicePriceModal';
import OverviewStatsCard from '../components/dashboard/OverviewStatsCard';
import RecentClientsCard from '../components/dashboard/RecentClientsCard';
import AppointmentsSection from '../components/dashboard/AppointmentsSection';
import PortfolioSection from '../components/dashboard/PortfolioSection';
import ManualBookModal from '../components/dashboard/ManualBookModal';
import AppointmentDetailModal from '../components/dashboard/AppointmentDetailModal';
import { appointmentClientForAvatar } from '../lib/appointments';
import { MASTER_SOCIAL_FIELDS } from '../lib/socialLinks';
import { RUSSIAN_TIMEZONES, DEFAULT_TIMEZONE } from '../lib/timezone';

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
  const isTeamMember = user?.role === 'team';
  const TEAM_SECTIONS = useMemo(
    () => new Set(['overview', 'appointments', 'clients', 'schedule', 'prices', 'profile']),
    []
  );
  const profileTabs = useMemo(
    () =>
      isTeamMember
        ? [{ id: 'portfolio', label: 'Портфолио' }]
        : [
            { id: 'main', label: 'Профиль' },
            { id: 'portfolio', label: 'Портфолио' },
            { id: 'contacts', label: 'Контакты' },
            { id: 'socials', label: 'Соцсети' }
          ],
    [isTeamMember]
  );

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

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null);
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
  const [messageChannel, setMessageChannel] = useState(null);
  const [appointmentContact, setAppointmentContact] = useState(null);
  const [resolvingAppointmentId, setResolvingAppointmentId] = useState(null);
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

  const loadPortfolio = useCallback(async () => {
    const res = await api.get('/master/me/portfolio');
    setPortfolio(res.data);
  }, [api]);

  const loadTeamScoped = useCallback(
    async (teamId) => {
      if (!teamId) return;
      const params = { params: { salonMasterId: teamId } };
      const [scheduleRes, pricesRes, exceptionsRes] = await Promise.all([
        api.get('/master/me/schedule', params),
        api.get('/master/me/prices', params),
        api.get('/master/me/exceptions', params)
      ]);
      setScheduleDraft(buildScheduleDraft(scheduleRes.data));
      setPriceList(pricesRes.data);
      setExceptions(exceptionsRes.data);
    },
    [api]
  );

  const loadData = useCallback(async () => {
    try {
      const [appointmentsRes, clientsRes, linkRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/master/me/clients'),
        api.get('/master/me/link')
      ]);
      setAppointments(appointmentsRes.data);
      setClients(clientsRes.data);
      setLinks(linkRes.data.links);
      await loadPortfolio();

      if (isTeamMember && user?.salonMasterId) {
        setProfile({
          name: user.name,
          salon_name: user.salon_name,
          logo_url: user.logo_url
        });
        setSelectedSalonMasterId(user.salonMasterId);
        await loadTeamScoped(user.salonMasterId);
        return;
      }

      const [profileRes, teamRes] = await Promise.all([
        api.get('/master/me/profile'),
        api.get('/master/me/salon-masters')
      ]);
      const profileData = profileRes.data;
      const socialDefaults = Object.fromEntries(
        MASTER_SOCIAL_FIELDS.map((f) => [f.key, profileData[f.key] ?? ''])
      );
      setProfile(profileData);
      setProfileForm({ ...profileData, ...socialDefaults });

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
  }, [api, toast, loadTeamScoped, loadPortfolio, selectedSalonMasterId, isTeamMember, user]);

  const handleTeamMasterChange = async (teamId) => {
    if (isTeamMember) return;
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
    if (section === 'portfolio') {
      setActiveSection('profile');
      setProfileTab('portfolio');
      setSearchParams({ section: 'profile' }, { replace: true });
      return;
    }
    if (section === 'links') {
      setActiveSection('overview');
      setSearchParams({}, { replace: true });
      return;
    }
    if (section === 'blacklist') {
      setActiveSection('clients');
      setSearchParams({ section: 'clients', tab: 'blacklist' }, { replace: true });
      return;
    }
    if (section) {
      if (isTeamMember && !TEAM_SECTIONS.has(section)) {
        setActiveSection('overview');
      } else {
        setActiveSection(section);
        if (section === 'profile' && isTeamMember) {
          setProfileTab('portfolio');
        }
      }
    }
  }, [searchParams, isTeamMember, TEAM_SECTIONS, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('pwa') === '1') {
      showInstallPwaBanner();
      const next = new URLSearchParams(searchParams);
      next.delete('pwa');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSectionChange = useCallback(
    (id) => {
      if (isTeamMember && !TEAM_SECTIONS.has(id)) return;
      setActiveSection(id);
      if (id === 'profile' && isTeamMember) {
        setProfileTab('portfolio');
      }
      if (id === 'overview') setSearchParams({});
      else setSearchParams({ section: id });
    },
    [setSearchParams, isTeamMember, TEAM_SECTIONS]
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
    } catch (err) {
      toast(err?.response?.data?.error || 'Ошибка сохранения', 'error');
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
      await api.delete(`/master/me/portfolio/${id}`);
      toast('Фото удалено');
      loadData();
    } catch {
      toast('Ошибка удаления', 'error');
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

  const openResolveAppointment = (aptOrId, status) => {
    const apt =
      typeof aptOrId === 'string' ? appointments.find((a) => a.id === aptOrId) : aptOrId;
    if (!apt) return;
    setResolveTarget({ apt, status });
    setShowAppointmentDetail(false);
  };

  const confirmResolveAppointment = async () => {
    if (!resolveTarget) return;
    const { apt, status } = resolveTarget;
    setResolvingAppointmentId(`${apt.id}-${status}`);
    try {
      await api.put(`/appointments/${apt.id}`, { status });
      toast(status === 'completed' ? 'Визит завершён' : 'Отмечена неявка');
      setResolveTarget(null);
      setSelectedAppointment(null);
      loadData();
    } catch {
      toast('Не удалось обновить запись', 'error');
    } finally {
      setResolvingAppointmentId(null);
    }
  };

  const openAppointmentDetail = (apt) => {
    setSelectedAppointment(apt);
    setAppointmentContact(null);
    setShowAppointmentDetail(true);
  };

  useEffect(() => {
    if (!showAppointmentDetail || !selectedAppointment?.id) {
      setAppointmentContact(null);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/appointments/${selectedAppointment.id}/contact`)
      .then((res) => {
        if (!cancelled) setAppointmentContact(res.data);
      })
      .catch(() => {
        if (!cancelled) setAppointmentContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, showAppointmentDetail, selectedAppointment?.id]);

  const openCancelAppointment = (apt) => {
    setCancelTarget(apt);
    setCancelReason('');
    setShowAppointmentDetail(false);
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    try {
      await api.put(`/appointments/${cancelTarget.id}`, {
        status: 'cancelled',
        cancelReason: cancelReason.trim()
      });
      toast('Запись отменена. Клиент уведомлён.');
      setCancelTarget(null);
      setCancelReason('');
      setSelectedAppointment(null);
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
        await api.post(`/master/me/clients/${messageTargetClient.id}/message`, {
          message: clientMessage,
          channel: messageChannel || 'all'
        });
      } else {
        await api.post(`/appointments/${messageTarget.id}/message`, { message: clientMessage });
      }
      toast('Сообщение отправлено');
      setShowMessageModal(false);
      setClientMessage('');
      setMessageTarget(null);
      setMessageTargetClient(null);
      setMessageChannel(null);
    } catch (err) {
      toast(err.response?.data?.error || 'Не удалось отправить сообщение', 'error');
    }
  };

  const openAppointmentMessage = (apt) => {
    setMessageTarget(apt);
    setMessageTargetClient(null);
    setClientMessage('');
    setShowMessageModal(true);
  };

  const openClientMessage = (client, channel = null) => {
    setMessageTargetClient(client);
    setMessageTarget(null);
    setMessageChannel(channel);
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
      isTeamMember={isTeamMember}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    >
      <InstallPwaBanner />
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {clientBookingUrl && (
            <BookingLinkCard
              url={clientBookingUrl}
              salonName={profile?.salon_name || profile?.name}
              onCopied={(msg, tone) => toast(msg, tone || 'success')}
              onQrError={(msg) => toast(msg, 'error')}
            />
          )}

          <OverviewStatsCard api={api} isTeamMember={isTeamMember} />

          <div className="grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="Записи на сегодня" action={<Button size="sm" variant="soft" onClick={() => setActiveSection('appointments')}>Все</Button>} />
            {(() => {
              const todayAppointments = appointments
                .filter((a) => {
                  const d = new Date(a.appointment_time);
                  return d.toDateString() === new Date().toDateString() && a.status === 'confirmed';
                })
                .sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));

              if (todayAppointments.length === 0) {
                return <p className="text-sm text-admin-textMuted py-4 text-center">На сегодня записей нет</p>;
              }

              return (
                <ul className="space-y-2">
                  {todayAppointments.map((apt) => (
                    <li key={apt.id}>
                      <button
                        type="button"
                        onClick={() => openAppointmentDetail(apt)}
                        className="flex w-full items-center gap-3 rounded-xl border border-admin-border/80 bg-gradient-to-r from-white to-violet-50/30 px-4 py-3 text-left transition hover:border-admin-accent/30 hover:bg-violet-50/50"
                      >
                        <div className="shrink-0 text-center">
                          <p className="text-[11px] font-medium text-admin-textMuted">
                            {new Date(apt.appointment_time).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-sm font-bold text-admin-accent">
                            {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <ClientAvatar client={appointmentClientForAvatar(apt)} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-admin-text truncate">{apt.client_name || 'Клиент'}</p>
                          <p className="text-xs text-admin-textMuted truncate">{apt.service_name}</p>
                        </div>
                        <ChevronRight size={14} className="text-admin-textMuted shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>

          <RecentClientsCard
            clients={clients}
            onOpenClient={(c) => setSelectedClientId(c.id)}
            onShowAll={() => setActiveSection('clients')}
          />
          </div>
        </div>
      )}

      {activeSection === 'analytics' && (
        <AnalyticsSection api={api} toast={toast} />
      )}

      {activeSection === 'appointments' && (
        <AppointmentsSection
          appointments={appointments}
          onManualBook={() => setShowManualBook(true)}
          onOpenDetail={openAppointmentDetail}
          onResolve={openResolveAppointment}
          resolvingId={resolvingAppointmentId}
        />
      )}

      {activeSection === 'reviews' && (
        <ReviewsSection api={api} toast={toast} onBadgesChange={refreshNavBadges} />
      )}

      {activeSection === 'invites' && (
        <RepeatInvitesSection api={api} toast={toast} />
      )}

      {activeSection === 'clients' && (
        <ClientsSection
          clients={clients}
          api={api}
          toast={toast}
          initialTab={searchParams.get('tab') === 'blacklist' ? 'blacklist' : 'clients'}
          onTabChange={(tab) => {
            if (tab === 'blacklist') setSearchParams({ section: 'clients', tab: 'blacklist' });
            else setSearchParams({ section: 'clients' });
          }}
          onOpen={(client) => setSelectedClientId(client.id)}
          onMessage={openClientMessage}
          onDelete={setClientDeleteTarget}
          onBroadcast={() => setShowBroadcast(true)}
        />
      )}

      {activeSection === 'team' && !isTeamMember && (
        <SalonMastersSection masters={salonMasters} api={api} onChanged={loadData} toast={toast} />
      )}

      {activeSection === 'schedule' && (
        <ScheduleSection
          scheduleDraft={scheduleDraft}
          exceptions={exceptions}
          salonMasters={isTeamMember ? [] : salonMasters}
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
          {!isTeamMember && (
            <div className="mb-4 pb-4 border-b border-admin-border">
              <TeamMasterSelect
                masters={salonMasters}
                value={selectedSalonMasterId}
                onChange={handleTeamMasterChange}
              />
            </div>
          )}
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

      {activeSection === 'billing' && (
        <BillingSection api={api} toast={toast} />
      )}

      {activeSection === 'profile' && (
        <div className="space-y-4">
          {/* Page header */}
          <div>
            <h1 className="text-xl font-bold text-admin-text">Настройки профиля</h1>
            <p className="text-sm text-admin-textSecondary mt-0.5">Всё, что видит клиент на вашей странице записи</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto bg-admin-bg rounded-xl p-1">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id)}
                className={`flex-1 min-w-[88px] py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap ${
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

            {profileTab === 'portfolio' && (
              <div className="p-5 pb-8">
                <PortfolioSection
                  portfolio={portfolio}
                  portfolioTitle={portfolioTitle}
                  portfolioFile={portfolioFile}
                  uploadingPortfolio={uploadingPortfolio}
                  onTitleChange={setPortfolioTitle}
                  onFileChange={setPortfolioFile}
                  onClearFile={() => setPortfolioFile(null)}
                  onUpload={handlePortfolioUpload}
                  onDelete={handlePortfolioDelete}
                />
              </div>
            )}

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

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-admin-text">Часовой пояс</p>
                  <p className="text-xs text-admin-textMuted">
                    График работы и запись клиентов считаются по этому времени. Клиенты увидят слоты в вашем поясе.
                  </p>
                  <select
                    className="w-full rounded-xl border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                    value={profileForm.timezone || DEFAULT_TIMEZONE}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                  >
                    {RUSSIAN_TIMEZONES.map((tz) => (
                      <option key={tz.id} value={tz.id}>{tz.label}</option>
                    ))}
                  </select>
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

          {(profileTab === 'main' || profileTab === 'socials') && (
            <div className="pt-2">
              <Button onClick={handleProfileUpdate} loading={savingProfile} className="w-full sm:w-auto">
                Сохранить
              </Button>
            </div>
          )}
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
          <Input
            label="Дата"
            type="date"
            required
            min={new Date().toLocaleDateString('en-CA')}
            value={exceptionForm.exception_date}
            onChange={(e) => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={exceptionForm.is_working} onChange={(e) => setExceptionForm({ ...exceptionForm, is_working: e.target.checked })} />
            Короткий рабочий день (иначе — выходной, слотов не будет)
          </label>
          {exceptionForm.is_working && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="С" type="time" required value={exceptionForm.start_time} onChange={(e) => setExceptionForm({ ...exceptionForm, start_time: e.target.value })} />
              <Input label="До" type="time" required value={exceptionForm.end_time} onChange={(e) => setExceptionForm({ ...exceptionForm, end_time: e.target.value })} />
            </div>
          )}
          <p className="text-xs text-admin-textMuted">
            Прошедшие даты удаляются автоматически на следующий день.
          </p>
        </form>
      </Modal>

      <ManualBookModal
        open={showManualBook}
        onClose={() => setShowManualBook(false)}
        clients={clients}
        salonMasters={salonMasters}
        isTeamMember={isTeamMember}
        salonMasterId={isTeamMember ? user?.salonMasterId : selectedSalonMasterId || salonMasters[0]?.id}
        api={api}
        toast={toast}
        onSuccess={loadData}
      />

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
        onMessage={(client, channel) => {
          openClientMessage(client, channel);
        }}
        onRepeatInvite={async (client) => {
          const res = await api.post(`/master/me/clients/${client.id}/repeat-invite`);
          return res.data;
        }}
        onDelete={(id) => {
          setClients((items) => items.filter((item) => item.id !== id));
          setSelectedClientId(null);
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

      <Modal open={showMessageModal} onClose={() => { setShowMessageModal(false); setMessageTargetClient(null); setMessageChannel(null); }} title={
        messageChannel === 'telegram' ? 'Сообщение в Telegram' :
        messageChannel === 'max' ? 'Сообщение в MAX' :
        'Сообщение клиенту'
      } footer={
        <>
          <Button variant="secondary" onClick={() => setShowMessageModal(false)}>Отмена</Button>
          <Button onClick={sendClientMessage}>Отправить</Button>
        </>
      }>
        <Textarea value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} placeholder="Напоминание или уточнение..." rows={4} />
      </Modal>

      <AppointmentDetailModal
        open={showAppointmentDetail}
        appointment={selectedAppointment}
        contact={appointmentContact}
        onClose={() => {
          setShowAppointmentDetail(false);
          setSelectedAppointment(null);
        }}
        onComplete={() => openResolveAppointment(selectedAppointment, 'completed')}
        onCancel={() => openCancelAppointment(selectedAppointment)}
        onMessage={openAppointmentMessage}
      />

      <Modal
        open={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title={resolveTarget?.status === 'completed' ? 'Завершить запись?' : 'Отметить неявку?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveTarget(null)}>
              Отмена
            </Button>
            <Button
              variant={resolveTarget?.status === 'no_show' ? 'danger' : 'primary'}
              onClick={confirmResolveAppointment}
              loading={!!resolveTarget && resolvingAppointmentId === `${resolveTarget.apt.id}-${resolveTarget.status}`}
            >
              {resolveTarget?.status === 'completed' ? 'Завершить' : 'Не пришёл'}
            </Button>
          </>
        }
      >
        {resolveTarget && (
          <div className="space-y-3">
            <p className="text-admin-text">
              {resolveTarget.status === 'completed' ? (
                <>
                  Подтвердите завершение визита клиента{' '}
                  <strong>{resolveTarget.apt.client_name || 'Гость'}</strong> —{' '}
                  <strong>{resolveTarget.apt.service_name}</strong>.
                </>
              ) : (
                <>
                  Отметить, что клиент <strong>{resolveTarget.apt.client_name || 'Гость'}</strong> не пришёл на{' '}
                  <strong>{resolveTarget.apt.service_name}</strong>?
                </>
              )}
            </p>
            <p className="text-sm text-admin-textMuted">
              {new Date(resolveTarget.apt.appointment_time).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        title="Отменить запись?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
            >
              Не отменять
            </Button>
            <Button onClick={handleCancelAppointment} disabled={!cancelReason.trim()}>
              Отменить запись
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-admin-text">
              Запись клиента <strong>{cancelTarget.client_name || 'Гость'}</strong> на{' '}
              <strong>{cancelTarget.service_name}</strong> будет отменена.
            </p>
            <p className="text-sm text-admin-textMuted">
              {new Date(cancelTarget.appointment_time).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <Textarea
              label="Причина отмены"
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Например: мастер заболел, переносим на другой день..."
              rows={3}
            />
            <p className="text-xs text-admin-textMuted">
              Клиент получит это сообщение в {cancelTarget.client_messenger === 'telegram' ? 'Telegram' : 'MAX'}.
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
