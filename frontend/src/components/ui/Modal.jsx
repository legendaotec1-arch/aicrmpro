import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

const WIDTH_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl'
};

const OVERLAY_BODY_CLASS = 'dashboard-overlay-open';

function bumpOverlay(delta) {
  window.dispatchEvent(new CustomEvent('woner:overlay-change', { detail: { delta } }));
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  bleed = false,
  unified = false
}) {
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('woner:close-mobile-menu'));
    bumpOverlay(1);
    document.body.classList.add(OVERLAY_BODY_CLASS);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      bumpOverlay(-1);
      document.body.classList.remove(OVERLAY_BODY_CLASS);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = WIDTH_CLASSES[size] || WIDTH_CLASSES.md;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="modal-backdrop-blur absolute inset-0 bg-black/50 backdrop-blur-sm max-lg:backdrop-blur-none"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-full min-w-0 ${widthClass} animate-slide-up rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[min(90dvh,90vh)] max-lg:max-h-[calc(100dvh-var(--dash-safe-top,0px)-var(--dash-safe-bottom,0px)-1.5rem)]`}
        role="dialog"
        aria-modal="true"
      >
        {unified ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <>
            {(title || description) && (
              <div
                className={`shrink-0 border-b border-admin-border ${bleed ? 'px-5 pt-5 pb-4 max-lg:px-4' : 'p-5 max-lg:px-4 max-lg:py-4'}`}
              >
                {title && <h3 className="font-semibold text-lg text-admin-text">{title}</h3>}
                {description && <p className="mt-1 text-sm text-admin-textSecondary">{description}</p>}
              </div>
            )}
            <div className={`flex-1 min-w-0 w-full overflow-y-auto overscroll-contain ${bleed ? '' : 'p-5 max-lg:px-4 max-lg:py-4'}`}>
              {children}
            </div>
            {footer !== undefined ? (
              footer !== null && (
                <div className="shrink-0 w-full min-w-0 px-5 pb-5 flex flex-wrap gap-2 sm:gap-3 justify-end border-t border-admin-border pt-4 max-lg:px-4 max-lg:pb-4">
                  {footer}
                </div>
              )
            ) : (
              <div className="shrink-0 px-5 pb-5 border-t border-admin-border pt-4 max-lg:px-4 max-lg:pb-4">
                <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                  Закрыть
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
