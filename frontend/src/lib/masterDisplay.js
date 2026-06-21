export function formatPersonName(name, lastName) {
  return [name, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
}

/** Заголовок на странице записи: салон или «Имя Фамилия» */
export function formatMasterPublicTitle(master) {
  const salon = String(master?.salon_name || '').trim();
  if (salon) return salon;
  return formatPersonName(master?.name, master?.last_name) || 'Мастер';
}
