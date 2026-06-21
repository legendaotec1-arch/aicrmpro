export function formatPersonName(name, lastName) {
  return [name, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
}

/** Имя мастера салона: «Фамилия Имя» */
export function formatSalonMasterName(master) {
  const first = String(master?.name || '').trim();
  const last = String(master?.last_name || '').trim();
  if (last && first) return `${last} ${first}`;
  return first || last || 'Мастер';
}

export function formatSalonMasterInitials(master) {
  const first = String(master?.name || '').trim();
  const last = String(master?.last_name || '').trim();
  const letters = [last?.[0], first?.[0]].filter(Boolean).join('');
  return letters || first?.[0] || '?';
}

/** Заголовок на странице записи: салон или «Имя Фамилия» */
export function formatMasterPublicTitle(master) {
  const salon = String(master?.salon_name || '').trim();
  if (salon) return salon;
  return formatPersonName(master?.name, master?.last_name) || 'Мастер';
}
