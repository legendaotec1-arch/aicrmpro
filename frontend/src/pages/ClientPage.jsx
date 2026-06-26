import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/http.js';
import {
  CalendarDays,
  Clock,
  Home,
  ListChecks,
  MapPin,
  MessageCircle,
  Play,
  Star,
  UserRound,
  Check,
  ChevronLeft,
  X,
  Phone,
  BadgeCheck,
  Mail
} from 'lucide-react';
import ClientSalonHeader from '../components/client/ClientSalonHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import AppSplash from '../components/ui/AppSplash';
import MessengerLabel from '../components/brand/MessengerLabel';
import BrandName from '../components/brand/BrandName';
import ClientAuthGate from '../components/client/ClientAuthGate';
import ClientReviewsPanel from '../components/client/ClientReviewsPanel';
import MasterBookingContact, { pickMasterContact, bookingUnavailableContactHint } from '../components/client/MasterBookingContact';
import ServiceCard from '../components/client/ServiceCard';
import MasterVideoReel from '../components/client/MasterVideoReel';
import ClientHomeUniversal from '../components/client/ClientHomeUniversal';
import ClientThemeRoot from '../components/client/ClientThemeRoot';
import { DEFAULT_CLIENT_THEME } from '../config/clientThemes';
import AddressMap from '../components/maps/AddressMap';
import PhoneRuInput from '../components/ui/PhoneRuInput';
import { formatPrice } from '../lib/format';
import {
  formatSalonTime,
  formatSalonDateTime,
  clientLocalHint,
  normalizeTimezone
} from '../lib/timezone';
import { formatMasterPublicTitle, formatSalonMasterName } from '../lib/masterDisplay';
import SalonMasterAvatar from '../components/client/SalonMasterAvatar';
import { isRuPhoneComplete, normalizeRuPhoneForStorage } from '../lib/phoneRu';
import PersonalDataConsentCheckbox from '../components/legal/PersonalDataConsentCheckbox';
import { canSubmitBooking, getClientNameError, isValidClientName } from '../lib/clientBooking';
import { mediaUrl } from '../lib/media';
import { getClientSession, setClientSession, clearClientSession, clientSessionKeys, parseClientTokenParam, isClientSessionValid } from '../lib/clientSession';
import { withClientAuth } from '../lib/clientApi';
import { bootLog } from '../lib/bootLog';
import { retryLoad } from '../lib/retryLoad';
import { useSafeInterval, useMountedRef } from '../lib/usePageVisible';
import { useLeadingThrottle } from '../lib/useThrottledCallback';
import { iosBackdropFilter, iosScrollBehavior } from '../lib/iosPerf';
import { useDocumentHead } from '../seo/useDocumentHead';
import { buildMasterJsonLdBlocks, masterOgImage } from '../lib/masterSeo';
import './client-page.css';
import {
  initMessengerWebApp,
  isMessengerWebApp,
  isMaxWebApp,
  isTelegramWebApp,
  getMessengerDeeplinkFromUrl,
  sessionMatchesDeeplink,
  messengerBackdropFilter,
  messengerChannelLabel,
  openBookingInSystemBrowser,
} from '../lib/messengerWebApp';

const BookingDateCalendar = lazy(() => retryLoad(() => import('../components/client/BookingDateCalendar')));

// ============================================================
// PREMIUM iOS DESIGN TOKENS — INLINE STYLES
// ============================================================
const PREMIUM = {
  // Background
  bgGradient: 'none',
  bgSolid: '#FFFFFF',
  bgCard: 'rgba(255, 255, 255, 0.92)',
  bgCardHover: 'rgba(255, 255, 255, 0.98)',
  bgSoft: 'rgba(220, 220, 220, 0.5)',
  bgDark: 'rgba(0, 0, 0, 0.5)',

  // Accent - SlateBlue
  accent: '#6A5ACD',
  accentLight: '#8477DD',
  accentSoft: 'rgba(106, 90, 205, 0.1)',
  accentGlow: 'rgba(106, 90, 205, 0.3)',

  // Text
  textPrimary: '#2b2b2b',
  textSecondary: '#6b7579',
  textMuted: '#999999',
  textWhite: '#FFFFFF',

  // Effects
  blurHeavy: 'blur(20px)',
  blurMedium: 'blur(12px)',
  blurLight: 'blur(8px)',

  // Shadows
  shadowCard: '0 2px 16px rgba(0, 0, 0, 0.04)',
  shadowCardHover: '0 4px 24px rgba(0, 0, 0, 0.08)',
  shadowButton: '0 4px 16px rgba(106, 90, 205, 0.3)',
  shadowButtonHover: '0 6px 20px rgba(106, 90, 205, 0.4)',
  shadowAvatar: '0 0 0 4px rgba(106, 90, 205, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
  shadowModal: '0 24px 80px rgba(0, 0, 0, 0.25)',

  // Border
  borderCard: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  borderAccent: '#6A5ACD',

  // Radii
  radiusCard: '28px',
  radiusButton: '40px',
  radiusAvatar: '50%',
  radiusThumb: '20px',
  radiusSlot: '16px',
  radiusFull: '99px',

  // Transitions
  transition: 'all 0.2s ease-out',
  transitionSlow: 'all 0.3s ease-out',
};

if (typeof window !== 'undefined') {
  PREMIUM.blurHeavy = iosBackdropFilter(PREMIUM.blurHeavy);
  PREMIUM.blurMedium = iosBackdropFilter(PREMIUM.blurMedium);
  PREMIUM.blurLight = iosBackdropFilter(PREMIUM.blurLight);
}

const CLIENT_TABS = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'booking', label: 'Запись', Icon: CalendarDays },
  { id: 'appointments', label: 'Мои записи', Icon: ListChecks },
  { id: 'reviews', label: 'Отзывы', Icon: Star }
];

function waitForTelegramInitData(maxMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const data = window.Telegram?.WebApp?.initData;
      if (data) return resolve(data);
      if (Date.now() - started >= maxMs) return resolve('');
      window.setTimeout(check, 50);
    };
    check();
  });
}

const BOOKING_STEPS = ['master', 'service', 'datetime', 'confirm'];

const CONFIRM_CHANNELS = [
  {
    id: 'telegram',
    title: 'Telegram',
    description: 'Кнопка «Подтвердить запись» в боте',
    hint: 'Напоминания за 24 ч и 3 ч придут в этот бот'
  },
  {
    id: 'max',
    title: 'MAX',
    description: 'Кнопка «Подтвердить запись» в боте',
    hint: 'Напоминания за 24 ч и 3 ч придут в этот бот'
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Код из письма на сайте',
    hint: 'Подтверждение кодом — без push-напоминаний'
  }
];

function ConfirmChannelCard({ channel, selected, onSelect, emphasize }) {
  const meta = CONFIRM_CHANNELS.find((c) => c.id === channel);
  if (!meta) return null;
  const isSelected = selected === channel;
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '100%',
        padding: '14px 16px',
        borderRadius: '18px',
        border: `2px solid ${isSelected ? PREMIUM.accent : emphasize ? 'rgba(106, 90, 205, 0.28)' : PREMIUM.borderLight}`,
        background: isSelected ? PREMIUM.accentSoft : emphasize ? 'rgba(255, 255, 255, 0.92)' : PREMIUM.bgSoft,
        cursor: 'pointer',
        textAlign: 'left',
        transition: PREMIUM.transition,
        boxShadow: isSelected ? '0 4px 16px rgba(106, 90, 205, 0.18)' : emphasize ? '0 2px 10px rgba(106, 90, 205, 0.08)' : 'none',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          background: isSelected ? PREMIUM.accent : 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {channel === 'email' ? (
          <Mail size={20} color={isSelected ? '#fff' : PREMIUM.accent} />
        ) : (
          <MessengerLabel channel={channel} size="md" showName={false} className="!gap-0" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>{meta.title}</p>
        <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>{meta.description}</p>
        <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginTop: '6px', lineHeight: 1.4 }}>{meta.hint}</p>
      </div>
      {isSelected && <Check size={20} color={PREMIUM.accent} style={{ flexShrink: 0, marginTop: 2 }} />}
    </button>
  );
}

