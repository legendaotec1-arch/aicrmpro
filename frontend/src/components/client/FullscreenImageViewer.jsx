import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Полноэкранный просмотр изображения (portal, крестик и фон закрывают) */
export default function FullscreenImageViewer({ open, src, alt = '', onClose, ariaLabel = 'Просмотр фото' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-zoom-out bg-black/90"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur hover:bg-black/55 active:scale-95"
        aria-label="Закрыть"
      >
        <X className="h-6 w-6" />
      </button>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
        <img
          src={src}
          alt={alt}
          className="max-h-[92vh] w-auto max-w-[96vw] rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
