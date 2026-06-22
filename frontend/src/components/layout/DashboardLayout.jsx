import { useEffect, useState } from 'react';
import {
  Calendar,
  BarChart3,
  Home,
  LogOut,
  Menu,
  Palette,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
  Clock,
  Wallet
} from 'lucide-react';
import Logo from '../brand/Logo';
import BrandName from '../brand/BrandName';
import Button from '../ui/Button';
import { mediaUrl } from '../../lib/media';

const NAV_GROUPS = [
  {
    title: 'Основное',
    items: [
      { id: 'overview', label: 'Главная', Icon: Home },
      { id: 'appointments', label: 'Записи', Icon: Calendar },
      { id: 'clients', label: 'Клиенты', Icon: Users },
      { id: 'analytics', label: 'Аналитика', Icon: BarChart3 }
    ]
  },
  {
    title: 'Работа',
    items: [
      { id: 'schedule', label: 'Расписание', Icon: Clock },
      { id: 'prices', label: 'Услуги', Icon: Sparkles }
    ]
  },
  {
    title: 'Продвижение',
    items: [
      { id: 'reviews', label: 'Отзывы', Icon: Star, badge: 'reviewsPending' },
      { id: 'invites', label: 'Повторные визиты', Icon: RefreshCw }
    ]
  },
  {
    title: 'Настройки',
    items: [
      { id: 'team', label: 'Мастера', Icon: UserRound },
      { id: 'themes', label: 'Тема оформления', Icon: Palette },
      { id: 'profile', label: 'Профиль', Icon: Settings },
      { id: 'billing', label: 'Оплата', Icon: Wallet }
    ]
  }
];

const TEAM_NAV_IDS = new Set([
  'overview',
  'appointments',
  'clients',
  'schedule',
  'prices',
  'profile'
]);

function getNavGroups(isTeamMember) {
  if (!isTeamMember) return NAV_GROUPS;
  const items = NAV_GROUPS.flatMap((group) => group.items).filter((item) => TEAM_NAV_IDS.has(item.id));
  return [{ title: 'Кабинет мастера', items }];
}

function NavGroups({ activeSection, navBadges, onSelect, variant = 'mobile', isTeamMember = false }) {
  const isSidebar = variant === 'sidebar';

  return (
    <>
      {getNavGroups(isTeamMember).map((group) => (
        <div key={group.title}>
          <h3
            className={
              isSidebar
                ? 'text-[11px] font-semibold text-admin-textMuted uppercase tracking-wider mb-2 px-3'
                : 'text-xs font-semibold text-admin-textMuted uppercase tracking-wider mb-2 px-2'
            }
          >
            {group.title}
          </h3>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              const badge = item.badge && navBadges[item.badge] > 0 ? navBadges[item.badge] : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={
                    isSidebar
                      ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-admin-accent text-white shadow-sm'
                            : 'text-admin-textSecondary hover:bg-admin-hover hover:text-admin-text'
                        }`
                      : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-admin-accent text-white'
                            : 'text-admin-text hover:bg-admin-hover'
                        }`
                  }
                >
                  <item.Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                        isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default function DashboardLayout({
  profile,
  activeSection,
  onSectionChange,
  onLogout,
  navBadges = {},
  isTeamMember = false,
  children
}) {
  const avatarLetter = (profile?.name?.[0] || 'М').toUpperCase();
  const avatarSrc = profile?.logo_url ? mediaUrl(profile.logo_url) : null;
  const displayName = profile?.salon_name || profile?.name || 'Мастер';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectSection = (id) => {
    onSectionChange(id);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const TabItem = ({ id, label, Icon }) => {
    const isActive = activeSection === id;
    return (
      <button
        onClick={() => onSectionChange(id)}
        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px] flex-1 ${
          isActive
            ? 'text-admin-accent bg-admin-accentSoft'
            : 'text-admin-textMuted hover:text-admin-textSecondary hover:bg-admin-hover'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.75} />
        <span className={`text-[10px] font-semibold ${isActive ? 'text-admin-accent' : ''}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-dvh min-h-screen bg-admin-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 border-r border-admin-border bg-white">
        <div className="shrink-0 px-5 py-5 border-b border-admin-border">
          <Logo />
          <div className="mt-5 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-admin-bg overflow-hidden flex items-center justify-center shrink-0 border border-admin-border">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-admin-accent">{avatarLetter}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-admin-text truncate">{displayName}</p>
              <p className="text-xs text-admin-textMuted truncate">Кабинет мастера</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
          <NavGroups
            activeSection={activeSection}
            navBadges={navBadges}
            onSelect={selectSection}
            variant="sidebar"
            isTeamMember={isTeamMember}
          />
        </nav>

        <div className="shrink-0 p-3 border-t border-admin-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-rose-300"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            Выйти
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-admin-border safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <BrandName className="text-admin-text" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-admin-textSecondary hover:bg-admin-hover transition"
              aria-label="Меню"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Mobile full-screen menu */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-admin-border shrink-0">
              <BrandName className="text-admin-text" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-admin-textSecondary hover:bg-admin-hover transition"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-5">
              <NavGroups
                activeSection={activeSection}
                navBadges={navBadges}
                onSelect={selectSection}
                variant="mobile"
                isTeamMember={isTeamMember}
              />
            </nav>
            <div className="p-4 border-t border-admin-border shrink-0">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 py-3 text-base text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-rose-300"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="h-5 w-5" strokeWidth={1.75} />
                Выйти
              </Button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col min-h-0 pt-14 lg:pt-0">
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-32 lg:p-6 lg:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>

          {/* Mobile bottom tab bar */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-admin-border safe-bottom">
            <div className="flex justify-around items-center h-16 px-1">
              {isTeamMember ? (
                <>
                  <TabItem id="overview" label="Главная" Icon={Home} />
                  <TabItem id="appointments" label="Записи" Icon={Calendar} />
                  <TabItem id="clients" label="Клиенты" Icon={Users} />
                  <TabItem id="schedule" label="Расписание" Icon={Clock} />
                </>
              ) : (
                <>
                  <TabItem id="overview" label="Главная" Icon={Home} />
                  <TabItem id="appointments" label="Записи" Icon={Calendar} />
                  <TabItem id="clients" label="Клиенты" Icon={Users} />
                  <TabItem id="schedule" label="Расписание" Icon={Clock} />
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, trend, accent }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-admin-border shadow-sm">
      <p className="text-xs font-medium text-admin-textMuted uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={`font-display text-3xl font-bold ${accent || 'text-admin-text'}`}>{value}</p>
        {trend && (
          <span className="text-xs font-semibold text-admin-success bg-green-50 px-2 py-0.5 rounded-full mb-1">
            {trend}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-admin-textMuted">{hint}</p>}
    </div>
  );
}

export function MiniChart({ data }) {
  const max = Math.max(...data, 1);
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return (
    <div className="flex items-end justify-between gap-2 h-32 pt-4">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-admin-accent/80 min-h-[4px] transition-all"
            style={{ height: `${(v / max) * 100}%` }}
          />
          <span className="text-[10px] text-admin-textMuted font-medium">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}
