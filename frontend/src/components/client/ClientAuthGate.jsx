import { useState } from 'react';
import MaxLogo from '../brand/MaxLogo';

const PREMIUM = {
  bgGradient: 'linear-gradient(160deg, #FDF9F6 0%, #F6F0EA 100%)',
  bgCard: 'rgba(255, 255, 255, 0.72)',
  blurHeavy: 'blur(24px)',
  blurMedium: 'blur(12px)',
  accent: '#D97A52',
  accentSoft: 'rgba(217, 122, 82, 0.1)',
  textPrimary: '#3D2E27',
  textSecondary: '#8A7068',
  textWhite: '#FFFFFF',
  borderCard: 'rgba(255, 255, 255, 0.35)',
  borderLight: 'rgba(255, 255, 255, 0.5)',
  shadowCard: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255,255,255,0.5)',
  shadowButton: '0 8px 24px rgba(38,165,228,0.3)',
  radiusCard: '28px',
  radiusButton: '20px',
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
        boxShadow: PREMIUM.shadowCard,
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function ClientAuthGate({
  master,
  telegramBotDeepLink,
  maxBotDeepLink,
}) {
  const salonName = master?.display_title || master?.salon_name || [master?.name, master?.last_name].filter(Boolean).join(' ') || 'мастеру';
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
      <PremiumCard>
        {/* Avatar */}
        <div style={{ marginBottom: '24px' }}>
          {master?.logo_url ? (
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: `3px solid ${PREMIUM.accent}`,
                boxShadow: `0 0 0 5px rgba(217, 122, 82, 0.2), 0 6px 20px rgba(0, 0, 0, 0.12)`,
                margin: '0 auto 16px',
                overflow: 'hidden',
              }}
            >
              <img
                src={master.logo_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: avatarLoaded ? 'block' : 'none',
                }}
                onLoad={() => setAvatarLoaded(true)}
              />
              {!avatarLoaded && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: PREMIUM.accentSoft,
                    color: PREMIUM.accent,
                    fontSize: '32px',
                    fontWeight: '800',
                  }}
                >
                  {salonName?.[0] || '?'}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: PREMIUM.accentSoft,
                border: `3px solid ${PREMIUM.accent}`,
                boxShadow: `0 0 0 5px rgba(217, 122, 82, 0.2), 0 6px 20px rgba(0, 0, 0, 0.12)`,
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: '800',
                color: PREMIUM.accent,
              }}
            >
              {salonName?.[0] || '?'}
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: '800',
            color: PREMIUM.textPrimary,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          Запись к {salonName}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: PREMIUM.textSecondary,
            marginBottom: '32px',
          }}
        >
          Войдите, чтобы записаться
        </p>

        {/* Auth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {telegramBotDeepLink && (
            <a
              href={telegramBotDeepLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #26A5E4 0%, #0088CC 100%)',
                color: PREMIUM.textWhite,
                fontWeight: '700',
                fontSize: '16px',
                borderRadius: PREMIUM.radiusButton,
                textDecoration: 'none',
                boxShadow: PREMIUM.shadowButton,
                transition: PREMIUM.transition,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(38,165,228,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = PREMIUM.shadowButton;
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.128-3.615-1.657-5.233-3.96 9.128-1.97 1.69 1.69z" />
              </svg>
              Продолжить в Telegram
            </a>
          )}

          {maxBotDeepLink && (
            <a
              href={maxBotDeepLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 24px',
                background: PREMIUM.bgCard,
                color: PREMIUM.textPrimary,
                fontWeight: '700',
                fontSize: '16px',
                borderRadius: PREMIUM.radiusButton,
                border: `1px solid ${PREMIUM.borderLight}`,
                textDecoration: 'none',
                backdropFilter: PREMIUM.blurMedium,
                WebkitBackdropFilter: PREMIUM.blurMedium,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: PREMIUM.transition,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = PREMIUM.bgCard;
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              <MaxLogo style={{ width: 22, height: 22, flexShrink: 0 }} />
              Продолжить в MAX
            </a>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}