const db = require('../config/database');
const { formatClientDisplayName } = require('./clientDisplay');
const { buildClientPhoneFields } = require('./clientContact');

const MSK_OFFSET_MIN = 180;

function padCell(value, width) {
  const str = String(value ?? '');
  if (str.length >= width) return str;
  return str + ' '.repeat(width - str.length);
}

function formatRuDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const local = new Date(d.getTime() + MSK_OFFSET_MIN * 60 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatRuDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const local = new Date(d.getTime() + MSK_OFFSET_MIN * 60 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mi = String(local.getUTCMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function yesNo(value) {
  return value ? 'Да' : 'Нет';
}

async function fetchClientsExportRows({ masterId, salonMasterId, isTeamMember }) {
  const teamFilter = isTeamMember && salonMasterId
    ? `AND EXISTS (
         SELECT 1 FROM appointments ax
         WHERE ax.client_id = c.id AND ax.master_id = $1 AND ax.salon_master_id = $2
       )`
    : '';
  const params = isTeamMember && salonMasterId ? [masterId, salonMasterId] : [masterId];
  const apptTeamJoin = isTeamMember && salonMasterId
    ? ' AND a.salon_master_id = $2'
    : '';
  const favTeamJoin = isTeamMember && salonMasterId
    ? ' AND a2.salon_master_id = $2'
    : '';

  const result = await db.query(
    `SELECT c.id, c.name, c.phone AS client_phone, c.messenger, c.max_user_id, c.telegram_user_id,
            c.telegram_username, c.created_at,
            scp.first_name, scp.last_name, scp.patronymic, scp.phone AS profile_phone,
            scp.notes, scp.note_1,
            COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled', 'no_show'))::int AS visit_count,
            COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed_count,
            COUNT(a.id) FILTER (WHERE a.status IN ('cancelled', 'no_show'))::int AS cancelled_count,
            COUNT(a.id) FILTER (WHERE a.status = 'confirmed' AND a.appointment_time >= NOW())::int AS upcoming_count,
            MIN(a.appointment_time) FILTER (WHERE a.status NOT IN ('cancelled', 'no_show')) AS first_visit,
            MAX(a.appointment_time) FILTER (WHERE a.status NOT IN ('cancelled', 'no_show')) AS last_visit,
            COALESCE(SUM(a.service_price) FILTER (WHERE a.status IN ('confirmed', 'completed')), 0)::numeric AS total_spent,
            COALESCE(AVG(a.service_price) FILTER (WHERE a.status = 'completed'), 0)::numeric AS average_check,
            EXISTS (
              SELECT 1 FROM blacklist b
              WHERE b.master_id = $1 AND b.client_id = c.id
            ) AS is_blacklisted,
            (
              SELECT a2.service_name
              FROM appointments a2
              WHERE a2.client_id = c.id AND a2.master_id = $1
                AND a2.status NOT IN ('cancelled', 'no_show')
                ${favTeamJoin}
              GROUP BY a2.service_name
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) AS favorite_service
     FROM clients c
     LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $1
     LEFT JOIN appointments a ON a.client_id = c.id AND a.master_id = $1${apptTeamJoin}
     WHERE (scp.salon_id = $1 OR a.id IS NOT NULL)
       AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
       ${teamFilter}
     GROUP BY c.id, c.name, c.phone, c.messenger, c.max_user_id, c.telegram_user_id, c.telegram_username,
              c.created_at, scp.first_name, scp.last_name, scp.patronymic, scp.phone, scp.notes, scp.note_1
     ORDER BY last_visit DESC NULLS LAST, c.created_at DESC, c.name`,
    params
  );

  return result.rows.map((row) => {
    const phoneFields = buildClientPhoneFields(row);
    const displayName = formatClientDisplayName({
      first_name: row.first_name,
      last_name: row.last_name,
      patronymic: row.patronymic,
      name: row.name
    });
    const note = (row.note_1 || row.notes || '').trim();
    const avgCheck = Number(row.average_check) || 0;
    return {
      ...row,
      display_name: displayName,
      phone_display: phoneFields.phone_display || '—',
      note,
      total_spent: Number(row.total_spent) || 0,
      average_check: row.completed_count > 0 ? Math.round(avgCheck) : 0,
      telegram_label: row.telegram_user_id ? 'Telegram' : '—',
      max_label: row.max_user_id ? 'MAX' : '—'
    };
  });
}

function buildClientsCsv(rows, { salonTitle = 'Клиентская база' } = {}) {
  const headers = [
    '№',
    'Фамилия',
    'Имя',
    'Отчество',
    'Полное имя',
    'Телефон',
    'Telegram',
    'Telegram @',
    'MAX',
    'Заметка',
    'Визитов',
    'Завершено',
    'Отмены',
    'Предстоящие',
    'Сумма (₽)',
    'Средний чек (₽)',
    'Первый визит',
    'Последний визит',
    'Любимая услуга',
    'Добавлен',
    'Чёрный список'
  ];
  const widths = [4, 18, 14, 14, 26, 16, 10, 16, 6, 32, 8, 10, 8, 12, 12, 14, 18, 18, 24, 14, 14];

  const lines = [];
  lines.push(padCell(salonTitle, widths.reduce((a, b) => a + b, 0) + widths.length - 1));
  lines.push('');
  lines.push(headers.map((h, i) => padCell(h, widths[i])).join(';'));

  let totalSpent = 0;
  let totalVisits = 0;

  rows.forEach((row, idx) => {
    totalSpent += row.total_spent;
    totalVisits += row.visit_count;
    const cells = [
      idx + 1,
      row.last_name || '—',
      row.first_name || '—',
      row.patronymic || '—',
      row.display_name || row.name || '—',
      row.phone_display,
      row.telegram_label,
      row.telegram_username ? `@${row.telegram_username.replace(/^@/, '')}` : '—',
      row.max_label,
      row.note || '—',
      row.visit_count || 0,
      row.completed_count || 0,
      row.cancelled_count || 0,
      row.upcoming_count || 0,
      row.total_spent.toFixed(0),
      row.average_check > 0 ? row.average_check.toFixed(0) : '—',
      formatRuDateTime(row.first_visit),
      formatRuDateTime(row.last_visit),
      row.favorite_service || '—',
      formatRuDate(row.created_at),
      yesNo(row.is_blacklisted)
    ];
    lines.push(cells.map((c, i) => padCell(c, widths[i])).join(';'));
  });

  lines.push('');
  lines.push(
    padCell('ИТОГО', widths[0] + widths[1] + widths[2] + widths[3] + widths[4] + 5) +
      ';' +
      padCell(`${rows.length} клиентов`, widths[5] + widths[6] + 1) +
      ';' +
      padCell(`${totalVisits} визитов`, widths[10] + widths[11] + 1) +
      ';' +
      padCell(`${totalSpent.toFixed(0)} ₽`, widths[14])
  );

  return `\uFEFF${lines.join('\r\n')}`;
}

module.exports = {
  fetchClientsExportRows,
  buildClientsCsv
};
