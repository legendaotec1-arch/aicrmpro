import { useEffect, useState } from 'react';
import { FileText, Film, ImageIcon } from 'lucide-react';
import adminApi from '../../lib/adminApi';

export default function AdminFilePreview({ file, className = '' }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (file.preview_kind === 'file') return undefined;

    let cancelled = false;
    let objectUrl = null;

    adminApi
      .get(`/files/${file.id}/preview`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.preview_kind]);

  const boxClass = `flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 ${className}`;

  if (file.preview_kind === 'image') {
    if (src) {
      return (
        <img
          src={src}
          alt={file.original_name}
          className={`${boxClass} object-cover`}
          loading="lazy"
        />
      );
    }
    return (
      <div className={`${boxClass} text-slate-400`}>
        <ImageIcon size={32} />
      </div>
    );
  }

  if (file.preview_kind === 'video') {
    if (src) {
      return (
        <video
          src={src}
          controls
          preload="metadata"
          className={`${boxClass} object-cover bg-black`}
        />
      );
    }
    return (
      <div className={`${boxClass} text-slate-400`}>
        <Film size={32} />
      </div>
    );
  }

  return (
    <div className={`${boxClass} text-slate-400`}>
      <FileText size={32} />
    </div>
  );
}
