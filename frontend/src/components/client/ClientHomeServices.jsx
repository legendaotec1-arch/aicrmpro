import { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import FullscreenImageViewer from './FullscreenImageViewer';
import { formatServicePrice } from '../../lib/format';
import { mediaUrl } from '../../lib/media';

const PREMIUM = {
  bgCard: 'rgba(255, 255, 255, 0.92)',
  bgSoft: 'rgba(220, 220, 220, 0.5)',
  blurHeavy: 'blur(20px)',
  blurMedium: 'blur(12px)',
  accent: '#6A5ACD',
  accentLight: '#5A4CBD',
  accentSoft: 'rgba(106, 90, 205, 0.1)',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  borderCard: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  radiusCard: '20px',
  radiusButton: '14px',
  radiusThumb: '16px',
  transition: 'all 0.2s ease-out',
};

function PremiumCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: PREMIUM.bgCard,
        backdropFilter: PREMIUM.blurHeavy,
        WebkitBackdropFilter: PREMIUM.blurHeavy,
        border: `1px solid ${PREMIUM.borderCard}`,
        borderRadius: PREMIUM.radiusCard,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        transition: PREMIUM.transition,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ServiceRow({ item, onPick, onImageOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPick(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPick(item); }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${PREMIUM.borderCard}`,
        cursor: 'pointer',
        transition: PREMIUM.transition,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.paddingLeft = '4px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.paddingLeft = '0';
      }}
    >
      {item.image_url && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageOpen?.(mediaUrl(item.image_url), item.name || '');
          }}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            overflow: 'hidden',
            flexShrink: 0,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            background: 'none',
          }}
        >
          <img
            src={mediaUrl(item.image_url)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: '600', color: PREMIUM.textPrimary, marginBottom: '4px' }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} color={PREMIUM.textSecondary} />
          <span style={{ fontSize: '12px', color: PREMIUM.textSecondary }}>
            {item.duration_minutes} мин
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.accent }}>
          {formatServicePrice(item)}
        </p>
        <ChevronDown size={16} color={PREMIUM.textMuted} style={{ transform: 'rotate(-90deg)' }} />
      </div>
    </div>
  );
}

export default function ClientHomeServices({ priceGroups, pickService, onBook }) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [fullscreenSrc, setFullscreenSrc] = useState(null);
  const [fullscreenAlt, setFullscreenAlt] = useState('');

  const groups = (priceGroups || []).filter((g) => (g.services || []).length > 0);
  if (groups.length === 0) return null;

  const activeGroup = groups[activeGroupIndex];
  const totalServices = groups.reduce((n, g) => n + g.services.length, 0);

  return (
    <PremiumCard style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: PREMIUM.textPrimary }}>
            Услуги
          </h2>
          <span style={{ fontSize: '13px', color: PREMIUM.textSecondary }}>
            {totalServices}
          </span>
        </div>
      </div>

      {/* Horizontal category tabs */}
      {groups.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '4px',
          }}
        >
          <style>{'.category-tabs::-webkit-scrollbar { display: none; }'}</style>
          {groups.map((group, idx) => (
            <button
              key={group.master.id}
              type="button"
              onClick={() => setActiveGroupIndex(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: activeGroupIndex === idx ? PREMIUM.accent : PREMIUM.bgSoft,
                color: activeGroupIndex === idx ? '#FFFFFF' : PREMIUM.textPrimary,
                fontWeight: '600',
                fontSize: '13px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: PREMIUM.transition,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (activeGroupIndex !== idx) {
                  e.currentTarget.style.background = 'rgba(220, 220, 220, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeGroupIndex !== idx) {
                  e.currentTarget.style.background = PREMIUM.bgSoft;
                }
              }}
            >
              {group.master.photo_url ? (
                <img
                  src={mediaUrl(group.master.photo_url)}
                  alt=""
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: activeGroupIndex === idx ? 'rgba(255,255,255,0.2)' : PREMIUM.accentSoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: activeGroupIndex === idx ? '#FFFFFF' : PREMIUM.accent,
                  }}
                >
                  {group.master.name?.[0] || '?'}
                </div>
              )}
              {group.master.name}
            </button>
          ))}
        </div>
      )}

      {/* Services list */}
      <div
        style={{
          overflow: 'hidden',
          borderRadius: PREMIUM.radiusThumb,
          border: `1px solid ${PREMIUM.borderLight}`,
          background: 'rgba(255,255,255,0.4)',
        }}
      >
        {activeGroup.services.map((item, idx) => (
          <div key={item.id} style={{ padding: '0 14px' }}>
            {idx > 0 && <div style={{ height: '1px', background: PREMIUM.borderCard }} />}
            <ServiceRow
              item={item}
              onPick={pickService}
              onImageOpen={(src, alt) => {
                setFullscreenSrc(src);
                setFullscreenAlt(alt || '');
              }}
            />
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={onBook}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 24px',
            background: `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
            color: '#fff',
            fontWeight: '700',
            fontSize: '15px',
            borderRadius: PREMIUM.radiusButton,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(106, 90, 205, 0.3)',
            transition: PREMIUM.transition,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(106, 90, 205, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(106, 90, 205, 0.3)';
          }}
        >
          Перейти к записи
        </button>
      </div>

      <FullscreenImageViewer
        open={Boolean(fullscreenSrc)}
        src={fullscreenSrc}
        alt={fullscreenAlt}
        ariaLabel="Фото услуги"
        onClose={() => {
          setFullscreenSrc(null);
          setFullscreenAlt('');
        }}
      />
    </PremiumCard>
  );
}
