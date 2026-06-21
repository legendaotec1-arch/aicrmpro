import { Check, Clock, ChevronRight } from 'lucide-react';
import { formatServicePrice } from '../../lib/format';
import { mediaUrl } from '../../lib/media';

const PREMIUM = {
  bgCard: 'rgba(255, 255, 255, 0.92)',
  bgSoft: 'rgba(220, 220, 220, 0.5)',
  blurMedium: 'blur(12px)',
  accent: '#6A5ACD',
  accentLight: '#5A4CBD',
  accentSoft: 'rgba(106, 90, 205, 0.1)',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textWhite: '#FFFFFF',
  borderCard: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  shadowCard: '0 4px 20px rgba(0, 0, 0, 0.04)',
  transition: 'all 0.2s ease-out',
};

export default function ServiceCard({
  item,
  selected,
  onSelect,
  onImageOpen,
  showSelectLabel = true,
  variant = 'card',
}) {
  if (variant === 'compact') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item);
          }
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          background: selected
            ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`
            : 'rgba(255,255,255,0.92)',
          border: selected ? '1.5px solid #6A5ACD' : '1.5px solid rgba(0,0,0,0.08)',
          borderRadius: '16px',
          cursor: 'pointer',
          transition: PREMIUM.transition,
          backdropFilter: PREMIUM.blurMedium,
          WebkitBackdropFilter: PREMIUM.blurMedium,
          boxShadow: selected ? '0 6px 20px rgba(106, 90, 205, 0.3)' : 'none',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {/* Checkbox circle */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: selected ? '2px solid #fff' : '2px solid rgba(0,0,0,0.15)',
            background: selected ? '#fff' : 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            alignSelf: 'center',
            transition: PREMIUM.transition,
          }}
        >
          {selected && <Check size={14} color={PREMIUM.accent} strokeWidth={3} />}
        </div>

        {item.image_url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageOpen?.(item);
            }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0,
              border: 'none',
              padding: 0,
              cursor: 'zoom-in',
              background: 'none',
            }}
            aria-label={`Фото услуги: ${item.name}`}
          >
            <img
              src={mediaUrl(item.image_url)}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: selected ? PREMIUM.textWhite : PREMIUM.textPrimary,
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {item.name}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginTop: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
              <Clock size={12} color={selected ? 'rgba(255,255,255,0.8)' : PREMIUM.textSecondary} />
              <span
                style={{
                  fontSize: '12px',
                  color: selected ? 'rgba(255,255,255,0.8)' : PREMIUM.textSecondary,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.duration_minutes || 60} мин
              </span>
            </div>
            <p
              style={{
                fontSize: '15px',
                fontWeight: '800',
                color: selected ? '#fff' : PREMIUM.accent,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                margin: 0,
              }}
            >
              {formatServicePrice(item)}
            </p>
          </div>
        </div>

        <ChevronRight
          size={16}
          color={selected ? 'rgba(255,255,255,0.7)' : PREMIUM.textSecondary}
          style={{ flexShrink: 0, alignSelf: 'center' }}
        />
      </div>
    );
  }

  // Card variant
  return (
    <div
      style={{
        background: selected
          ? `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`
          : 'rgba(255,255,255,0.92)',
        border: selected ? '1.5px solid #6A5ACD' : '1.5px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: PREMIUM.transition,
        backdropFilter: PREMIUM.blurMedium,
        WebkitBackdropFilter: PREMIUM.blurMedium,
        boxShadow: selected ? '0 6px 20px rgba(106, 90, 205, 0.3)' : 'none',
      }}
    >
      {item.image_url && (
        <button
          type="button"
          onClick={() => onImageOpen?.(item)}
          style={{
            display: 'block',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <img
            src={mediaUrl(item.image_url)}
            alt={item.name}
            style={{
              width: '100%',
              height: '140px',
              objectFit: 'cover',
            }}
          />
        </button>
      )}
      <button
        type="button"
        onClick={() => onSelect(item)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: selected ? PREMIUM.textWhite : PREMIUM.textPrimary,
                lineHeight: 1.3,
              }}
            >
              {item.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <Clock size={12} color={selected ? 'rgba(255,255,255,0.8)' : PREMIUM.textSecondary} />
              <span
                style={{
                  fontSize: '12px',
                  color: selected ? 'rgba(255,255,255,0.8)' : PREMIUM.textSecondary,
                }}
              >
                {item.duration_minutes || 60} мин
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: '16px',
              fontWeight: '800',
              color: selected ? '#fff' : PREMIUM.accent,
              whiteSpace: 'nowrap',
            }}
          >
            {formatServicePrice(item)}
          </p>
        </div>
        {showSelectLabel && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginTop: '12px',
              padding: '6px 12px',
              borderRadius: '99px',
              fontSize: '12px',
              fontWeight: '700',
              background: selected ? 'rgba(255,255,255,0.25)' : PREMIUM.accentSoft,
              color: selected ? '#fff' : PREMIUM.accent,
              transition: PREMIUM.transition,
            }}
          >
            {selected ? 'Выбрано' : 'Выбрать'}
          </span>
        )}
      </button>
    </div>
  );
}
