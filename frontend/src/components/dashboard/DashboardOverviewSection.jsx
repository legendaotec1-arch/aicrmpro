import InstallPwaBanner from '../pwa/InstallPwaBanner';
import OverviewHero from './OverviewHero';
import BookingLinkCard from './BookingLinkCard';
import OverviewStatsCard from './OverviewStatsCard';
import OverviewTodayCard from './OverviewTodayCard';
import RecentClientsCard from './RecentClientsCard';

export default function DashboardOverviewSection({
  profile,
  api,
  isTeamMember,
  clientBookingUrl,
  appointments,
  clients,
  onToast,
  onSectionChange,
  onOpenAppointment,
  onOpenClient,
  appointmentClientForAvatar
}) {
  const displayName = profile?.salon_name || profile?.name || 'Мастер';

  const todayCount = appointments.filter((a) => {
    const d = new Date(a.appointment_time);
    return d.toDateString() === new Date().toDateString() && a.status === 'confirmed';
  }).length;

  return (
    <div className="overview-shell -mx-1 space-y-4 rounded-[1.75rem] px-1 pb-2 sm:space-y-5">
      <OverviewHero profile={profile} todayCount={todayCount} />

      {clientBookingUrl ? (
        <BookingLinkCard
          url={clientBookingUrl}
          salonName={displayName}
          onCopied={(msg, tone) => onToast(msg, tone || 'success')}
          onQrError={(msg) => onToast(msg, 'error')}
        />
      ) : null}

      <OverviewStatsCard api={api} isTeamMember={isTeamMember} />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <OverviewTodayCard
          appointments={appointments}
          onShowAll={() => onSectionChange('appointments')}
          onOpenAppointment={onOpenAppointment}
          appointmentClientForAvatar={appointmentClientForAvatar}
        />
        <RecentClientsCard
          clients={clients}
          onOpenClient={onOpenClient}
          onShowAll={() => onSectionChange('clients')}
        />
      </div>

      <InstallPwaBanner />
    </div>
  );
}
