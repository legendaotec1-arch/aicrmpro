import { useEffect } from 'react';
import Button from './Button';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  bleed = false
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

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', '2xl': 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={`relative w-full min-w-0 ${widths[size]} animate-slide-up rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className={`shrink-0 border-b border-admin-border ${bleed ? 'px-5 pt-5 pb-4' : 'p-5'}`}>
            {title && <h3 className="font-semibold text-lg text-admin-text">{title}</h3>}
            {description && <p className="mt-1 text-sm text-admin-textSecondary">{description}</p>}
          </div>
        )}
        <div className={`flex-1 min-w-0 w-full overflow-y-auto ${bleed ? '' : 'p-5'}`}>{children}</div>
        {footer !== undefined ? (
          footer !== null && (
            <div className="shrink-0 w-full min-w-0 px-5 pb-5 flex flex-wrap gap-2 sm:gap-3 justify-end border-t border-admin-border pt-4">{footer}</div>
          )
        ) : (
          <div className="shrink-0 px-5 pb-5 border-t border-admin-border pt-4">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Закрыть
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
