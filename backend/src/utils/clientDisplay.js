function trim(s) {
  return s?.trim() || '';
}

function formatClientDisplayName({ first_name, last_name, patronymic, name } = {}) {
  const parts = [trim(last_name), trim(first_name), trim(patronymic)].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return trim(name) || 'Без имени';
}

module.exports = { formatClientDisplayName };
