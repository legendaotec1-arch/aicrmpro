import { mediaUrl } from '../../lib/media';

export function ReviewPhotoThumbnails({ urls, onPreview, size = 'md' }) {
  const list = (urls || []).filter(Boolean).slice(0, 3);
  if (!list.length) return null;

  const sizeClass = size === 'sm' ? 'h-14 w-14' : 'h-16 w-16';

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {list.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          onClick={() => onPreview?.(url, index)}
          className={`${sizeClass} overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          aria-label="Открыть фото отзыва"
        >
          <img src={mediaUrl(url)} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

export function ReviewPhotoFullscreen({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black" onClick={onClose}>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur"
      >
        ×
      </button>
      <img
        src={mediaUrl(url)}
        alt=""
        className="max-h-[100dvh] w-full object-contain px-2"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
