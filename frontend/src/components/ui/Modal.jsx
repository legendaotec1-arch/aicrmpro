import { useEffect } from 'react';
import Button from './Button';

const WIDTH_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl'
};

const MOBILE_FS_SHELL = {
  sm: 'relative w-full min-w-0 flex flex-col overflow-hidden bg-white shadow-xl animate-slide-up max-lg:h-full max-lg:max-h-[100dvh] max-lg:rounded-none lg:rounded-2xl lg:max-h-[min(90dvh,90vh)] lg:max-w-md',
  md: 'relative w-full min-w-0 flex flex-col overflow-hidden bg-white shadow-xl animate-slide-up max-lg:h-full max-lg:max-h-[100dvh] max-lg:rounded-none lg:rounded-2xl lg:max-h-[min(90dvh,90vh)] lg:max-w-lg',
  lg: 'relative w-full min-w-0 flex flex-col overflow-hidden bg-white shadow-xl animate-slide-up max-lg:h-full max-lg:max-h-[100dvh] max-lg:rounded-none lg:rounded-2xl lg:max-h-[min(90dvh,90vh)] lg:max-w-2xl',
  xl: 'relative w-full min-w-0 flex flex-col overflow-hidden bg-white shadow-xl animate-slide-up max-lg:h-full max-lg:max-h-[100dvh] max-lg:rounded-none lg:rounded-2xl lg:max-h-[min(90dvh,90vh)] lg:max-w-3xl',
  '2xl': 'relative w-full min-w-0 flex flex-col overflow-hidden bg-white shadow-xl animate-slide-up max-lg:h-full max-lg:max-h-[100dvh] max-lg:rounded-none lg:rounded-2xl lg:max-h-[min(90dvh,90vh)] lg:max-w-4xl'
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  bleed = false,
  mobileFullScreen = false
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = WIDTH_CLASSES[size] || WIDTH_CLASSES.md;

  const shellClass = mobileFullScreen
    ? MOBILE_FS_SHELL[size] || MOBILE_FS_SHELL.md
    : `relative w-full min-w-0 ${widthClass} animate-slide-up rounded-2xl bg-white shadow-xl max-h-[min(90dvh,90vh)] overflow-hidden flex flex-col`;

  const overlayClass = mobileFullScreen
    ? 'fixed inset-0 z-50 flex max-lg:flex-col max-lg:justify-stretch lg:items-center lg:justify-center lg:p-4'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4';

  const headerPad = mobileFullScreen ? 'max-lg:pt-[max(env(safe-area-inset-top),0px)]' : '';
  const footerPad = mobileFullScreen ? 'max-lg:pb-[max(env(safe-area-inset-bottom),0px)]' : '';

  return (
    <div className={overlayClass}>
      <div
        className="modal-backdrop-blur absolute inset-0 bg-black/50 backdrop-blur-sm max-lg:backdrop-blur-none"
        onClick={onClose}
        aria-hidden
      />
      <div className={shellClass} role="dialog" aria-modal="true">
        {(title || description) && (
          <div
            className={`shrink-0 border-b border-admin-border ${headerPad} ${bleed ? 'px-5 pt-5 pb-4 max-lg:px-4' : 'p-5 max-lg:px-4'}`}
          >
            {title && <h3 className="font-semibold text-lg text-admin-text">{title}</h3>}
            {description && <p className="mt-1 text-sm text-admin-textSecondary">{description}</p>}
          </div>
        )}
        <div className={`flex-1 min-w-0 w-full overflow-y-auto overscroll-contain ${bleed ? '' : 'p-5 max-lg:px-4'}`}>
          {children}
        </div>
        {footer !== undefined ? (
          footer !== null && (
            <div
              className={`shrink-0 w-full min-w-0 px-5 pb-5 flex flex-wrap gap-2 sm:gap-3 justify-end border-t border-admin-border pt-4 max-lg:px-4 ${footerPad}`}
            >
              {footer}
            </div>
          )
        ) : (
          <div className={`shrink-0 px-5 pb-5 border-t border-admin-border pt-4 max-lg:px-4 ${footerPad}`}>
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Закрыть
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
