export function formatRub(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Цвета пузырей комментариев в задачах админки */
export function getAdminCommentStyles(authorName) {
  const name = String(authorName || '').trim().toLowerCase();

  if (name === 'анастасия' || name.startsWith('анастас')) {
    return {
      bubble: 'bg-pink-50 ring-pink-200',
      text: 'text-pink-950',
      meta: 'text-pink-600',
    };
  }

  if (name === 'женя' || name === 'евгений' || name.startsWith('жен')) {
    return {
      bubble: 'bg-slate-900 ring-slate-700',
      text: 'text-white',
      meta: 'text-slate-300',
    };
  }

  return {
    bubble: 'bg-blue-50/80 ring-blue-100',
    text: 'text-slate-800',
    meta: 'text-blue-500/80',
  };
}
