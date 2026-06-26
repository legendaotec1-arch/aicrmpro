import { useState } from 'react';
import { CalendarDays, ChevronDown, ListChecks, MapPin, Play, Star, Phone, BadgeCheck } from 'lucide-react';
import ClientHomeServices from './ClientHomeServices';
import FullscreenImageViewer from './FullscreenImageViewer';
import AddressMap from '../maps/AddressMap';
import { mediaUrl } from '../../lib/media';
import { messengerBackdropFilter } from '../../lib/messengerWebApp';

const PREMIUM = {
  bgCard: 'rgba(255, 255, 255, 0.92)',
  bgCardSolid: '#FFFFFF',
  bgSoft: 'rgba(220, 220, 220, 0.5)',
  blurHeavy: 'blur(20px)',
  blurMedium: 'blur(12px)',
  blurLight: 'blur(8px)',
  accent: '#6A5ACD',
  accentLight: '#5A4CBD',
  accentSoft: 'rgba(106, 90, 205, 0.1)',
  accentGlow: 'rgba(106, 90, 205, 0.3)',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textWhite: '#FFFFFF',
  borderCard: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  shadowCard: '0 2px 16px rgba(0, 0, 0, 0.04)',
  shadowCardHover: '0 4px 24px rgba(0, 0, 0, 0.08)',
  radiusCard: '20px',
  radiusButton: '14px',
  radiusThumb: '16px',
  radiusFull: '99px',
  transition: 'all 0.2s ease-out',
};