function BookingRequiredSection({ title, subtitle, children, incomplete = false }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '20px',
        border: `2px solid ${incomplete ? 'rgba(234, 88, 12, 0.4)' : 'rgba(106, 90, 205, 0.32)'}`,
        background: incomplete ? 'rgba(255, 247, 237, 0.55)' : 'rgba(106, 90, 205, 0.07)',
        boxShadow: incomplete ? '0 0 0 3px rgba(234, 88, 12, 0.07)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
        <span
          style={{
            flexShrink: 0,
            marginTop: '2px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: incomplete ? '#ea580c' : PREMIUM.accent,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Обязательно
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary, margin: 0, lineHeight: 1.3 }}>
            {title}
          </p>
          {subtitle ? (
            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '4px', lineHeight: 1.45 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// PREMIUM CARD COMPONENT
// ============================================================
function PremiumCard({ children, style = {}, className = '' }) {
  const blur = messengerBackdropFilter(PREMIUM.blurHeavy);
  return (
    <div
      className={className}
      style={{
        background: PREMIUM.bgCard,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        border: `1px solid ${PREMIUM.borderCard}`,
        borderRadius: PREMIUM.radiusCard,
        boxShadow: PREMIUM.shadowCard,
        transition: PREMIUM.transition,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// PREMIUM BUTTON COMPONENTS
// ============================================================
function PremiumCtaBtn({ children, onClick, disabled, loading, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 28px',
        background: disabled ? PREMIUM.accentSoft : `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
        color: PREMIUM.textWhite,
        fontWeight: '700',
        fontSize: '15px',
        borderRadius: PREMIUM.radiusButton,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : PREMIUM.shadowButton,
        transition: PREMIUM.transition,
        opacity: disabled ? 0.5 : 1,
        letterSpacing: '-0.01em',
        width: '100%',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = PREMIUM.shadowButtonHover;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = disabled ? 'none' : PREMIUM.shadowButton;
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'scale(0.97)';
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
    >
      {loading ? (
        <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      ) : children}
    </button>
  );
}

function PremiumSecondaryBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px 20px',
        background: PREMIUM.bgSoft,
        color: PREMIUM.textPrimary,
        fontWeight: '600',
        fontSize: '14px',
        borderRadius: PREMIUM.radiusButton,
        border: `1px solid ${PREMIUM.borderLight}`,
        cursor: 'pointer',
        backdropFilter: PREMIUM.blurMedium,
        WebkitBackdropFilter: PREMIUM.blurMedium,
        transition: PREMIUM.transition,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = PREMIUM.bgCardHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = PREMIUM.bgSoft;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
    >
      {children}
    </button>
  );
}

function PremiumDangerBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px 20px',
        background: 'rgba(255, 80, 80, 0.08)',
        color: '#C0392B',
        fontWeight: '600',
        fontSize: '14px',
        borderRadius: PREMIUM.radiusButton,
        border: '1px solid rgba(255, 80, 80, 0.15)',
        cursor: 'pointer',
        transition: PREMIUM.transition,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 80, 80, 0.14)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 80, 80, 0.08)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
    >
      {children}
    </button>
  );
}

// ============================================================
// CONFIRM DIALOG MODAL
// ============================================================
function ConfirmDialog({ title, message, confirmLabel, confirmVariant = 'danger', onConfirm, onCancel, loading }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: PREMIUM.blurHeavy,
          WebkitBackdropFilter: PREMIUM.blurHeavy,
          borderRadius: PREMIUM.radiusCard,
          padding: '28px 24px',
          maxWidth: 340,
          width: '100%',
          boxShadow: PREMIUM.shadowModal,
          border: `1px solid ${PREMIUM.borderCard}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: PREMIUM.textPrimary, marginBottom: '10px', textAlign: 'center' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, textAlign: 'center', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: PREMIUM.bgSoft,
              color: PREMIUM.textPrimary,
              fontWeight: '600',
              fontSize: '14px',
              borderRadius: PREMIUM.radiusButton,
              border: `1px solid ${PREMIUM.borderLight}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: PREMIUM.transition,
              opacity: loading ? 0.6 : 1,
            }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: confirmVariant === 'danger'
                ? 'linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)'
                : `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
              color: '#fff',
              fontWeight: '700',
              fontSize: '14px',
              borderRadius: PREMIUM.radiusButton,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: confirmVariant === 'danger'
                ? '0 4px 16px rgba(192, 57, 43, 0.3)'
                : PREMIUM.shadowButton,
              transition: PREMIUM.transition,
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREMIUM TAB BAR
// ============================================================
function PremiumTabBar({ activeTab, onTabChange }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: PREMIUM.blurHeavy,
        WebkitBackdropFilter: PREMIUM.blurHeavy,
        borderTop: `1px solid ${PREMIUM.borderCard}`,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className="lg:hidden"
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 8px' }}>
        {CLIENT_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: PREMIUM.transition,
            }}
          >
            <Icon
              size={22}
              style={{
                color: activeTab === id ? PREMIUM.accent : PREMIUM.textSecondary,
                transition: PREMIUM.transition,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: activeTab === id ? '700' : '600',
                color: activeTab === id ? PREMIUM.accent : PREMIUM.textSecondary,
                transition: PREMIUM.transition,
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ============================================================
// PREMIUM DESKTOP NAV
// ============================================================
function PremiumDesktopNav({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
      }}
      className="hidden lg:block"
    >
      {CLIENT_TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            background: activeTab === id
              ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`
              : PREMIUM.bgSoft,
            color: activeTab === id ? PREMIUM.textWhite : PREMIUM.textSecondary,
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: PREMIUM.radiusButton,
            border: activeTab === id ? 'none' : `1px solid ${PREMIUM.borderLight}`,
            cursor: 'pointer',
            backdropFilter: activeTab === id ? 'none' : PREMIUM.blurMedium,
            WebkitBackdropFilter: activeTab === id ? 'none' : PREMIUM.blurMedium,
            boxShadow: activeTab === id ? PREMIUM.shadowButton : 'none',
            transition: PREMIUM.transition,
          }}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// PREMIUM TIME SLOT
// ============================================================
function PremiumTimeSlot({ time, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 8px',
        background: selected ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)` : PREMIUM.bgSoft,
        border: selected ? `1.5px solid ${PREMIUM.accent}` : `1.5px solid ${PREMIUM.borderLight}`,
        borderRadius: PREMIUM.radiusSlot,
        fontSize: '13px',
        fontWeight: '600',
        color: selected ? PREMIUM.textWhite : PREMIUM.textPrimary,
        cursor: 'pointer',
        transition: PREMIUM.transition,
        backdropFilter: PREMIUM.blurLight,
        WebkitBackdropFilter: PREMIUM.blurLight,
        boxShadow: selected ? PREMIUM.shadowButton : 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = PREMIUM.bgCardHover;
          e.currentTarget.style.borderColor = PREMIUM.accent;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = PREMIUM.bgSoft;
          e.currentTarget.style.borderColor = PREMIUM.borderLight;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {time}
    </button>
  );
}

// ============================================================
// MAIN CLIENT PAGE COMPONENT
// ============================================================
function WebAppAuthPrompt({ authPending, onRetry, channelLabel }) {
  return (
    <PremiumCard style={{ padding: '32px', textAlign: 'center' }}>
      <p style={{ fontSize: '15px', color: PREMIUM.textSecondary, marginBottom: '16px' }}>
        {authPending ? `Входим через ${channelLabel}…` : `Не удалось войти через ${channelLabel}`}
      </p>
      {authPending ? (
        <AppSplash fullScreen={false} label="Вход" />
      ) : (
        <Button type="button" onClick={onRetry}>
          Повторить вход
        </Button>
      )}
    </PremiumCard>
  );
}

export default function ClientPage() {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    bootLog('CLIENT_PAGE_MOUNT', { masterId });
  }, [masterId]);
  const [master, setMaster] = useState(null);
  const [pageSeo, setPageSeo] = useState(null);
  const [bookingConfig, setBookingConfig] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [teamMasters, setTeamMasters] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [selectedSalonMaster, setSelectedSalonMaster] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: null });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && CLIENT_TABS.some((item) => item.id === tab)) return tab;
    } catch {
      /* ignore */
    }
    return 'home';
  });
  const handleTabChange = useLeadingThrottle((id) => {
    setActiveTab((prev) => (prev === id ? prev : id));
  }, 300);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [step, setStep] = useState('master');
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'cancel'|'reschedule', appointment }
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '+7' });
  const [pdConsent, setPdConsent] = useState(false);
  const [confirmChannel, setConfirmChannel] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [pendingToken, setPendingToken] = useState(null);
  const [confirmPhase, setConfirmPhase] = useState('choose');
  const [confirmedChannel, setConfirmedChannel] = useState(null);
  const [botDeepLink, setBotDeepLink] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const bookingFormRef = useRef(null);
  const confirmRequestRef = useRef(false);
  const reschedulePrefillRef = useRef(null);
  const identifySyncKeyRef = useRef('');
  const slotsRequestIdRef = useRef(0);
  const loadMasterInFlightRef = useRef(null);
  const mountedRef = useMountedRef();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [booking, setBooking] = useState(false);
  const inWebApp = isMessengerWebApp();
  const webAppChannelLabel = messengerChannelLabel();
  const [clientAuth, setClientAuth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('a')) return null;
    const deeplink = getMessengerDeeplinkFromUrl(window.location.search);
    const session = getClientSession(masterId);
    if (deeplink && isClientSessionValid(session) && !sessionMatchesDeeplink(session, deeplink)) {
      clearClientSession(masterId);
      return null;
    }
    return isClientSessionValid(session) ? session : null;
  });
  const [authChecked, setAuthChecked] = useState(true);
  const [authRetryNonce, setAuthRetryNonce] = useState(0);
  const [authPending, setAuthPending] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('a')) return true;
    const deeplink = getMessengerDeeplinkFromUrl(window.location.search);
    const session = getClientSession(masterId);
    if (deeplink) {
      return !sessionMatchesDeeplink(session, deeplink);
    }
    return isMessengerWebApp();
  });
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [bookingSuccessWasReschedule, setBookingSuccessWasReschedule] = useState(false);

  const clientThemeId = master?.client_theme || DEFAULT_CLIENT_THEME;
  const apiSalonId = master?.id || null;

  useEffect(() => {
    initMessengerWebApp();
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setLoadTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const retryWebAppAuth = useCallback(() => {
    setAuthPending(true);
    setAuthRetryNonce((value) => value + 1);
  }, []);

  const resolveAuthFromUrl = useCallback(() => {
    const ct = searchParams.get('ct');
    if (ct) {
      const fromCt = parseClientTokenParam(ct);
      if (fromCt) return fromCt;
    }

    const tab = searchParams.get('tab');
    const reschedule = searchParams.get('reschedule');

    if (tab && CLIENT_TABS.some((item) => item.id === tab)) setActiveTab(tab);
    if (reschedule) {
      setRescheduleId((prev) => (prev === reschedule ? prev : reschedule));
      setActiveTab('booking');
      setStep('master');
    }

    return getClientSession(...clientSessionKeys(masterId, master));
  }, [masterId, master?.id, master?.public_slug, searchParams]);

  const loadMasterData = useCallback(async () => {
    if (loadMasterInFlightRef.current) return loadMasterInFlightRef.current;
    const run = (async () => {
    bootLog('LOAD_MASTER_START', { masterId });
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get(`/master/${encodeURIComponent(masterId)}`);
      if (!res.data?.master?.id) {
        throw new Error('Пустой ответ сервера');
      }
      const groups = res.data.priceGroups || [];
      const masters = res.data.teamMasters || [];
      const flat = res.data.priceList || groups.flatMap((g) => g.services);

      setMaster((() => {
        const m = res.data.master;
        if (m?.socialLinks && Array.isArray(m.socialLinks)) {
          const links = {};
          m.socialLinks.forEach(l => { links[l.id] = l.url; });
          m.socialLinks = links;
        }
        return m;
      })());
      setBookingConfig(res.data.booking || null);
      setPortfolio(res.data.portfolio || []);
      setPriceGroups(groups);
      setTeamMasters(masters);
      setPriceList(flat);
      setReviewSummary(res.data.reviewSummary || { count: 0, average: null });
      setReviews(res.data.reviews || []);
      setPageSeo(res.data.seo || null);
      bootLog('LOAD_MASTER_OK', {
        masterId,
        salonId: res.data?.master?.id,
        services: flat.length,
        team: masters.length,
      });
      bootLog('LOAD_SERVICES_OK', { masterId, count: flat.length });
    } catch (err) {
      console.error(err);
      bootLog('LOAD_MASTER_FAIL', { masterId, status: err.response?.status });
      const msg = err.response?.data?.error || (err.message !== 'Error' ? err.message : null);
      setLoadError(msg || (err.response?.status === 404 ? 'Мастер не найден' : 'Не удалось загрузить страницу'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    })();
    loadMasterInFlightRef.current = run;
    try {
      await run;
    } finally {
      if (loadMasterInFlightRef.current === run) loadMasterInFlightRef.current = null;
    }
  }, [masterId, mountedRef]);

  const loadAppointments = useCallback(async () => {
    if (!isClientSessionValid(clientAuth) || authPending) return;
    setAppointmentsLoading(true);
    try {
      const res = await api.get(
        `/client/my/${encodeURIComponent(clientAuth.userId)}`,
        withClientAuth(clientAuth, {
          params: { channel: clientAuth.channel, masterId: apiSalonId || masterId }
        })
      );
      setAppointments(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearClientSession(...clientSessionKeys(masterId, master));
        if (mountedRef.current) {
          setClientAuth(null);
          identifySyncKeyRef.current = '';
        }
        return;
      }
      console.error(err);
    } finally {
      if (mountedRef.current) setAppointmentsLoading(false);
    }
  }, [clientAuth, masterId, apiSalonId, authPending, master, mountedRef]);

  useEffect(() => {
    const code = searchParams.get('a');
    if (!code) return undefined;

    let cancelled = false;
    setAuthPending(true);
    bootLog('AUTH_OPEN_CODE_START', { masterId, code: code.slice(0, 4) + '…' });
    clearClientSession(...clientSessionKeys(masterId, master));
    setClientAuth(null);
    identifySyncKeyRef.current = '';

    (async () => {
      try {
        bootLog('AUTH_REQUEST_SENT', { masterId });
        const res = await api.post('/client/auth/open-code', { code, masterId });
        bootLog('AUTH_RESPONSE_RECEIVED', { masterId, status: res.status });
        if (cancelled) return;
        const session = {
          channel: res.data.channel,
          userId: res.data.userId,
          clientToken: res.data.clientToken,
        };
        const keys = [...clientSessionKeys(masterId, master), res.data.salonId].filter(Boolean);
        setClientSession(keys, session);
        setClientAuth(session);
        bootLog('AUTH_TOKEN_SAVED', { masterId, channel: session.channel });
        bootLog('AUTH_OPEN_CODE_OK', { masterId, channel: session.channel });
        bootLog('URL_CLEANUP_START', { masterId });
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('a');
          return next;
        }, { replace: true });
        bootLog('URL_CLEANUP_OK', { masterId });
      } catch (err) {
        console.error('open-code auth failed', err);
        bootLog('AUTH_OPEN_CODE_FAIL', {
          masterId,
          status: err.response?.status,
          code: err.code,
          message: String(err.message || '').slice(0, 80),
        });
      } finally {
        if (!cancelled) setAuthPending(false);
      }
    })();

    return () => { cancelled = true; };
  }, [masterId, master?.id, master?.public_slug, searchParams.get('a'), setSearchParams, master]);

  useEffect(() => {
    const ct = searchParams.get('ct');
    if (!ct) return undefined;
    const session = parseClientTokenParam(ct);
    if (!session) return undefined;
    const keys = clientSessionKeys(masterId, master);
    setClientSession(keys, session);
    setClientAuth(session);
    setAuthPending(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ct');
      return next;
    }, { replace: true });
    return undefined;
  }, [masterId, master?.id, master?.public_slug, searchParams, setSearchParams]);

  useEffect(() => {
    const session = resolveAuthFromUrl();
    const validSession = isClientSessionValid(session) ? session : null;
    setClientAuth((prev) => {
      if (validSession?.clientToken) {
        if (
          prev?.clientToken === validSession.clientToken
          && prev?.channel === validSession.channel
          && prev?.userId === validSession.userId
        ) {
          return prev;
        }
        return validSession;
      }
      if (isClientSessionValid(prev)) return prev;
      return null;
    });
    const deeplink = getMessengerDeeplinkFromUrl(searchParams.toString() ? `?${searchParams.toString()}` : '');
    const hasDeeplinkParams = Boolean(deeplink);
    const hasOpenCode = Boolean(searchParams.get('a'));
    const hasSession = Boolean(validSession?.clientToken);
    const needsDeeplinkAuth = hasDeeplinkParams && !sessionMatchesDeeplink(validSession, deeplink);
    setAuthPending((pending) => {
      if (needsDeeplinkAuth) return true;
      if (hasSession) return false;
      if (hasOpenCode || hasDeeplinkParams || isMessengerWebApp()) return true;
      return pending;
    });
    setAuthChecked(true);
  }, [resolveAuthFromUrl, searchParams]);

  useEffect(() => {
    if (!authPending) return undefined;
    const timer = window.setTimeout(() => setAuthPending(false), 12000);
    return () => window.clearTimeout(timer);
  }, [authPending]);

  useEffect(() => {
    const deeplink = getMessengerDeeplinkFromUrl(searchParams.toString() ? `?${searchParams.toString()}` : window.location.search);
    const hasDeeplink = Boolean(deeplink);
    const needsDeeplinkAuth = hasDeeplink && !sessionMatchesDeeplink(clientAuth, deeplink);

    if (!masterId || (isClientSessionValid(clientAuth) && !needsDeeplinkAuth)) return;

    const ch = deeplink?.channel || searchParams.get('ch');
    const uid = deeplink?.userId || searchParams.get('uid');
    const exp = deeplink?.exp || searchParams.get('exp');
    const sig = deeplink?.sig || searchParams.get('sig');

    let cancelled = false;

    const applyTabFromUrl = () => {
      const tab = searchParams.get('tab');
      if (tab && CLIENT_TABS.some((item) => item.id === tab)) setActiveTab(tab);
      const reschedule = searchParams.get('reschedule');
      if (reschedule) {
        setRescheduleId(reschedule);
        setActiveTab('booking');
        setStep('master');
      }
    };

    const clearDeeplinkParams = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        ['ch', 'uid', 'fn', 'photo', 'exp', 'sig'].forEach((key) => next.delete(key));
        return next;
      }, { replace: true });
    };

    const runDeeplinkAuth = async () => {
      bootLog('AUTH_DEEPLINK_START', { masterId, channel: ch });
      const res = await api.post('/client/auth/deeplink', {
        masterId,
        channel: ch,
        userId: uid,
        exp,
        sig,
        firstName: searchParams.get('fn') || undefined,
        photoUrl: searchParams.get('photo') || undefined
      });
      if (cancelled) return;
      const session = {
        channel: res.data.channel || ch,
        userId: res.data.userId || uid,
        firstName: res.data.firstName || searchParams.get('fn') || undefined,
        photoUrl: res.data.photoUrl || searchParams.get('photo') || undefined,
        clientToken: res.data.clientToken
      };
      const sessionKeys = [...clientSessionKeys(masterId, master), res.data.salonId].filter(Boolean);
      setClientSession(sessionKeys, session);
      setClientAuth(session);
      clearDeeplinkParams();
      applyTabFromUrl();
      setAuthPending(false);
      bootLog('AUTH_DEEPLINK_OK', { masterId, channel: session.channel });
    };

    (async () => {
      if (hasDeeplink) {
        try {
          await runDeeplinkAuth();
          return;
        } catch (err) {
          console.error('deeplink auth failed', err);
          bootLog('AUTH_DEEPLINK_FAIL', {
            masterId,
            status: err.response?.status,
            message: String(err.message || '').slice(0, 80),
          });
        }
      }

      const telegramDeeplink = ch === 'telegram' && Boolean(uid);
      if (!isMaxWebApp() && !telegramDeeplink) {
        const initData = await waitForTelegramInitData(isTelegramWebApp() ? 8000 : 1500);
        if (cancelled) return;

        if (initData) {
          try {
            const res = await api.post('/client/auth/telegram-webapp', { masterId, initData });
            if (cancelled) return;
            const session = {
              channel: 'telegram',
              userId: res.data.userId,
              firstName: res.data.firstName || undefined,
              photoUrl: res.data.photoUrl || undefined,
              clientToken: res.data.clientToken
            };
            const keys = [...clientSessionKeys(masterId, master), res.data.salonId].filter(Boolean);
            setClientSession(keys, session);
            setClientAuth(session);
            applyTabFromUrl();
            initMessengerWebApp();
            setAuthPending(false);
            return;
          } catch (err) {
            console.error('telegram webapp auth failed', err);
            if (!hasDeeplink) {
              if (!cancelled) setAuthPending(false);
              return;
            }
          }
        }
      }

      if (!hasDeeplink) {
        if (!cancelled) setAuthPending(false);
        return;
      }

      try {
        await runDeeplinkAuth();
      } catch (err) {
        console.error('deeplink auth retry failed', err);
      } finally {
        if (!cancelled) setAuthPending(false);
      }
    })();

    return () => { cancelled = true; };
  }, [masterId, master?.id, master?.public_slug, searchParams, setSearchParams, clientAuth?.clientToken, authRetryNonce]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const bookingReadyLoggedRef = useRef(false);

  useEffect(() => {
    if (loading || !master) return;
    if (authPending) return;
    if (bookingReadyLoggedRef.current) return;
    bookingReadyLoggedRef.current = true;
    bootLog('BOOKING_READY', {
      masterId,
      tab: activeTab,
      authed: isClientSessionValid(clientAuth),
    });
  }, [loading, master, authPending, masterId, activeTab, clientAuth]);

  useEffect(() => {
    if (!clientAuth?.clientToken) return;
    const keys = clientSessionKeys(masterId, master);
    if (!keys.length) return;
    setClientSession(keys, clientAuth);
  }, [master?.id, master?.public_slug, masterId, clientAuth?.clientToken, clientAuth?.channel, clientAuth?.userId]);

  useEffect(() => {
    const slug = master?.public_slug;
    if (!slug || masterId === slug) return;
    const hasDeeplink = Boolean(
      searchParams.get('uid') && searchParams.get('exp') && searchParams.get('sig')
    );
    if (hasDeeplink && !clientAuth?.clientToken) return;
    if (authPending) return;
    navigate(`/m/${slug}${location.search}${location.hash}`, { replace: true });
  }, [master?.public_slug, masterId, navigate, location.search, location.hash, searchParams, clientAuth?.clientToken, authPending]);

  const masterJsonLd = useMemo(
    () => (master ? buildMasterJsonLdBlocks(master, priceList, reviewSummary) : []),
    [master, priceList, reviewSummary]
  );

  const isBookingApp = import.meta.env.VITE_BOOKING_APP === '1';

  const documentHeadConfig = useMemo(() => {
    if (isBookingApp || loading || !master || !pageSeo) return null;
    return {
      title: pageSeo.title,
      description: pageSeo.description,
      canonical: pageSeo.canonical,
      robots: pageSeo.indexable === false ? 'noindex, follow' : 'index, follow',
      ogImage: masterOgImage(master),
      jsonLdBlocks: masterJsonLd,
    };
  }, [isBookingApp, loading, master, pageSeo, masterJsonLd]);

  useDocumentHead(documentHeadConfig);

  useEffect(() => {
    if (!isClientSessionValid(clientAuth) || authPending) return;
    loadAppointments();
  }, [clientAuth, authPending, loadAppointments]);

  useEffect(() => {
    if (!selectedDate || !apiSalonId || !selectedSalonMaster) return undefined;
    const timer = window.setTimeout(() => { loadSlots(); }, 300);
    return () => window.clearTimeout(timer);
  }, [
    selectedDate,
    apiSalonId,
    clientAuth?.userId,
    clientAuth?.channel,
    selectedSalonMaster?.id,
    selectedService?.id,
    selectedService?.duration_minutes,
    rescheduleId
  ]);

  useEffect(() => {
    if (clientAuth?.firstName && isValidClientName(clientAuth.firstName) && !formData.name) {
      setFormData((prev) => ({ ...prev, name: clientAuth.firstName }));
    }
  }, [clientAuth?.firstName, formData.name]);

  useEffect(() => {
    if (!isClientSessionValid(clientAuth) || !(apiSalonId || masterId)) return;
    const syncKey = [
      apiSalonId || masterId,
      clientAuth.channel,
      clientAuth.userId,
      formData.name,
      formData.phone
    ].join('|');
    if (identifySyncKeyRef.current === syncKey) return;
    identifySyncKeyRef.current = syncKey;

    api.post('/client/identify', {
      masterId: apiSalonId || masterId,
      channel: clientAuth.channel,
      userId: clientAuth.userId,
      name: isValidClientName(formData.name)
        ? formData.name.trim()
        : isValidClientName(clientAuth.firstName)
          ? clientAuth.firstName
          : undefined,
      phone: isRuPhoneComplete(formData.phone) ? normalizeRuPhoneForStorage(formData.phone) : undefined,
      photoUrl: clientAuth.photoUrl || undefined
    }, withClientAuth(clientAuth))
      .then((res) => {
        if (!res.data?.clientToken) return;
        setClientSession(clientSessionKeys(masterId, master), { ...clientAuth, clientToken: res.data.clientToken });
        setClientAuth((prev) => {
          if (!prev || prev.clientToken === res.data.clientToken) return prev;
          return { ...prev, clientToken: res.data.clientToken };
        });
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          clearClientSession(...clientSessionKeys(masterId, master));
          setClientAuth(null);
          identifySyncKeyRef.current = '';
        }
      });
  }, [
    apiSalonId,
    masterId,
    clientAuth?.channel,
    clientAuth?.userId,
    clientAuth?.clientToken,
    formData.name,
    formData.phone,
    master,
    mountedRef,
  ]);

  useEffect(() => {
    reschedulePrefillRef.current = null;
  }, [masterId]);

  useEffect(() => {
    if (activeTab !== 'booking' || step !== 'master' || rescheduleId || rescheduleLoading) return;
    if (teamMasters.length === 1 && !selectedSalonMaster) {
      pickSalonMaster(teamMasters[0]);
    }
  }, [activeTab, step, teamMasters, selectedSalonMaster, rescheduleId, rescheduleLoading]);

  useEffect(() => {
    if (!rescheduleId || !clientAuth || !master?.id || teamMasters.length === 0) return;
    if (reschedulePrefillRef.current === rescheduleId) return;
    if (priceGroups.length === 0 && priceList.length === 0) return;

    let cancelled = false;
    (async () => {
      setRescheduleLoading(true);
      try {
        const res = await api.get(
          `/client/appointment/${rescheduleId}`,
          withClientAuth(clientAuth, {
            params: { channel: clientAuth.channel, userId: clientAuth.userId }
          })
        );
        if (cancelled) return;
        const apt = res.data;
        const teamMaster = teamMasters.find((m) => m.id === apt.salon_master_id) || teamMasters[0] || null;
        const groupServices = priceGroups.find((g) => g.master.id === apt.salon_master_id)?.services || priceList;
        const service = groupServices.find((item) => item.name === apt.service_name) || {
          id: apt.id,
          name: apt.service_name,
          price: apt.service_price,
          duration_minutes: apt.duration_minutes
        };
        setSelectedSalonMaster(teamMaster);
        setSelectedService(service);
        setSelectedDate(new Date(apt.appointment_time));
        setSelectedSlot(null);
        setActiveTab('booking');
        setStep('datetime');
        reschedulePrefillRef.current = rescheduleId;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('reschedule');
          next.delete('tab');
          return next;
        }, { replace: true });
      } catch (err) {
        alert(err.response?.data?.error || 'Не удалось загрузить запись для переноса');
        setRescheduleId(null);
        reschedulePrefillRef.current = null;
      } finally {
        if (!cancelled) setRescheduleLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rescheduleId, clientAuth, master?.id, teamMasters, priceGroups, priceList, setSearchParams]);

  const handleAuthenticated = useCallback((session) => {
    setClientSession(clientSessionKeys(masterId, master), session);
    setClientAuth(session);
    if (session.firstName) setFormData((prev) => ({ ...prev, name: prev.name || session.firstName }));
  }, [masterId, master?.id, master?.public_slug]);

  const loadSlots = async () => {
    const requestId = ++slotsRequestIdRef.current;
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      if (!selectedSalonMaster?.id || !apiSalonId) return;
      const params = new URLSearchParams({
        date: dateStr,
        salonMasterId: selectedSalonMaster.id,
        durationMinutes: String(selectedService?.duration_minutes || 60)
      });
      if (rescheduleId) params.set('excludeAppointmentId', rescheduleId);
      const res = await api.get(`/client/${apiSalonId}/slots?${params.toString()}`);
      if (requestId !== slotsRequestIdRef.current) return;
      const slots = res.data || [];
      setAvailableSlots(slots);
      setSelectedSlot((prev) => (prev && slots.includes(prev) ? prev : null));
    } catch (err) {
      if (requestId !== slotsRequestIdRef.current) return;
      console.error(err);
    }
  };

  const servicesForMaster = useMemo(() => {
    if (!selectedSalonMaster) return [];
    const group = priceGroups.find((g) => g.master.id === selectedSalonMaster.id);
    if (group?.services?.length) return group.services;
    return priceGroups.length === 0 ? priceList : [];
  }, [priceGroups, selectedSalonMaster, priceList]);

  const mediaItems = useMemo(() => portfolio.filter((p) => p.image_url || p.video_url), [portfolio]);
  const showMap = Boolean(master?.latitude && master?.longitude) || Boolean(master?.address);
  const photoItems = useMemo(() => mediaItems.filter((item) => item.media_type === 'image'), [mediaItems]);
  const videoItems = useMemo(() => mediaItems.filter((item) => item.media_type !== 'image'), [mediaItems]);
  const currentMedia = mediaViewer ? mediaViewer.items[mediaViewer.index] : null;
  const title = formatMasterPublicTitle(master);
  const salonTimezone = useMemo(
    () => normalizeTimezone(master?.timezone || bookingConfig?.timezone),
    [master?.timezone, bookingConfig?.timezone]
  );
  const salonTimezoneLabel = master?.timezoneLabel || bookingConfig?.timezoneLabel || salonTimezone;
  const bookingUnavailableContact = useMemo(() => pickMasterContact(master), [master]);
  const selectedSlotLocalHint = selectedSlot ? clientLocalHint(selectedSlot, salonTimezone) : null;

  const openMedia = (items, index) => setMediaViewer({ items, index });
  const openServiceImage = (item) => {
    if (!item?.image_url) return;
    setServiceImagePreview({ url: item.image_url, title: item.name });
  };
  const moveMedia = (delta) => {
    setMediaViewer((viewer) => {
      if (!viewer?.items?.length) return viewer;
      const next = (viewer.index + delta + viewer.items.length) % viewer.items.length;
      return { ...viewer, index: next };
    });
  };

  const pickSalonMaster = (m) => {
    setSelectedSalonMaster(m);
    setSelectedService(null);
    setSelectedSlot(null);
    setStep('service');
  };

  const pickService = (item, masterRow = selectedSalonMaster) => {
    if (masterRow) setSelectedSalonMaster(masterRow);
    setSelectedService(item);
    setSelectedSlot(null);
    setStep('datetime');
    setActiveTab('booking');
    setTimeout(() => document.getElementById('booking-card')?.scrollIntoView({ behavior: iosScrollBehavior(), block: 'start' }), 50);
  };

  const selectBookingService = (item) => {
    setSelectedService(item);
    setSelectedSlot(null);
    setStep('datetime');
  };

  useEffect(() => {
    if (step === 'form' && selectedSlot) {
      setTimeout(() => bookingFormRef.current?.scrollIntoView({ behavior: iosScrollBehavior(), block: 'start' }), 80);
    }
  }, [step, selectedSlot]);

  const resetConfirmFlow = () => {
    setConfirmChannel(null);
    setConfirmEmail('');
    setEmailCode('');
    setPendingToken(null);
    setConfirmPhase('choose');
    setBotDeepLink(null);
    setConfirmError('');
  };

  const confirmPolling = confirmPhase === 'waiting' && Boolean(pendingToken);

  useSafeInterval(() => {
    if (!pendingToken) return;
    (async () => {
      try {
        const res = await api.get(`/client/booking/confirm-status/${pendingToken}`);
        if (!mountedRef.current) return;
        if (res.data?.status === 'confirmed') {
          setConfirmedChannel(confirmChannel);
          setStep('done');
          setConfirmPhase('choose');
          resetConfirmFlow();
          if (isClientSessionValid(clientAuth)) await loadAppointments();
        } else if (res.data?.status === 'expired') {
          setConfirmError(res.data?.cancelReason || 'Не удалось подтвердить. Выберите другое время.');
          setConfirmPhase('choose');
          setPendingToken(null);
          setStep('datetime');
          setSelectedSlot(null);
        }
      } catch {
        /* ignore transient poll errors */
      }
    })();
  }, 3000, confirmPolling);

  const handleConfirmEmailCode = async () => {
    if (!pendingToken || !/^\d{6}$/.test(emailCode.trim())) {
      setConfirmError('Введите 6-значный код из письма');
      return;
    }
    setBooking(true);
    setConfirmError('');
    try {
      await api.post('/client/booking/confirm-email', { token: pendingToken, code: emailCode.trim() });
      setConfirmedChannel('email');
      setStep('done');
      resetConfirmFlow();
      if (isClientSessionValid(clientAuth)) await loadAppointments();
    } catch (err) {
      setConfirmError(err.response?.data?.error || 'Неверный код');
    } finally {
      setBooking(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService) return;

    const nameError = getClientNameError(formData.name);
    if (nameError) {
      alert(nameError);
      return;
    }
    if (!isRuPhoneComplete(formData.phone)) {
      alert('Укажите номер телефона полностью в формате +7 999 123 4567');
      return;
    }
    if (!pdConsent) {
      setConfirmError('Для оформления записи необходимо согласие на обработку персональных данных');
      return;
    }

    if (rescheduleId) {
      if (!clientAuth) {
        alert('Для переноса записи войдите через мессенджер');
        return;
      }
      setBooking(true);
      const wasRescheduling = true;
      try {
        const payload = {
          masterId: apiSalonId || masterId,
          salonMasterId: selectedSalonMaster?.id,
          channel: clientAuth.channel,
          name: formData.name.trim(),
          phone: normalizeRuPhoneForStorage(formData.phone),
          appointmentTime: selectedSlot,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          duration: selectedService.duration_minutes,
          photoUrl: clientAuth.photoUrl || undefined
        };
        if (clientAuth.channel === 'telegram') payload.telegramUserId = clientAuth.userId;
        else payload.maxUserId = clientAuth.userId;
        await api.put(`/client/appointment/${rescheduleId}/reschedule`, payload, withClientAuth(clientAuth));
        setStep('done');
        setBookingSuccessWasReschedule(wasRescheduling);
        setRescheduleId(null);
        await loadAppointments();
      } catch (err) {
        alert(err.response?.data?.error || 'Ошибка записи');
      } finally {
        setBooking(false);
      }
      return;
    }

    if (confirmPhase === 'waiting' && pendingToken) return;

    if (!confirmChannel) {
      setConfirmError('Выберите способ подтверждения записи');
      return;
    }
    if (confirmChannel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmEmail.trim())) {
      setConfirmError('Укажите корректный email');
      return;
    }

    if (confirmRequestRef.current) return;
    confirmRequestRef.current = true;
    setBooking(true);
    setConfirmError('');
    try {
      const payload = {
        masterId: apiSalonId || masterId,
        salonMasterId: selectedSalonMaster?.id,
        channel: confirmChannel,
        name: formData.name.trim(),
        phone: normalizeRuPhoneForStorage(formData.phone),
        appointmentTime: selectedSlot,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        duration: selectedService.duration_minutes
      };
      if (confirmChannel === 'email') {
        payload.email = confirmEmail.trim().toLowerCase();
      }
      if (confirmChannel === 'telegram' && clientAuth?.channel === 'telegram') {
        payload.telegramUserId = clientAuth.userId;
      }
      if (confirmChannel === 'max' && clientAuth?.channel === 'max') {
        payload.maxUserId = clientAuth.userId;
      }

      const res = await api.post('/client/booking/request-confirm', payload);
      const token = res.data?.token;
      setPendingToken(token);
      setBotDeepLink(res.data?.botDeepLink || null);

      if (confirmChannel === 'email') {
        setConfirmPhase('code');
      } else {
        setConfirmPhase('waiting');
      }
    } catch (err) {
      setConfirmError(err.response?.data?.error || 'Не удалось отправить подтверждение');
    } finally {
      setBooking(false);
      confirmRequestRef.current = false;
    }
  };

  const cancelAppointment = async (appointmentId) => {
    setConfirmLoading(true);
    try {
      const payload = { channel: clientAuth.channel, userId: clientAuth.userId };
      if (clientAuth.channel === 'telegram') payload.telegramUserId = clientAuth.userId;
      else payload.maxUserId = clientAuth.userId;
      await api.post(`/client/cancel/${appointmentId}`, payload, withClientAuth(clientAuth));
      setConfirmDialog(null);
      await loadAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Не удалось отменить запись');
    } finally {
      setConfirmLoading(false);
    }
  };

  const rescheduleAppointment = (apt) => {
    setConfirmDialog(null);
    setRescheduleId(apt.id);
    setActiveTab('booking');
    setStep('master');
  };

  const handleSwitchAccount = () => {
    clearClientSession(...clientSessionKeys(masterId, master));
    setClientAuth(null);
    setStep('master');
    setSelectedSlot(null);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    if (loadTimedOut) {
      return (
        <ClientThemeRoot themeId={clientThemeId}>
          <div
            style={{
              minHeight: '100dvh',
              background: PREMIUM.accentSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <PremiumCard style={{ padding: '32px', textAlign: 'center', maxWidth: 360 }}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
                Долго загружается
              </p>
              <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '20px' }}>
                Проверьте интернет и попробуйте снова
              </p>
              <Button type="button" onClick={loadMasterData}>
                Повторить
              </Button>
            </PremiumCard>
          </div>
        </ClientThemeRoot>
      );
    }
    return (
      <ClientThemeRoot themeId={clientThemeId}>
        <AppSplash label="Загрузка страницы" />
      </ClientThemeRoot>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (!master) {
    const is404 = loadError === 'Мастер не найден';
    return (
      <ClientThemeRoot themeId={clientThemeId}>
        <div
          style={{
            minHeight: '100dvh',
            background: PREMIUM.bgGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <PremiumCard style={{ padding: '40px', textAlign: 'center', maxWidth: 400 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: PREMIUM.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '36px',
              }}
            >
              😕
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
              {is404 ? 'Мастер не найден' : 'Не удалось открыть страницу'}
            </h2>
            <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '20px' }}>
              {is404 ? 'Проверьте ссылку или возьмите новую в кабинете мастера → Ссылки' : (loadError || 'Попробуйте обновить страницу позже')}
            </p>
            {!is404 && (
              <Button type="button" onClick={loadMasterData}>
                Повторить
              </Button>
            )}
          </PremiumCard>
        </div>
      </ClientThemeRoot>
    );
  }

  if ((!authChecked || authPending) && !isClientSessionValid(clientAuth) && !inWebApp && searchParams.get('a')) {
    return (
      <ClientThemeRoot themeId={clientThemeId}>
        <AppSplash label="Вход" />
      </ClientThemeRoot>
    );
  }

  const guestNeedsAuthForTab = (tabId) => {
    if (isClientSessionValid(clientAuth) || inWebApp) return false;
    return tabId === 'appointments';
  };

  // ============================================================
  // MAIN APP
  // ============================================================
  return (
    <ClientThemeRoot themeId={clientThemeId}>
      <div
        style={{
          minHeight: '100dvh',
          background: PREMIUM.bgGradient,
          display: 'flex',
          flexDirection: 'column',
          // Override theme CSS variables to prevent old design from showing through
          '--ct-bg': '#FFFFFF',
          '--ct-bg-soft': 'rgba(255, 255, 255, 0.6)',
          '--ct-shell-gradient': 'none',
          '--ct-surface': 'rgba(255, 255, 255, 0.92)',
          '--ct-border': 'rgba(0, 0, 0, 0.06)',
          '--ct-border-soft': 'rgba(0, 0, 0, 0.08)',
          '--ct-text': '#2b2b2b',
          '--ct-text-muted': '#6b7579',
          '--ct-accent': '#6A5ACD',
          '--ct-accent-hover': '#5A4CBD',
          '--ct-accent-soft': 'rgba(106, 90, 205, 0.1)',
          '--ct-accent-muted': 'rgba(106, 90, 205, 0.25)',
          '--ct-accent-ring': 'rgba(106, 90, 205, 0.35)',
          '--ct-on-accent': '#FFFFFF',
          '--ct-hero-gradient': 'none',
          '--ct-header-bg': 'rgba(255, 255, 255, 0.85)',
          '--ct-tab-bar-bg': 'rgba(255, 255, 255, 0.85)',
        }}
      >
        {/* Header */}
        <header
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: messengerBackdropFilter(PREMIUM.blurHeavy),
            WebkitBackdropFilter: messengerBackdropFilter(PREMIUM.blurHeavy),
            borderBottom: `1px solid ${PREMIUM.borderCard}`,
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <BrandName
              style={{
                fontSize: '18px',
                color: PREMIUM.accent,
                letterSpacing: '-0.02em'
              }}
            />

            {/* Desktop tab navigation */}
            <div
              style={{
                alignItems: 'center',
                gap: '4px',
              }}
              className="hidden lg:flex"
            >
              {CLIENT_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: activeTab === id
                      ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`
                      : 'transparent',
                    color: activeTab === id ? '#fff' : PREMIUM.textSecondary,
                    fontWeight: '600',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: activeTab === id ? '0 2px 8px rgba(106, 90, 205, 0.3)' : 'none',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Spacer for mobile alignment */}
            <div className="lg:hidden" style={{ width: '60px' }} />
          </div>
        </header>

        {inWebApp && clientAuth?.clientToken && !loading && (
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              width: '100%',
              padding: '12px 16px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(106, 90, 205, 0.08)',
                border: '1px solid rgba(106, 90, 205, 0.2)',
              }}
            >
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: PREMIUM.textSecondary }}>
                Если страница грузится плохо в {webAppChannelLabel}, откройте запись в Safari или Chrome.
              </p>
              <button
                type="button"
                onClick={() => openBookingInSystemBrowser(clientAuth)}
                style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: PREMIUM.accent,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Открыть в браузере
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%',
            flex: 1,
            padding: '16px',
            paddingBottom: '100px',
          }}
        >
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <ClientHomeUniversal
              master={master}
              title={title}
              reviewSummary={reviewSummary}
              photoItems={photoItems}
              videoItems={videoItems}
              priceGroups={priceGroups}
              showMap={showMap}
              onBook={() => { setActiveTab('booking'); setStep('master'); }}
              onAppointments={() => setActiveTab('appointments')}
              pickService={pickService}
              openMedia={openMedia}
            />
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            guestNeedsAuthForTab('appointments') ? (
              <ClientAuthGate
                master={master}
                masterIdEncoded={masterId}
                priceList={priceList}
                reviewSummary={reviewSummary}
                telegramBotUsername={bookingConfig?.telegramBotUsername}
                telegramBotDeepLink={bookingConfig?.telegramBotDeepLink}
                maxBotDeepLink={bookingConfig?.maxBotDeepLink}
                onAuthenticated={handleAuthenticated}
              />
            ) : inWebApp && !clientAuth?.clientToken ? (
              <WebAppAuthPrompt
                authPending={authPending}
                onRetry={retryWebAppAuth}
                channelLabel={webAppChannelLabel}
              />
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: PREMIUM.textPrimary, padding: '0 4px' }}>
                Мои записи
              </h2>

              {appointmentsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      border: '4px solid rgba(217, 122, 82, 0.2)',
                      borderTopColor: PREMIUM.accent,
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto',
                    }}
                  />
                </div>
              ) : appointments.length === 0 ? (
                <PremiumCard style={{ padding: '32px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: PREMIUM.accentSoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <ListChecks size={32} color={PREMIUM.accent} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
                    Записей пока нет
                  </h3>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '24px' }}>
                    Выберите услугу и запишитесь к мастеру
                  </p>
                  <PremiumCtaBtn onClick={() => setActiveTab('booking')}>
                    <CalendarDays size={20} />
                    Записаться
                  </PremiumCtaBtn>
                </PremiumCard>
              ) : (
                appointments.map((apt) => {
                  const aptMaster = teamMasters.find((m) => m.id === apt.salon_master_id) || selectedSalonMaster || master;
                  return (
                    <PremiumCard key={apt.id} style={{ padding: '20px' }}>
                      {/* Master photo + service info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <SalonMasterAvatar
                          master={aptMaster}
                          size={64}
                          shadow={PREMIUM.shadowAvatar}
                          fallbackStyle={{ background: PREMIUM.accentSoft, color: PREMIUM.accent }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>{apt.service_name}</p>
                          <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>{aptMaster?.name}</p>
                          <p style={{ fontSize: '15px', fontWeight: '800', color: PREMIUM.accent, marginTop: '4px' }}>
                            {formatPrice(apt.service_price)}
                          </p>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: PREMIUM.accentSoft,
                            color: PREMIUM.accent,
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: PREMIUM.radiusFull,
                          }}
                        >
                          <Star size={12} />
                          Активна
                        </span>
                      </div>

                      {/* Date & Time */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          background: PREMIUM.bgSoft,
                          border: `1px solid ${PREMIUM.borderLight}`,
                          borderRadius: PREMIUM.radiusFull,
                          marginBottom: '12px',
                        }}
                      >
                        <CalendarDays size={16} color={PREMIUM.accent} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textPrimary }}>
                          {formatSalonDateTime(apt.appointment_time, salonTimezone)}
                        </span>
                      </div>

                      {apt.address && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            color: PREMIUM.textSecondary,
                            marginBottom: '16px',
                          }}
                        >
                          <MapPin size={16} />
                          {apt.address}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <PremiumSecondaryBtn onClick={() => setConfirmDialog({ type: 'reschedule', appointment: apt })} style={{ flex: 1 }}>
                          <MessageCircle size={16} />
                          Перенести
                        </PremiumSecondaryBtn>
                        <PremiumDangerBtn onClick={() => setConfirmDialog({ type: 'cancel', appointment: apt })}>
                          Отменить
                        </PremiumDangerBtn>
                      </div>
                    </PremiumCard>
                  );
                })
              )}
            </div>
            )
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <PremiumCard>
              <ClientReviewsPanel
                reviews={reviews}
                reviewSummary={reviewSummary}
                masterId={apiSalonId || masterId}
                clientAuth={clientAuth}
                formData={formData}
                onSubmitted={loadMasterData}
              />
            </PremiumCard>
          )}

          {/* BOOKING TAB */}
          {activeTab === 'booking' && (
            inWebApp && !clientAuth?.clientToken ? (
              <WebAppAuthPrompt
                authPending={authPending}
                onRetry={retryWebAppAuth}
                channelLabel={webAppChannelLabel}
              />
            ) : (
            <div id="booking-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bookingConfig?.billingEnabled === true && bookingConfig?.onlineBookingAllowed === false ? (
                <PremiumCard style={{ padding: '32px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'rgba(255, 193, 7, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      fontSize: '32px',
                    }}
                  >
                    ⏸
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
                    Запись недоступна
                  </h2>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '24px' }}>
                    {bookingUnavailableContactHint(bookingUnavailableContact)}
                  </p>
                  <MasterBookingContact master={master} size="md" variant="theme" />
                </PremiumCard>
              ) : step === 'done' ? (
                <PremiumCard style={{ padding: '40px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'rgba(76, 175, 80, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <Check size={40} color="#4CAF50" />
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
                    {bookingSuccessWasReschedule ? 'Запись перенесена!' : 'Вы записаны!'}
                  </h2>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '8px' }}>
                    {selectedService?.name}
                  </p>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '24px' }}>
                    {selectedSlot && formatSalonDateTime(selectedSlot, salonTimezone)}
                  </p>
                  <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginBottom: '32px' }}>
                    {(confirmedChannel === 'email')
                      ? 'Детали записи отправлены на ваш email.'
                      : confirmedChannel
                        ? <>Напоминания придут в <MessengerLabel channel={confirmedChannel} size="xs" /> за 24 часа и за 3 часа до визита.</>
                        : clientAuth?.channel
                          ? <>Напоминание в <MessengerLabel channel={clientAuth.channel} size="xs" /></>
                          : 'Ждём вас!'}
                  </p>
                  <PremiumCtaBtn onClick={() => { setActiveTab('appointments'); setRescheduleId(null); setStep('master'); setSelectedSlot(null); setSelectedService(null); resetConfirmFlow(); loadAppointments(); }}>
                    <ListChecks size={20} />
                    Мои записи
                  </PremiumCtaBtn>
                  <PremiumSecondaryBtn
                    onClick={() => {
                      setRescheduleId(null);
                      setStep('master');
                      setSelectedSlot(null);
                      setSelectedService(null);
                      setSelectedSalonMaster(null);
                      loadAppointments();
                    }}
                    style={{ maxWidth: 300, margin: '12px auto 0' }}
                  >
                    Новая запись
                  </PremiumSecondaryBtn>
                </PremiumCard>
              ) : (
                <>
                  {/* Step progress indicator */}
                  {BOOKING_STEPS.includes(step) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px' }}>
                      {BOOKING_STEPS.map((s, idx) => {
                        const currentIdx = BOOKING_STEPS.indexOf(step);
                        const isCompleted = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isCompleted
                                  ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`
                                  : isCurrent
                                  ? PREMIUM.accent
                                  : PREMIUM.bgSoft,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: PREMIUM.transition,
                                flexShrink: 0,
                              }}
                            >
                              {isCompleted ? (
                                <Check size={14} color="#fff" strokeWidth={3} />
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: '800', color: isCurrent ? '#fff' : PREMIUM.textMuted }}>
                                  {idx + 1}
                                </span>
                              )}
                            </div>
                            {idx < BOOKING_STEPS.length - 1 && (
                              <div
                                style={{
                                  flex: 1,
                                  height: '3px',
                                  background: isCompleted ? PREMIUM.accent : PREMIUM.bgSoft,
                                  borderRadius: '99px',
                                  transition: PREMIUM.transition,
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* STEP 1: MASTER SELECTION */}
                  {step === 'master' && (
                    <>
                      <PremiumCard style={{ padding: '20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                          Мастер
                        </p>
                        {teamMasters.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '24px', fontSize: '14px', color: PREMIUM.textSecondary }}>
                            Нет доступных мастеров
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {teamMasters.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => pickSalonMaster(m)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '14px',
                                  padding: '14px 16px',
                                  background: selectedSalonMaster?.id === m.id ? PREMIUM.accentSoft : 'rgba(255,255,255,0.92)',
                                  border: selectedSalonMaster?.id === m.id ? `1.5px solid ${PREMIUM.accent}` : `1.5px solid ${PREMIUM.borderLight}`,
                                  borderRadius: '20px',
                                  cursor: 'pointer',
                                  transition: PREMIUM.transition,
                                  backdropFilter: PREMIUM.blurMedium,
                                  WebkitBackdropFilter: PREMIUM.blurMedium,
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                              >
                                <SalonMasterAvatar
                                  master={m}
                                  size={72}
                                  shadow={PREMIUM.shadowAvatar}
                                  fallbackStyle={{ background: PREMIUM.accentSoft, color: PREMIUM.accent }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: '16px', fontWeight: '700', color: PREMIUM.textPrimary, lineHeight: 1.3 }}>
                                    {formatSalonMasterName(m)}
                                  </p>
                                  {(m.specialty || m.specialization) && (
                                    <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '4px', lineHeight: 1.35 }}>
                                      {m.specialty || m.specialization}
                                    </p>
                                  )}
                                </div>
                                {selectedSalonMaster?.id === m.id && (
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      background: PREMIUM.accent,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Check size={16} color="#fff" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </PremiumCard>
                    </>
                  )}

                  {/* STEP 2: SERVICE SELECTION */}
                  {step === 'service' && (
                    <>
                      <PremiumCard style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <button
                            onClick={() => setStep('master')}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: PREMIUM.bgSoft,
                              border: `1px solid ${PREMIUM.borderLight}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: PREMIUM.transition,
                              flexShrink: 0,
                            }}
                          >
                            <ChevronLeft size={18} color={PREMIUM.textPrimary} />
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textSecondary }}>
                              {formatSalonMasterName(selectedSalonMaster)}
                            </p>
                            {(selectedSalonMaster?.specialty || selectedSalonMaster?.specialization) && (
                              <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginTop: '2px' }}>
                                {selectedSalonMaster.specialty || selectedSalonMaster.specialization}
                              </p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                          Услуга
                        </p>
                        {servicesForMaster.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '24px', fontSize: '14px', color: PREMIUM.textSecondary }}>
                            У этого мастера нет доступных услуг
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {servicesForMaster.map((item) => (
                              <ServiceCard
                                key={item.id}
                                variant="compact"
                                item={item}
                                selected={selectedService?.id === item.id}
                                onSelect={selectBookingService}
                                onImageOpen={openServiceImage}
                              />
                            ))}
                          </div>
                        )}
                      </PremiumCard>
                    </>
                  )}

                  {/* STEP 3: DATE & TIME */}
                  {step === 'datetime' && (
                    <>
                      <PremiumCard style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <button
                            onClick={() => setStep('service')}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: PREMIUM.bgSoft,
                              border: `1px solid ${PREMIUM.borderLight}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: PREMIUM.transition,
                              flexShrink: 0,
                            }}
                          >
                            <ChevronLeft size={18} color={PREMIUM.textPrimary} />
                          </button>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textSecondary }}>
                            {selectedService?.name} · {formatSalonMasterName(selectedSalonMaster)}
                          </p>
                        </div>
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                              Дата
                            </p>
                            <div className="premium-calendar-wrap" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                              <Suspense fallback={<AppSplash fullScreen={false} label="Загрузка календаря" />}>
                                <BookingDateCalendar
                                  onChange={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                                  value={selectedDate}
                                  minDate={new Date()}
                                  locale="ru-RU"
                                  className="premium-calendar"
                                />
                              </Suspense>
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '8px' }}>
                              Время
                            </p>
                            <p style={{ fontSize: '12px', color: PREMIUM.textSecondary, marginBottom: '12px' }}>
                              По времени мастера · {salonTimezoneLabel}
                            </p>
                            {availableSlots.length === 0 ? (
                              <div
                                style={{
                                  padding: '32px 16px',
                                  textAlign: 'center',
                                  fontSize: '14px',
                                  color: PREMIUM.textSecondary,
                                  background: PREMIUM.bgSoft,
                                  border: `1px solid ${PREMIUM.borderLight}`,
                                  borderRadius: '20px',
                                }}
                              >
                                Нет свободных слотов
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(2, 1fr)',
                                  gap: '8px',
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                  padding: '4px',
                                }}
                              >
                                {availableSlots.map((slot) => {
                                  const label = formatSalonTime(slot, salonTimezone);
                                  return (
                                    <PremiumTimeSlot
                                      key={slot}
                                      time={label}
                                      selected={selectedSlot === slot}
                                      onClick={() => setSelectedSlot(slot)}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </PremiumCard>

                      <PremiumCtaBtn
                        onClick={() => setStep('confirm')}
                        disabled={!selectedSlot}
                      >
                        Далее
                        <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                      </PremiumCtaBtn>
                    </>
                  )}

                  {/* STEP 4: CONFIRM & BOOK */}
                  {step === 'confirm' && selectedSlot && (
                    <form
                      ref={bookingFormRef}
                      onSubmit={handleBooking}
                      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                    >
                      <PremiumCard style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              resetConfirmFlow();
                              setStep('datetime');
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: PREMIUM.bgSoft,
                              border: `1px solid ${PREMIUM.borderLight}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: PREMIUM.transition,
                              flexShrink: 0,
                            }}
                          >
                            <ChevronLeft size={18} color={PREMIUM.textPrimary} />
                          </button>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textSecondary }}>
                            Подтверждение
                          </p>
                        </div>

                        {/* Summary */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: PREMIUM.bgSoft, borderRadius: '20px', marginBottom: '20px' }}>
                          <SalonMasterAvatar
                            master={selectedSalonMaster}
                            size={64}
                            radius={16}
                            fallbackStyle={{ background: PREMIUM.accentSoft, color: PREMIUM.accent }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>{selectedService?.name}</p>
                            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>{formatSalonMasterName(selectedSalonMaster)}</p>
                            {(selectedSalonMaster?.specialty || selectedSalonMaster?.specialization) && (
                              <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginTop: '2px' }}>
                                {selectedSalonMaster.specialty || selectedSalonMaster.specialization}
                              </p>
                            )}
                            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>
                              {formatSalonDateTime(selectedSlot, salonTimezone)}
                            </p>
                            {selectedSlotLocalHint && (
                              <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginTop: '4px' }}>
                                {selectedSlotLocalHint}
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                        <BookingRequiredSection
                          title="Ваши контакты"
                          subtitle="Укажите имя и телефон — без них запись не оформится"
                          incomplete={!canSubmitBooking(formData)}
                        >
                          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                            <Input
                              label="Ваше имя"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Например, Анна"
                              error={formData.name ? getClientNameError(formData.name) : null}
                            />
                            <PhoneRuInput
                              label="Телефон"
                              required
                              value={formData.phone}
                              onChange={(phone) => setFormData({ ...formData, phone })}
                            />
                          </div>
                        </BookingRequiredSection>

                        <div style={{ fontSize: '13px', color: PREMIUM.textSecondary, lineHeight: 1.45 }}>
                          <PersonalDataConsentCheckbox
                            checked={pdConsent}
                            onChange={setPdConsent}
                            variant="client"
                            masterTitle={title}
                            id="client-pd-consent"
                            labelClassName="flex gap-3 cursor-pointer"
                            checkboxClassName="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                            linkStyle={{ color: PREMIUM.accent, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                          />
                        </div>

                        {!rescheduleId && confirmPhase === 'choose' && (
                          <BookingRequiredSection
                            title="Способ подтверждения"
                            subtitle="Выберите, как подтвердить запись: Telegram, MAX или email с кодом"
                            incomplete={!confirmChannel}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {CONFIRM_CHANNELS.map((ch) => (
                                <ConfirmChannelCard
                                  key={ch.id}
                                  channel={ch.id}
                                  selected={confirmChannel}
                                  onSelect={setConfirmChannel}
                                  emphasize={!confirmChannel}
                                />
                              ))}
                            </div>
                            {confirmChannel === 'email' && (
                              <div style={{ marginTop: '14px' }}>
                                <Input
                                  label="Email для кода"
                                  type="email"
                                  required
                                  value={confirmEmail}
                                  onChange={(e) => setConfirmEmail(e.target.value)}
                                  placeholder="anna@example.com"
                                />
                              </div>
                            )}
                          </BookingRequiredSection>
                        )}
                        </div>

                        {!rescheduleId && confirmPhase === 'waiting' && (
                          <PremiumCard style={{ marginTop: '20px', padding: '20px', background: PREMIUM.accentSoft, border: `1px solid ${PREMIUM.borderAccent}` }}>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary, marginBottom: '8px' }}>
                              Подтвердите в {confirmChannel === 'telegram' ? 'Telegram' : 'MAX'}
                            </p>
                            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginBottom: '16px', lineHeight: 1.5 }}>
                              Откройте бота — придёт сообщение с услугой, временем и стоимостью.
                              Нажмите «Подтвердить запись». Напоминания за 24 ч и 3 ч придут в этот бот.
                            </p>
                            {botDeepLink && (
                              <PremiumCtaBtn
                                type="button"
                                style={{ width: '100%', marginBottom: '12px' }}
                                onClick={() => window.open(botDeepLink, '_blank', 'noopener,noreferrer')}
                              >
                                Открыть {confirmChannel === 'telegram' ? 'Telegram' : 'MAX'}
                              </PremiumCtaBtn>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  border: '2px solid rgba(106, 90, 205, 0.25)',
                                  borderTopColor: PREMIUM.accent,
                                  borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite',
                                }}
                              />
                              <span style={{ fontSize: '13px', color: PREMIUM.textSecondary }}>Ждём подтверждения…</span>
                            </div>
                          </PremiumCard>
                        )}

                        {!rescheduleId && confirmPhase === 'code' && (
                          <div style={{ marginTop: '20px' }}>
                            <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '12px', lineHeight: 1.45 }}>
                              Код отправлен на <b>{confirmEmail}</b>. Введите его ниже.
                            </p>
                            <Input
                              label="Код из письма"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              value={emailCode}
                              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="482913"
                            />
                          </div>
                        )}

                        {confirmError && (
                          <p style={{ marginTop: '12px', fontSize: '13px', color: '#c62828' }}>{confirmError}</p>
                        )}

                        <div style={{ marginTop: '16px' }}>
                          {rescheduleId ? (
                            <PremiumCtaBtn
                              type="submit"
                              disabled={!canSubmitBooking(formData) || !pdConsent}
                              loading={booking}
                            >
                              Перенести запись
                            </PremiumCtaBtn>
                          ) : confirmPhase === 'code' ? (
                            <PremiumCtaBtn
                              type="button"
                              disabled={emailCode.length !== 6}
                              loading={booking}
                              onClick={handleConfirmEmailCode}
                            >
                              Подтвердить код
                            </PremiumCtaBtn>
                          ) : confirmPhase === 'waiting' ? (
                            <PremiumSecondaryBtn
                              type="button"
                              onClick={() => {
                                resetConfirmFlow();
                              }}
                            >
                              Изменить способ
                            </PremiumSecondaryBtn>
                          ) : (
                            <PremiumCtaBtn
                              type="submit"
                              disabled={!canSubmitBooking(formData) || !pdConsent || !confirmChannel || (confirmChannel === 'email' && !confirmEmail.trim())}
                              loading={booking}
                            >
                              {confirmChannel === 'email' ? 'Получить код на почту' : 'Получить подтверждение в боте'}
                            </PremiumCtaBtn>
                          )}
                        </div>
                      </PremiumCard>
                    </form>
                  )}

                  {rescheduleId && (
                    <PremiumCard style={{ padding: '16px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: PREMIUM.textSecondary }}>
                        {rescheduleLoading ? 'Загружаем вашу запись...' : 'Выберите новую дату и время для переноса'}
                      </p>
                    </PremiumCard>
                  )}
                </>
              )}
            </div>
            )
          )}
        </main>

        {/* Mobile bottom nav */}
        <PremiumTabBar activeTab={activeTab} onTabChange={handleTabChange} />

        

        {/* Confirmation dialog */}
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.type === 'cancel' ? 'Отменить запись?' : 'Перенести запись?'}
            message={
              confirmDialog.type === 'cancel'
                ? `Вы уверены, что хотите отменить запись на ${confirmDialog.appointment.service_name}?`
                : `Вы уверены, что хотите перенести запись на ${confirmDialog.appointment.service_name}?`
            }
            confirmLabel={confirmDialog.type === 'cancel' ? 'Отменить' : 'Перенести'}
            confirmVariant={confirmDialog.type === 'cancel' ? 'danger' : 'primary'}
            onConfirm={() => {
              if (confirmDialog.type === 'cancel') {
                cancelAppointment(confirmDialog.appointment.id);
              } else {
                rescheduleAppointment(confirmDialog.appointment);
              }
            }}
            onCancel={() => setConfirmDialog(null)}
            loading={confirmLoading}
          />
        )}

        {/* Service image preview */}
        {serviceImagePreview && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setServiceImagePreview(null)}
          >
            <button
              onClick={() => setServiceImagePreview(null)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={24} color="#fff" />
            </button>
            <img
              src={mediaUrl(serviceImagePreview.url)}
              alt={serviceImagePreview.title || ''}
              style={{
                maxHeight: '100dvh',
                width: '100%',
                objectFit: 'contain',
                padding: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Media viewer */}
        {mediaViewer && currentMedia && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              background: '#000',
            }}
            onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              if (touchStartX == null) return;
              const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
              if (Math.abs(delta) > 50) moveMedia(delta > 0 ? -1 : 1);
              setTouchStartX(null);
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                paddingTop: 'calc(16px + env(safe-area-inset-top))',
              }}
            >
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                {currentMedia.title || ''}
              </span>
              <button
                onClick={() => setMediaViewer(null)}
                style={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={24} color="#fff" />
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentMedia.media_type === 'video' ? (
                <video
                  src={mediaUrl(currentMedia.video_url)}
                  controls
                  autoPlay
                  style={{ maxHeight: '80vh', maxWidth: '100%' }}
                />
              ) : currentMedia.media_type === 'external_video' ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <Play size={56} color="#fff" style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
                    Видео откроется на внешнем сайте
                  </p>
                  <a
                    href={currentMedia.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      borderRadius: '16px',
                      background: '#fff',
                      padding: '12px 20px',
                      fontWeight: '600',
                      color: PREMIUM.textPrimary,
                      textDecoration: 'none',
                    }}
                  >
                    Открыть видео
                  </a>
                </div>
              ) : (
                <img
                  src={mediaUrl(currentMedia.image_url)}
                  alt=""
                  style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
            {mediaViewer.items.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                }}
              >
                <button
                  onClick={() => moveMedia(-1)}
                  style={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={24} color="#fff" />
                </button>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500', padding: '0 16px' }}>
                  {mediaViewer.index + 1} / {mediaViewer.items.length}
                </span>
                <button
                  onClick={() => moveMedia(1)}
                  style={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={24} color="#fff" style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {master?.video_reel_url && (
        <MasterVideoReel src={master.video_reel_url} title={title} />
      )}
    </ClientThemeRoot>
  );
}