import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
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
  BadgeCheck
} from 'lucide-react';
import ClientSalonHeader from '../components/client/ClientSalonHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import MessengerLabel from '../components/brand/MessengerLabel';
import ClientAuthGate from '../components/client/ClientAuthGate';
import ClientReviewsPanel from '../components/client/ClientReviewsPanel';
import MasterCallButton from '../components/client/MasterCallButton';
import ServiceCard from '../components/client/ServiceCard';
import MasterVideoReel from '../components/client/MasterVideoReel';
import ClientHomeUniversal from '../components/client/ClientHomeUniversal';
import ClientThemeRoot from '../components/client/ClientThemeRoot';
import { DEFAULT_CLIENT_THEME } from '../config/clientThemes';
import AddressMap from '../components/maps/AddressMap';
import PhoneRuInput from '../components/ui/PhoneRuInput';
import { formatDateTime, formatPrice } from '../lib/format';
import { formatMasterPublicTitle } from '../lib/masterDisplay';
import { isRuPhoneComplete, normalizeRuPhoneForStorage } from '../lib/phoneRu';
import { canSubmitBooking, getClientNameError, isValidClientName } from '../lib/clientBooking';
import { mediaUrl } from '../lib/media';
import { getClientSession, setClientSession, clearClientSession } from '../lib/clientSession';

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

const CLIENT_TABS = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'booking', label: 'Запись', Icon: CalendarDays },
  { id: 'appointments', label: 'Мои записи', Icon: ListChecks },
  { id: 'reviews', label: 'Отзывы', Icon: Star }
];

