function formatPersonName(name, lastName) {
  return [name, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
}

/** Заголовок на публичной странице: салон или «Имя Фамилия» */
function formatMasterPublicTitle(master) {
  const salon = String(master?.salon_name || '').trim();
  if (salon) return salon;
  const person = formatPersonName(master?.name, master?.last_name);
  return person || 'Мастер';
}

module.exports = {
  formatPersonName,
  formatMasterPublicTitle
};
