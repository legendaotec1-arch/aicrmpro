import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { mediaUrl } from '../../lib/media';

const ACCENT = '#6A5ACD';
const ACCENT_GLOW = 'rgba(106, 90, 205, 0.45)';
const MINI_WIDTH = 96;
const EXPANDED_WIDTH = 280;
const BOTTOM_NAV_CLEARANCE = '80px';
const EDGE_OFFSET_RIGHT = '20px';
const EDGE_OFFSET_BOTTOM_MINI = '96px';
const EDGE_OFFSET_BOTTOM_DESKTOP = '32px';

export default function MasterVideoReel({ src, title = 'Видеовизитка' }) {
  const videoRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const videoSrc = mediaUrl(src);

  const applyMiniMode = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    const p = v.play();
    if (p?.catch) p.catch(() => {});
  }, []);

  const applyExpandedMode = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    v.muted = false;
    v.loop = false;
    const p = v.play();
    if (p?.catch) p.catch(() => {});
  }, []);

  useEffect(() => {
    if (!expanded) applyMiniMode();
  }, [expanded, applyMiniMode, videoSrc]);

  useEffect(() => {
    if (!expanded) return undefined;
    applyExpandedMode();

    const onKey = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded, applyExpandedMode]);

  const handleExpand = () => setExpanded(true);

  const handleCollapse = () => {
    videoRef.current?.pause();
    setExpanded(false);
  };

  if (!src) return null;

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="Свернуть видеовизитку"
          onClick={handleCollapse}
          className="video-reel-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 54,
            border: 'none',
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(2px)',
            cursor: 'pointer',
            animation: 'videoReelFadeIn 0.3s ease-out',
          }}
        />
      )}

      <div
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? title : undefined}
        onClick={!expanded ? handleExpand : undefined}
        onKeyDown={
          !expanded
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleExpand();
                }
              }
            : undefined
        }
        tabIndex={!expanded ? 0 : undefined}
        className={`video-reel-widget${expanded ? ' video-reel-widget--expanded' : ''}`}
        style={{
          position: 'fixed',
          right: `max(${EDGE_OFFSET_RIGHT}, env(safe-area-inset-right))`,
          zIndex: expanded ? 55 : 45,
          width: expanded ? undefined : `${MINI_WIDTH}px`,
          transition: 'width 0.4s cubic-bezier(0.34, 1.2, 0.64, 1), filter 0.35s ease',
          transformOrigin: 'bottom right',
          filter: expanded
            ? `drop-shadow(0 0 28px ${ACCENT_GLOW}) drop-shadow(0 12px 40px rgba(0,0,0,0.35))`
            : `drop-shadow(0 0 14px ${ACCENT_GLOW}) drop-shadow(0 4px 20px rgba(0,0,0,0.25))`,
          cursor: expanded ? 'default' : 'pointer',
        }}
      >
        <div
          onClick={(e) => expanded && e.stopPropagation()}
          className="video-reel-frame"
          style={{
            position: 'relative',
            borderRadius: expanded ? '22px' : '16px',
            overflow: 'hidden',
            aspectRatio: '9 / 16',
            width: '100%',
            maxHeight: 'inherit',
            border: `${expanded ? 3 : 2}px solid ${ACCENT}`,
            boxShadow: expanded
              ? `0 0 0 4px rgba(106, 90, 205, 0.22), 0 0 36px ${ACCENT_GLOW}`
              : `0 0 0 3px rgba(106, 90, 205, 0.2), 0 0 24px ${ACCENT_GLOW}`,
            background: '#000',
            transition: 'border-radius 0.4s cubic-bezier(0.34, 1.2, 0.64, 1), border-width 0.35s ease, box-shadow 0.35s ease',
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            muted={!expanded}
            loop={!expanded}
            playsInline
            autoPlay
            controls={expanded}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {!expanded && (
            <span
              style={{
                position: 'absolute',
                right: '6px',
                bottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                pointerEvents: 'none',
              }}
            >
              <Volume2 size={12} strokeWidth={2.5} />
            </span>
          )}

          {expanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCollapse();
              }}
              aria-label="Свернуть"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.55)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .video-reel-widget {
          bottom: calc(${EDGE_OFFSET_BOTTOM_MINI} + env(safe-area-inset-bottom));
        }
        .video-reel-widget--expanded {
          bottom: calc(${BOTTOM_NAV_CLEARANCE} + env(safe-area-inset-bottom));
          width: min(
            ${EXPANDED_WIDTH}px,
            78vw,
            calc((100dvh - ${BOTTOM_NAV_CLEARANCE} - 28px - env(safe-area-inset-bottom) - env(safe-area-inset-top)) * 9 / 16)
          );
          max-height: calc(100dvh - ${BOTTOM_NAV_CLEARANCE} - 28px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
        }
        .video-reel-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 9 / 16;
          max-height: inherit;
        }
        @media (min-width: 1024px) {
          .video-reel-widget {
            bottom: calc(${EDGE_OFFSET_BOTTOM_DESKTOP} + env(safe-area-inset-bottom)) !important;
          }
          .video-reel-widget--expanded {
            width: min(
              ${EXPANDED_WIDTH}px,
              calc((100dvh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top)) * 9 / 16)
            );
            max-height: calc(100dvh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
          }
        }
        @keyframes videoReelFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