function PremiumCard({ children, style = {} }) {
  const blur = messengerBackdropFilter(PREMIUM.blurHeavy);
  return (
    <div
      style={{
        background: PREMIUM.bgCard,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        border: `1px solid ${PREMIUM.borderCard}`,
        borderRadius: PREMIUM.radiusCard,
        boxShadow: PREMIUM.shadowCard,
        overflow: 'hidden',
        transition: PREMIUM.transition,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PremiumCtaBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 24px',
        background: `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
        color: PREMIUM.textWhite,
        fontWeight: '700',
        fontSize: '15px',
        borderRadius: PREMIUM.radiusButton,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(106, 90, 205, 0.3)',
        transition: PREMIUM.transition,
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(106, 90, 205, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(106, 90, 205, 0.3)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
    >
      {children}
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
        gap: '8px',
        padding: '12px 20px',
        background: PREMIUM.bgSoft,
        color: PREMIUM.textPrimary,
        fontWeight: '600',
        fontSize: '14px',
        borderRadius: PREMIUM.radiusButton,
        border: `1px solid ${PREMIUM.borderLight}`,
        cursor: 'pointer',
        transition: PREMIUM.transition,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = PREMIUM.bgSoft;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}

function PremiumTag({ children }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        background: PREMIUM.bgSoft,
        border: `1px solid ${PREMIUM.borderLight}`,
        borderRadius: PREMIUM.radiusFull,
        fontSize: '12px',
        fontWeight: '600',
        color: PREMIUM.textPrimary,
      }}
    >
      {children}
    </span>
  );
}

export default function ClientHomeUniversal({
  master,
  title,
  reviewSummary,
  photoItems,
  videoItems,
  priceGroups,
  showMap,
  onBook,
  onAppointments,
  pickService,
  openMedia
}) {
  const [heroPhotoFullscreen, setHeroPhotoFullscreen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const DESCRIPTION_PREVIEW_CHARS = 100;
  const heroPhotoSrc = master?.logo_url ? mediaUrl(master.logo_url) : null;
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Card - Professional Clean Design */}
      <PremiumCard style={{ padding: 0 }}>
        {/* Header Section */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              {heroPhotoSrc && !avatarError ? (
                <button
                  type="button"
                  onClick={() => setHeroPhotoFullscreen(true)}
                  style={{
                    display: 'block',
                    width: '68px',
                    height: '68px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'none',
                    padding: 0,
                    border: 'none',
                    transition: PREMIUM.transition,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  aria-label="Открыть фото"
                >
                  <img
                    src={heroPhotoSrc}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={() => setAvatarError(true)}
                  />
                </button>
              ) : (
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: '700',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {title?.[0] || '?'}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: PREMIUM.textPrimary,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h1>
                {master.verified && <BadgeCheck size={16} color={PREMIUM.accent} />}
              </div>

              {/* Rating */}
              {reviewSummary.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={12}
                        style={{
                          color: i <= Math.round(reviewSummary.average) ? '#FBBF24' : '#E5E7EB',
                          fill: i <= Math.round(reviewSummary.average) ? '#FBBF24' : '#E5E7EB',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: PREMIUM.accent }}>
                    {reviewSummary.average}
                  </span>
                  <span style={{ fontSize: '13px', color: PREMIUM.textSecondary }}>
                    ({reviewSummary.count})
                  </span>
                </div>
              )}

              {/* Tags */}
              {master.tags && master.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {master.tags.slice(0, 3).map((tag) => (
                    <PremiumTag key={tag}>{tag}</PremiumTag>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {master.description && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ borderTop: `1px solid ${PREMIUM.borderCard}`, paddingTop: '16px' }}>
              <p
                style={{
                  fontSize: '14px',
                  color: PREMIUM.textSecondary,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {descriptionExpanded
                  ? master.description
                  : master.description.slice(0, DESCRIPTION_PREVIEW_CHARS) + (master.description.length > DESCRIPTION_PREVIEW_CHARS ? '...' : '')}
              </p>
              {master.description.length > DESCRIPTION_PREVIEW_CHARS && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: PREMIUM.accent,
                  }}
                >
                  {descriptionExpanded ? 'Свернуть' : 'Читать ещё'}
                  <ChevronDown
                    size={14}
                    style={{ transform: descriptionExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PremiumCtaBtn onClick={onBook}>
            <CalendarDays size={18} />
            Записаться
          </PremiumCtaBtn>
          <div style={{ display: 'flex', gap: '10px' }}>
            <PremiumSecondaryBtn onClick={onAppointments} style={{ flex: 1 }}>
              <ListChecks size={16} />
              Мои записи
            </PremiumSecondaryBtn>
            {master.phone && (
              <a
                href={`tel:${master.phone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  background: PREMIUM.bgSoft,
                  color: PREMIUM.textPrimary,
                  fontWeight: '600',
                  fontSize: '14px',
                  borderRadius: PREMIUM.radiusButton,
                  border: `1px solid ${PREMIUM.borderLight}`,
                  textDecoration: 'none',
                  transition: PREMIUM.transition,
                  flex: 1,
                }}
              >
                <Phone size={16} />
                Позвонить
              </a>
            )}
          </div>
        </div>
      </PremiumCard>

      {/* Portfolio Photos */}
      {photoItems.length > 0 && (
        <PremiumCard style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>
              Работы
            </h2>
            <span style={{ fontSize: '13px', color: PREMIUM.textSecondary }}>
              {photoItems.length} фото
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {photoItems.slice(0, 9).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openMedia(photoItems, idx)}
                style={{
                  aspectRatio: '1',
                  borderRadius: PREMIUM.radiusThumb,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'none',
                  padding: 0,
                  border: 'none',
                  transition: PREMIUM.transition,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={mediaUrl(item.thumbnail_url || item.image_url)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      {/* Videos */}
      {videoItems.length > 0 && (
        <PremiumCard style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>
              Видео
            </h2>
            <span style={{ fontSize: '13px', color: PREMIUM.textSecondary }}>
              {videoItems.length}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {videoItems.slice(0, 6).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openMedia(videoItems, idx)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: PREMIUM.radiusThumb,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'none',
                  padding: 0,
                  border: 'none',
                  transition: PREMIUM.transition,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={mediaUrl(item.thumbnail_url || item.image_url)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.25)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={16} color="#1A1A1A" style={{ marginLeft: '2px' }} fill="#1A1A1A" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      {/* Services */}
      <ClientHomeServices
        priceGroups={priceGroups}
        pickService={pickService}
        onBook={onBook}
      />

      {/* Address + Map */}
      {master.address && (
        <PremiumCard style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: showMap ? '16px' : 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: PREMIUM.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={18} color={PREMIUM.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: PREMIUM.accent,
                  marginBottom: '4px',
                }}
              >
                Адрес
              </p>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: PREMIUM.textPrimary,
                  lineHeight: 1.4,
                }}
              >
                {master.address}
              </p>
            </div>
          </div>

          {showMap && master.latitude && master.longitude && (
            <div
              style={{
                borderRadius: PREMIUM.radiusThumb,
                overflow: 'hidden',
                border: `1px solid ${PREMIUM.borderCard}`,
              }}
            >
              <AddressMap latitude={master.latitude} longitude={master.longitude} address={master.address} />
            </div>
          )}
        </PremiumCard>
      )}

      {/* Social Links */}
      {master.socialLinks && Object.values(master.socialLinks).some((v) => v) && (
        <PremiumCard style={{ padding: '20px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: PREMIUM.textMuted,
              marginBottom: '14px',
            }}
          >
            Подпишись на нас
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {master.socialLinks.telegram && (
              <a
                href={master.socialLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="Telegram"
              >
                <img src="/icons/telegram.png" alt="Telegram" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </a>
            )}
            {master.socialLinks.instagram && (
              <a
                href={master.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="Instagram"
              >
                <img src="/icons/instagram.png" alt="Instagram" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </a>
            )}
            {master.socialLinks.vk && (
              <a
                href={master.socialLinks.vk}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="ВКонтакте"
              >
                <img src="/icons/vk.png" alt="VK" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </a>
            )}
            {master.socialLinks.max && (
              <a
                href={master.socialLinks.max}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="MAX"
              >
                <img src="/icons/max.png" alt="MAX" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </a>
            )}
            {master.socialLinks.website && (
              <a
                href={master.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="Сайт"
              >
                <img src="/icons/website.png" alt="Website" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </a>
            )}
          </div>
        </PremiumCard>
      )}

      <FullscreenImageViewer
        open={heroPhotoFullscreen}
        src={heroPhotoSrc}
        alt={title}
        ariaLabel="Фото мастера"
        onClose={() => setHeroPhotoFullscreen(false)}
      />
    </div>
  );
}