// ============================================================
// PREMIUM CARD COMPONENT
// ============================================================
function PremiumCard({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: PREMIUM.bgCard,
        backdropFilter: PREMIUM.blurHeavy,
        WebkitBackdropFilter: PREMIUM.blurHeavy,
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
// PREMIUM CALENDAR OVERRIDES
// ============================================================
const calendarCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.premium-calendar-wrap {
  border-radius: 20px !important;
  overflow: hidden !important;
  background: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
}

.premium-calendar {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  width: 100% !important;
}

.premium-calendar .react-calendar__navigation {
  margin-bottom: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

.premium-calendar .react-calendar__navigation button {
  color: #5C4038 !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  border-radius: 12px !important;
  transition: all 0.2s ease !important;
  min-width: 44px !important;
  min-height: 44px !important;
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  cursor: pointer !important;
}

.premium-calendar .react-calendar__navigation button:hover {
  background: rgba(106, 90, 205, 0.1) !important;
  color: #6A5ACD !important;
}

.premium-calendar .react-calendar__month-view__weekdays__weekday {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #999999 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  text-align: center !important;
}

.premium-calendar .react-calendar__tile {
  aspect-ratio: 1 !important;
  border-radius: 14px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #5C4038 !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
  background: transparent !important;
  border: none !important;
  min-width: 40px !important;
  min-height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.premium-calendar .react-calendar__tile:hover {
  background: rgba(106, 90, 205, 0.1) !important;
  color: #6A5ACD !important;
}

.premium-calendar .react-calendar__tile--now {
  background: rgba(106, 90, 205, 0.08) !important;
  color: #6A5ACD !important;
  font-weight: 700 !important;
}

.premium-calendar .react-calendar__tile--active {
  background: linear-gradient(135deg, #6A5ACD 0%, #5A4CBD 100%) !important;
  color: #fff !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 16px rgba(106, 90, 205, 0.35) !important;
}

.premium-calendar .react-calendar__tile--selected {
  background: linear-gradient(135deg, #6A5ACD 0%, #5A4CBD 100%) !important;
  color: #fff !important;
  border-radius: 14px !important;
}

.premium-calendar .react-calendar__tile:disabled {
  color: #C8B8AE !important;
  background: transparent !important;
  cursor: not-allowed !important;
}

.premium-calendar .react-calendar__navigation__next2-label,
.premium-calendar .react-calendar__navigation__prev2-label {
  display: none !important;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Inject calendar CSS
if (typeof document !== 'undefined') {
  const styleId = 'premium-calendar-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = calendarCSS;
    document.head.appendChild(styleEl);
  }
}

// ============================================================
// MAIN CLIENT PAGE COMPONENT
// ============================================================
export default function ClientPage() {
  const { masterId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [master, setMaster] = useState(null);
  const [bookingConfig, setBookingConfig] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [teamMasters, setTeamMasters] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [selectedSalonMaster, setSelectedSalonMaster] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: null });
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [step, setStep] = useState('service');
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'cancel'|'reschedule', appointment }
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '+7' });
  const bookingFormRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [booking, setBooking] = useState(false);
  const [clientAuth, setClientAuth] = useState({ channel: 'telegram', userId: 'temp-test-user', firstName: 'Гость' });
  const [authChecked, setAuthChecked] = useState(false);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  const clientThemeId = master?.client_theme || DEFAULT_CLIENT_THEME;

  const resolveAuthFromUrl = useCallback(() => {
    const ch = searchParams.get('ch');
    const uid = searchParams.get('uid');
    const tab = searchParams.get('tab');
    const reschedule = searchParams.get('reschedule');

    if (tab && CLIENT_TABS.some((item) => item.id === tab)) setActiveTab(tab);
    if (reschedule) {
      setRescheduleId(reschedule);
      setActiveTab('booking');
      setStep('service');
    }

    if (uid && (ch === 'max' || ch === 'telegram')) {
      const session = {
        channel: ch,
        userId: uid,
        firstName: searchParams.get('fn') || undefined,
        photoUrl: searchParams.get('photo') || undefined
      };
      setClientSession(masterId, session);
      setClientAuth(session);
      setSearchParams({}, { replace: true });
      return session;
    }

    return getClientSession(masterId);
  }, [masterId, searchParams, setSearchParams]);

  const loadMasterData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await axios.get(`/api/master/${encodeURIComponent(masterId)}`);
      const groups = res.data.priceGroups || [];
      const masters = res.data.teamMasters || [];
      const flat = res.data.priceList || groups.flatMap((g) => g.services);
      const firstMaster = masters[0] || null;
      const firstServices = groups.find((g) => g.master.id === firstMaster?.id)?.services || flat;

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
      setSelectedSalonMaster((prev) => prev || firstMaster);
      if (!selectedService && firstServices?.length === 1) setSelectedService(firstServices[0]);
      setReviewSummary(res.data.reviewSummary || { count: 0, average: null });
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error;
      setLoadError(msg || (err.response?.status === 404 ? 'Мастер не найден' : 'Не удалось загрузить страницу'));
    } finally {
      setLoading(false);
    }
  }, [masterId, selectedService]);

  const loadAppointments = useCallback(async () => {
    if (!clientAuth) return;
    setAppointmentsLoading(true);
    try {
      const res = await axios.get(`/api/client/my/${encodeURIComponent(clientAuth.userId)}`, {
        params: { channel: clientAuth.channel, masterId }
      });
      setAppointments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [clientAuth, masterId]);

  useEffect(() => {
    const session = resolveAuthFromUrl();
    if (session) setClientAuth(session);
    setAuthChecked(true);
  }, [resolveAuthFromUrl]);

  // TEMPORARY: Auto-set temp auth for testing (remove this block when re-enabling auth)
  useEffect(() => {
    if (authChecked && !clientAuth) {
      setClientAuth({ channel: 'telegram', userId: 'temp-test-user', firstName: 'Гость' });
    }
  }, [authChecked, clientAuth]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (clientAuth) loadAppointments();
  }, [clientAuth, loadAppointments]);

  useEffect(() => {
    if (selectedDate && master && clientAuth && selectedSalonMaster) loadSlots();
  }, [selectedDate, master, clientAuth, selectedSalonMaster, selectedService, rescheduleId]);

  useEffect(() => {
    if (clientAuth?.firstName && isValidClientName(clientAuth.firstName) && !formData.name) {
      setFormData((prev) => ({ ...prev, name: clientAuth.firstName }));
    }
  }, [clientAuth.firstName, formData.name]);

  useEffect(() => {
    if (!clientAuth || !masterId) return;
    axios.post('/api/client/identify', {
      masterId,
      channel: clientAuth.channel,
      userId: clientAuth.userId,
      name: isValidClientName(formData.name)
        ? formData.name.trim()
        : isValidClientName(clientAuth.firstName)
          ? clientAuth.firstName
          : undefined,
      phone: isRuPhoneComplete(formData.phone) ? normalizeRuPhoneForStorage(formData.phone) : undefined,
      photoUrl: clientAuth.photoUrl || undefined
    }).catch(() => {});
  }, [clientAuth, masterId, formData.name, formData.phone]);

  useEffect(() => {
    if (!rescheduleId || !clientAuth || !master || teamMasters.length === 0) return;
    let cancelled = false;
    (async () => {
      setRescheduleLoading(true);
      try {
        const res = await axios.get(`/api/client/appointment/${rescheduleId}`, {
          params: { channel: clientAuth.channel, userId: clientAuth.userId }
        });
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
        setStep('service');
      } catch (err) {
        alert(err.response?.data?.error || 'Не удалось загрузить запись для переноса');
        setRescheduleId(null);
      } finally {
        if (!cancelled) setRescheduleLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rescheduleId, clientAuth, master, teamMasters, priceGroups, priceList]);

  const handleAuthenticated = useCallback((session) => {
    setClientSession(masterId, session);
    setClientAuth(session);
    if (session.firstName) setFormData((prev) => ({ ...prev, name: prev.name || session.firstName }));
  }, [masterId]);

  const loadSlots = async () => {
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      if (!selectedSalonMaster?.id) return;
      const params = new URLSearchParams({
        date: dateStr,
        salonMasterId: selectedSalonMaster.id,
        durationMinutes: String(selectedService?.duration_minutes || 60)
      });
      if (rescheduleId) params.set('excludeAppointmentId', rescheduleId);
      const res = await axios.get(`/api/client/${masterId}/slots?${params.toString()}`);
      setAvailableSlots(res.data);
      setSelectedSlot(null);
    } catch (err) {
      console.error(err);
    }
  };

  const servicesForMaster = useMemo(() => {
    if (!selectedSalonMaster) return priceList;
    const group = priceGroups.find((g) => g.master.id === selectedSalonMaster.id);
    return group?.services?.length ? group.services : priceList;
  }, [priceGroups, selectedSalonMaster, priceList]);

  const mediaItems = useMemo(() => portfolio.filter((p) => p.image_url || p.video_url), [portfolio]);
  const showMap = Boolean(master?.latitude && master?.longitude) || Boolean(master?.address);
  const photoItems = useMemo(() => mediaItems.filter((item) => item.media_type === 'image'), [mediaItems]);
  const videoItems = useMemo(() => mediaItems.filter((item) => item.media_type !== 'image'), [mediaItems]);
  const currentMedia = mediaViewer ? mediaViewer.items[mediaViewer.index] : null;
  const title = formatMasterPublicTitle(master);

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
    setStep('master');
    setActiveTab('booking');
    setTimeout(() => document.getElementById('booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  useEffect(() => {
    if (step === 'form' && selectedSlot) {
      setTimeout(() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [step, selectedSlot]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService || !clientAuth) return;

    const nameError = getClientNameError(formData.name);
    if (nameError) {
      alert(nameError);
      return;
    }
    if (!isRuPhoneComplete(formData.phone)) {
      alert('Укажите номер телефона полностью в формате +7 999 123 4567');
      return;
    }
    setBooking(true);
    const wasRescheduling = !!rescheduleId;
    try {
      const payload = {
        masterId,
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

      if (rescheduleId) await axios.put(`/api/client/appointment/${rescheduleId}/reschedule`, payload);
      else {
        console.log('[book] Запись на услугу:', payload);
        await axios.post('/api/client/book', payload);
      }

      setStep('done');
      if (wasRescheduling) setRescheduleId(null);
      await loadAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка записи');
    } finally {
      setBooking(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    setConfirmLoading(true);
    try {
      const payload = { channel: clientAuth.channel, userId: clientAuth.userId };
      if (clientAuth.channel === 'telegram') payload.telegramUserId = clientAuth.userId;
      else payload.maxUserId = clientAuth.userId;
      await axios.post(`/api/client/cancel/${appointmentId}`, payload);
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
    setStep('service');
  };

  const handleSwitchAccount = () => {
    clearClientSession(masterId);
    setClientAuth(null);
    setStep('service');
    setSelectedSlot(null);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: PREMIUM.bgGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid rgba(217, 122, 82, 0.2)',
            borderTopColor: PREMIUM.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (!master) {
    const is404 = loadError === 'Мастер не найден';
    return (
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
          <p style={{ fontSize: '14px', color: PREMIUM.textSecondary }}>
            {is404 ? 'Проверьте ссылку или возьмите новую в кабинете мастера → Ссылки' : (loadError || 'Попробуйте обновить страницу позже')}
          </p>
        </PremiumCard>
      </div>
    );
  }

  // ============================================================
  // AUTH GATE — TEMPORARILY DISABLED FOR TESTING
  // ============================================================
  // if (authChecked && !clientAuth) {
  //   return (
  //     <ClientThemeRoot themeId={clientThemeId}>
  //       <div
  //         style={{
  //           minHeight: '100dvh',
  //           background: PREMIUM.bgGradient,
  //           display: 'flex',
  //           flexDirection: 'column',
  //         }}
  //       >
  //         {/* Header */}
  //         <header
  //           style={{
  //             paddingTop: 'env(safe-area-inset-top)',
  //             background: 'rgba(255, 255, 255, 0.75)',
  //             backdropFilter: PREMIUM.blurHeavy,
  //             WebkitBackdropFilter: PREMIUM.blurHeavy,
  //             borderBottom: `1px solid ${PREMIUM.borderCard}`,
  //             position: 'sticky',
  //             top: 0,
  //             zIndex: 50,
  //           }}
  //         >
  //           <div style={{ maxWidth: '480px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  //             <ClientSalonHeader master={master} title={title} />
  //           </ClientThemeRoot>
  //         </header>
  //
  //         {/* Auth content */}
  //         <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
  //           <ClientAuthGate
  //             master={master}
  //             masterIdEncoded={masterId}
  //             telegramBotUsername={bookingConfig?.telegramBotUsername}
  //             telegramBotDeepLink={bookingConfig?.telegramBotDeepLink}
  //             maxBotDeepLink={bookingConfig?.maxBotDeepLink}
  //             onAuthenticated={handleAuthenticated}
  //           />
  //         </main>
  //       </ClientThemeRoot>
  //     </ClientThemeRoot>
  //   );
  // }
  //
  // if (!clientAuth) {
  //   return (
  //     <div
  //       style={{
  //         minHeight: '100dvh',
  //         background: PREMIUM.bgGradient,
  //         display: 'flex',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //       }}
  //     >
  //       <div
  //         style={{
  //           width: 48,
  //           height: 48,
  //           border: '4px solid rgba(217, 122, 82, 0.2)',
  //           borderTopColor: PREMIUM.accent,
  //           borderRadius: '50%',
  //           animation: 'spin 0.8s linear infinite',
  //         }}
  //       />
  //     </ClientThemeRoot>
  //   );
  // }

  // TEMPORARY: Use temp auth when real auth is not available
  const effectiveClientAuth = clientAuth || { channel: 'telegram', userId: 'temp-test-user', firstName: 'Гость' };

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
            backdropFilter: PREMIUM.blurHeavy,
            WebkitBackdropFilter: PREMIUM.blurHeavy,
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
            <span
              style={{
                fontSize: '18px',
                fontWeight: '800',
                color: PREMIUM.accent,
                letterSpacing: '-0.02em',
              }}
            >
              woner.ru
            </span>

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
              onBook={() => setActiveTab('booking')}
              onAppointments={() => setActiveTab('appointments')}
              pickService={pickService}
              openMedia={openMedia}
            />
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
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
                        <div style={{ width: 64, height: 64, borderRadius: '18px', overflow: 'hidden', flexShrink: 0, boxShadow: PREMIUM.shadowAvatar }}>
                          {aptMaster?.photo_url ? (
                            <img src={mediaUrl(aptMaster.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', background: PREMIUM.accentSoft, color: PREMIUM.accent }}>
                              {aptMaster?.name?.[0] || 'М'}
                            </div>
                          )}
                        </div>
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
                          {formatDateTime(apt.appointment_time)}
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
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <PremiumCard>
              <ClientReviewsPanel
                reviews={reviews}
                reviewSummary={reviewSummary}
                masterId={masterId}
                clientAuth={clientAuth}
                formData={formData}
                onSubmitted={loadMasterData}
              />
            </PremiumCard>
          )}

          {/* BOOKING TAB */}
          {activeTab === 'booking' && (
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
                    {bookingConfig?.onlineBookingBlockReason || 'Онлайн-запись временно недоступна. Попробуйте позже.'}
                  </p>
                  {master?.phone && <MasterCallButton phone={master.phone} size="md" variant="theme" />}
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
                    {rescheduleId ? 'Запись перенесена!' : 'Вы записаны!'}
                  </h2>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '8px' }}>
                    {selectedService?.name}
                  </p>
                  <p style={{ fontSize: '14px', color: PREMIUM.textSecondary, marginBottom: '24px' }}>
                    {selectedSlot && new Date(selectedSlot).toLocaleString('ru-RU')}
                  </p>
                  <p style={{ fontSize: '12px', color: PREMIUM.textMuted, marginBottom: '32px' }}>
                    Напоминание в <MessengerLabel channel={clientAuth.channel} size="xs" />
                  </p>
                  <PremiumCtaBtn onClick={() => { setActiveTab('appointments'); setRescheduleId(null); setStep('service'); setSelectedSlot(null); setSelectedService(null); loadAppointments(); }}>
                    <ListChecks size={20} />
                    Мои записи
                  </PremiumCtaBtn>
                  <PremiumSecondaryBtn
                    onClick={() => {
                      setRescheduleId(null);
                      setStep('service');
                      setSelectedSlot(null);
                      setSelectedService(null);
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
                  {['service', 'master', 'datetime', 'confirm'].includes(step) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px' }}>
                      {['service', 'master', 'datetime', 'confirm'].map((s, idx) => {
                        const steps = ['service', 'master', 'datetime', 'confirm'];
                        const currentIdx = steps.indexOf(step);
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
                            {idx < steps.length - 1 && (
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

                  {/* STEP 1: SERVICE SELECTION */}
                  {step === 'service' && (
                    <>
                      {/* Category tabs */}
                      {priceGroups.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 4px', paddingBottom: '4px' }}>
                          {priceGroups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => {
                                const masterFromGroup = teamMasters.find((m) => m.id === group.master?.id) || teamMasters[0];
                                pickSalonMaster(masterFromGroup);
                              }}
                              style={{
                                padding: '8px 16px',
                                background: PREMIUM.bgSoft,
                                border: `1.5px solid ${PREMIUM.borderLight}`,
                                borderRadius: PREMIUM.radiusButton,
                                fontSize: '13px',
                                fontWeight: '600',
                                color: PREMIUM.textPrimary,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: PREMIUM.transition,
                                flexShrink: 0,
                              }}
                            >
                              {group.name || group.master?.name || 'Услуги'}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Services */}
                      <PremiumCard style={{ padding: '20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                          Услуга
                        </p>
                        {servicesForMaster.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '24px', fontSize: '14px', color: PREMIUM.textSecondary }}>
                            Нет доступных услуг
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {servicesForMaster.map((item) => (
                              <ServiceCard
                                key={item.id}
                                variant="compact"
                                item={item}
                                selected={selectedService?.id === item.id}
                                onSelect={pickService}
                                onImageOpen={openServiceImage}
                              />
                            ))}
                          </div>
                        )}
                      </PremiumCard>

                      <PremiumCtaBtn
                        onClick={() => setStep('master')}
                        disabled={!selectedService}
                      >
                        Далее
                        <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                      </PremiumCtaBtn>
                    </>
                  )}

                  {/* STEP 2: MASTER SELECTION */}
                  {step === 'master' && (
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
                            {selectedService?.name}
                          </p>
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                          Мастер
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {teamMasters.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setSelectedSalonMaster(m); setStep('datetime'); }}
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
                              <div
                                style={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: '16px',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  boxShadow: PREMIUM.shadowAvatar,
                                }}
                              >
                                {m.photo_url ? (
                                  <img src={mediaUrl(m.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '20px',
                                      fontWeight: '700',
                                      background: PREMIUM.accentSoft,
                                      color: PREMIUM.accent,
                                    }}
                                  >
                                    {m.name?.[0]}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>{m.name}</p>
                                {m.specialization && (
                                  <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>{m.specialization}</p>
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
                      </PremiumCard>
                    </>
                  )}

                  {/* STEP 3: DATE & TIME */}
                  {step === 'datetime' && (
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
                          <p style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textSecondary }}>
                            {selectedService?.name} · {selectedSalonMaster?.name}
                          </p>
                        </div>
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                              Дата
                            </p>
                            <div className="premium-calendar-wrap" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                              <Calendar
                                onChange={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                                value={selectedDate}
                                minDate={new Date()}
                                locale="ru-RU"
                                className="premium-calendar"
                              />
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: PREMIUM.textMuted, marginBottom: '12px' }}>
                              Время
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
                                  const label = new Date(slot).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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
                            onClick={() => setStep('datetime')}
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
                          <div style={{ width: 64, height: 64, borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                            {selectedSalonMaster?.photo_url ? (
                              <img src={mediaUrl(selectedSalonMaster.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', background: PREMIUM.accentSoft, color: PREMIUM.accent }}>
                                {selectedSalonMaster?.name?.[0]}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>{selectedService?.name}</p>
                            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>{selectedSalonMaster?.name}</p>
                            <p style={{ fontSize: '13px', color: PREMIUM.textSecondary, marginTop: '2px' }}>
                              {new Date(selectedSlot).toLocaleString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
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
                        <div style={{ marginTop: '16px' }}>
                          <PremiumCtaBtn
                            type="submit"
                            disabled={!canSubmitBooking(formData)}
                            loading={booking}
                          >
                            {rescheduleId ? 'Перенести запись' : 'Записаться'}
                          </PremiumCtaBtn>
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
          )}
        </main>

        {/* Mobile bottom nav */}
        <PremiumTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        

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