import { useState } from 'react';
import { mediaUrl } from '../../lib/media';
import FullscreenImageViewer from './FullscreenImageViewer';

const PREMIUM = {
  accent: '#D97A52',
  accentSoft: 'rgba(217, 122, 82, 0.1)',
  textPrimary: '#3D2E27',
};

export default function ClientSalonHeader({ master, title, compact = false }) {
  const photo = master?.logo_url;
  const photoSrc = photo ? mediaUrl(photo) : null;
  const [fullscreen, setFullscreen] = useState(false);

  if (compact) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {photoSrc ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: `2px solid ${PREMIUM.accent}`,
                boxShadow: `0 0 0 3px rgba(217, 122, 82, 0.2)`,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'none',
                padding: 0,
                transition: 'all 0.2s ease-out',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              aria-label="Открыть фото"
            >
              <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: PREMIUM.accentSoft,
                border: `2px solid ${PREMIUM.accent}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: PREMIUM.accent,
                flexShrink: 0,
              }}
            >
              {title?.[0] || '?'}
            </div>
          )}
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: PREMIUM.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </p>
        </div>
        <FullscreenImageViewer open={fullscreen} src={photoSrc} alt={title} ariaLabel="Фото" onClose={() => setFullscreen(false)} />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {photoSrc ? (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              border: `3px solid ${PREMIUM.accent}`,
              boxShadow: `0 0 0 4px rgba(217, 122, 82, 0.2), 0 4px 12px rgba(0,0,0,0.1)`,
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'none',
              padding: 0,
              transition: 'all 0.2s ease-out',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            aria-label="Открыть фото"
          >
            <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        ) : (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: PREMIUM.accentSoft,
              border: `3px solid ${PREMIUM.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '800',
              color: PREMIUM.accent,
              flexShrink: 0,
            }}
          >
            {title?.[0] || '?'}
          </div>
        )}
        <p
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: PREMIUM.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
      </div>
      <FullscreenImageViewer open={fullscreen} src={photoSrc} alt={title} ariaLabel="Фото" onClose={() => setFullscreen(false)} />
    </>
  );
}