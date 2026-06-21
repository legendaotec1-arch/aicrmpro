const ExcelJS = require('exceljs');
const db = require('../config/database');
const { listSalonMasters } = require('./salonMasters');

const MSK_OFFSET_MIN = 180;

function mskNow() {
  return new Date(Date.now() + MSK_OFFSET_MIN * 60 * 1000);
}

function mskDayBounds(date = mskNow()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - MSK_OFFSET_MIN * 60 * 1000);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - MSK_OFFSET_MIN * 60 * 1000);
  return { start, end };
}

function mskMonthBounds(date = mskNow()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0) - MSK_OFFSET_MIN * 60 * 1000);
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - MSK_OFFSET_MIN * 60 * 1000);
  return { start, end, year: y, month: m + 1 };
}

function activeStatuses() {
  return `('confirmed', 'completed')`;
}

function monthDateFilter(month, params) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return '';
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - MSK_OFFSET_MIN * 60 * 1000);
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999) - MSK_OFFSET_MIN * 60 * 1000);
  params.push(start, end);
  return ` AND a.appointment_time >= $${params.length - 1} AND a.appointment_time <= $${params.length}`;
}

function buildScope({ salonId, salonMasterId, commissionPercent = 0, profitMode = false }) {
  const params = [salonId];
  let teamSql = '';
  if (salonMasterId) {
    params.push(salonMasterId);
    teamSql = ` AND a.salon_master_id = $${params.length}`;
  }
  const revenueExpr = profitMode && commissionPercent > 0
    ? `(COALESCE(a.service_price, 0) * ${Number(commissionPercent)} / 100.0)`
    : 'COALESCE(a.service_price, 0)';
  return { params, teamSql, revenueExpr };
}

function rowShares(row) {
  const price = Number(row.service_price || 0);
  const pct = Number(row.commission_percent ?? 0);
  const masterShare = Math.round((price * pct) / 100);
  const ownerShare = price - masterShare;
  return { price, pct, masterShare, ownerShare };
}

async function getOverviewStats({ salonId, salonMasterId = null, commissionPercent = 0 }) {
  const { params, teamSql, revenueExpr } = buildScope({
    salonId,
    salonMasterId,
    commissionPercent,
    profitMode: Boolean(salonMasterId)
  });
  const { start: dayStart, end: dayEnd } = mskDayBounds();
  const { start: monthStart, end: monthEnd } = mskMonthBounds();

  const clientsSql = salonMasterId
    ? `SELECT COUNT(DISTINCT a.client_id)::int AS cnt
       FROM appointments a
       WHERE a.master_id = $1 AND a.status != 'cancelled'${teamSql}`
    : `SELECT COUNT(DISTINCT c.id)::int AS cnt
       FROM clients c
       LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $1
       LEFT JOIN appointments a ON a.client_id = c.id AND a.master_id = $1
       WHERE (scp.salon_id = $1 OR a.id IS NOT NULL)
         AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp`;

  const inactiveSql = `
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT a.client_id, MAX(a.appointment_time) AS last_visit
      FROM appointments a
      WHERE a.master_id = $1 AND a.status != 'cancelled'${teamSql}
      GROUP BY a.client_id
      HAVING MAX(a.appointment_time) < NOW() - INTERVAL '30 days'
    ) t`;

  const revenueTodaySql = `
    SELECT COALESCE(SUM(${revenueExpr}), 0)::numeric AS total
    FROM appointments a
    WHERE a.master_id = $1
      AND a.status IN ${activeStatuses()}
      AND a.appointment_time >= $${params.length + 1}
      AND a.appointment_time <= $${params.length + 2}${teamSql}`;

  const revenueMonthSql = `
    SELECT COALESCE(SUM(${revenueExpr}), 0)::numeric AS total
    FROM appointments a
    WHERE a.master_id = $1
      AND a.status IN ${activeStatuses()}
      AND a.appointment_time >= $${params.length + 1}
      AND a.appointment_time <= $${params.length + 2}${teamSql}`;

  const [clientsRes, inactiveRes, todayRes, monthRes] = await Promise.all([
    db.query(clientsSql, params),
    db.query(inactiveSql, params),
    db.query(revenueTodaySql, [...params, dayStart, dayEnd]),
    db.query(revenueMonthSql, [...params, monthStart, monthEnd])
  ]);

  const monthInfo = mskMonthBounds();
  return {
    clients_total: clientsRes.rows[0]?.cnt || 0,
    clients_inactive_30d: inactiveRes.rows[0]?.cnt || 0,
    revenue_today: Number(todayRes.rows[0]?.total || 0),
    revenue_month: Number(monthRes.rows[0]?.total || 0),
    month_label: `${String(monthInfo.month).padStart(2, '0')}.${monthInfo.year}`,
    is_profit: Boolean(salonMasterId),
    commission_percent: salonMasterId ? Number(commissionPercent) : null
  };
}

async function fetchOwnerRevenueRows({ salonId, month = null }) {
  const params = [salonId];
  const dateSql = monthDateFilter(month, params);

  const result = await db.query(
    `SELECT a.id, a.appointment_time, a.service_name, a.service_price, a.status, a.duration_minutes,
            a.salon_master_id,
            c.name AS client_name, c.phone AS client_phone,
            sm.name AS salon_master_name,
            COALESCE(sm.commission_percent, 0) AS commission_percent
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     LEFT JOIN salon_masters sm ON sm.id = a.salon_master_id
     WHERE a.master_id = $1
       AND a.status IN ${activeStatuses()}${dateSql}
     ORDER BY a.appointment_time ASC`,
    params
  );
  return result.rows;
}

async function fetchTeamRevenueRows({ salonId, salonMasterId, commissionPercent = 0, month = null }) {
  const { params, teamSql } = buildScope({
    salonId,
    salonMasterId,
    commissionPercent,
    profitMode: true
  });
  const dateSql = monthDateFilter(month, params);

  const result = await db.query(
    `SELECT a.appointment_time, a.service_name, a.service_price, a.status, a.duration_minutes,
            c.name AS client_name, c.phone AS client_phone,
            COALESCE(a.service_price, 0) AS service_total,
            (COALESCE(a.service_price, 0) * ${Number(commissionPercent)} / 100.0) AS master_profit
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE a.master_id = $1
       AND a.status IN ${activeStatuses()}${teamSql}${dateSql}
     ORDER BY a.appointment_time ASC`,
    params
  );
  return result.rows;
}

/** @deprecated use fetchOwnerRevenueRows / fetchTeamRevenueRows */
async function fetchRevenueRows(opts) {
  if (opts.salonMasterId) return fetchTeamRevenueRows(opts);
  return fetchOwnerRevenueRows(opts);
}

function padCell(value, width) {
  const str = String(value ?? '');
  if (str.length >= width) return str;
  return str + ' '.repeat(width - str.length);
}

function formatRuDate(iso) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + MSK_OFFSET_MIN * 60 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatRuTime(iso) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + MSK_OFFSET_MIN * 60 * 1000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mi = String(local.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

const STATUS_RU = {
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
  no_show: 'Не пришёл'
};

function buildTeamRevenueCsv(rows) {
  const headers = [
    '№',
    'Дата',
    'Время',
    'Клиент',
    'Телефон',
    'Услуга',
    'Сумма услуги (₽)',
    'Ваша прибыль (₽)',
    'Длительность (мин)',
    'Статус'
  ];
  const widths = [4, 12, 8, 22, 16, 28, 18, 18, 18, 14];

  const lines = [];
  lines.push(headers.map((h, i) => padCell(h, widths[i])).join(';'));

  let totalService = 0;
  let totalProfit = 0;
  rows.forEach((row, idx) => {
    const serviceTotal = Number(row.service_total ?? row.service_price ?? 0);
    const profit = Number(row.master_profit ?? 0);
    totalService += serviceTotal;
    totalProfit += profit;
    const cells = [
      idx + 1,
      formatRuDate(row.appointment_time),
      formatRuTime(row.appointment_time),
      row.client_name || '—',
      row.client_phone || '—',
      row.service_name || '—',
      serviceTotal.toFixed(0),
      profit.toFixed(0),
      row.duration_minutes || '—',
      STATUS_RU[row.status] || row.status
    ];
    lines.push(cells.map((c, i) => padCell(c, widths[i])).join(';'));
  });

  lines.push('');
  lines.push(
    padCell('ИТОГО', widths[0] + widths[1] + widths[2] + 3) +
      ';' +
      padCell(`${totalService.toFixed(0)} ₽`, widths[6]) +
      ';' +
      padCell(`${totalProfit.toFixed(0)} ₽`, widths[7])
  );

  return '\uFEFF' + lines.join('\r\n');
}

function safeSheetName(name, used) {
  let s = String(name || 'Мастер')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31);
  if (!s) s = 'Мастер';
  let base = s;
  let i = 1;
  while (used.has(s)) {
    const suffix = ` ${i}`;
    s = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(s);
  return s;
}

function ownerDetailHeaders(showMaster) {
  const base = ['№', 'Дата', 'Время', 'Клиент', 'Телефон', 'Услуга', 'Сумма (₽)'];
  if (showMaster) base.push('Мастер', '% мастера');
  base.push('Доля мастера (₽)', 'Доля салона (₽)', 'Длительность (мин)', 'Статус');
  return base;
}

function ownerDetailRow(row, idx, { showMaster = true } = {}) {
  const { price, pct, masterShare, ownerShare } = rowShares(row);
  const cells = [
    idx + 1,
    formatRuDate(row.appointment_time),
    formatRuTime(row.appointment_time),
    row.client_name || '—',
    row.client_phone || '—',
    row.service_name || '—',
    price
  ];
  if (showMaster) {
    cells.push(row.salon_master_name || '—', pct);
  }
  cells.push(masterShare, ownerShare, row.duration_minutes || '—', STATUS_RU[row.status] || row.status);
  return cells;
}

function styleHeaderRow(sheet, colCount) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  for (let c = 1; c <= colCount; c += 1) {
    sheet.getColumn(c).width = c === 6 ? 28 : 16;
  }
}

function addOwnerDetailSheet(sheet, rows, { showMaster = true } = {}) {
  const headers = ownerDetailHeaders(showMaster);
  sheet.addRow(headers);
  styleHeaderRow(sheet, headers.length);

  let totalPrice = 0;
  let totalMaster = 0;
  let totalOwner = 0;

  rows.forEach((row, idx) => {
    const { price, masterShare, ownerShare } = rowShares(row);
    totalPrice += price;
    totalMaster += masterShare;
    totalOwner += ownerShare;
    sheet.addRow(ownerDetailRow(row, idx, { showMaster }));
  });

  if (rows.length) {
    const totalRow = sheet.addRow([]);
    totalRow.font = { bold: true };
    const labelCol = showMaster ? 7 : 7;
    totalRow.getCell(1).value = 'ИТОГО';
    totalRow.getCell(labelCol).value = totalPrice;
    totalRow.getCell(labelCol + (showMaster ? 2 : 0)).value = totalMaster;
    totalRow.getCell(labelCol + (showMaster ? 3 : 1)).value = totalOwner;
  }

  return { totalPrice, totalMaster, totalOwner, count: rows.length };
}

async function buildOwnerRevenueXlsx({ salonId, month = null }) {
  const [rows, masters] = await Promise.all([
    fetchOwnerRevenueRows({ salonId, month }),
    listSalonMasters(salonId)
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Woner.ru CRM';
  const usedNames = new Set();

  const summary = workbook.addWorksheet(safeSheetName('Сводка', usedNames));
  summary.addRow(['Отчёт по выручке салона']);
  summary.addRow(['Период', month ? month.replace('-', '.') : 'За всё время']);
  summary.addRow([]);

  const byMaster = new Map();
  masters.forEach((m) => byMaster.set(m.id, { master: m, rows: [] }));
  const unassigned = [];

  rows.forEach((row) => {
    if (row.salon_master_id && byMaster.has(row.salon_master_id)) {
      byMaster.get(row.salon_master_id).rows.push(row);
    } else {
      unassigned.push(row);
    }
  });

  summary.addRow(['Мастер', 'Записей', 'Выручка (₽)', '% мастера', 'Доля мастера (₽)', 'Доля салона (₽)']);
  const summaryHeader = summary.getRow(summary.rowCount);
  summaryHeader.font = { bold: true };

  let grandPrice = 0;
  let grandMaster = 0;
  let grandOwner = 0;

  for (const { master, rows: masterRows } of byMaster.values()) {
    const totals = masterRows.reduce(
      (acc, row) => {
        const s = rowShares(row);
        acc.price += s.price;
        acc.master += s.masterShare;
        acc.owner += s.ownerShare;
        return acc;
      },
      { price: 0, master: 0, owner: 0 }
    );
    grandPrice += totals.price;
    grandMaster += totals.master;
    grandOwner += totals.owner;
    summary.addRow([
      master.name,
      masterRows.length,
      totals.price,
      Number(master.commission_percent || 0),
      totals.master,
      totals.owner
    ]);
  }

  if (unassigned.length) {
    const totals = unassigned.reduce(
      (acc, row) => {
        const s = rowShares({ ...row, commission_percent: 0 });
        acc.price += s.price;
        acc.owner += s.ownerShare;
        return acc;
      },
      { price: 0, owner: 0 }
    );
    grandPrice += totals.price;
    grandOwner += totals.owner;
    summary.addRow(['Без мастера', unassigned.length, totals.price, 0, 0, totals.owner]);
  }

  summary.addRow([]);
  const totalRow = summary.addRow(['ИТОГО', rows.length, grandPrice, '', grandMaster, grandOwner]);
  totalRow.font = { bold: true };
  summary.getColumn(1).width = 24;
  for (let c = 2; c <= 6; c += 1) summary.getColumn(c).width = 18;

  const allSheet = workbook.addWorksheet(safeSheetName('Все записи', usedNames));
  addOwnerDetailSheet(allSheet, rows, { showMaster: true });

  for (const { master, rows: masterRows } of byMaster.values()) {
    const sheet = workbook.addWorksheet(safeSheetName(master.name, usedNames));
    sheet.getCell('A1').value = `Мастер: ${master.name}`;
    sheet.getCell('A2').value = `Доля мастера: ${Number(master.commission_percent || 0)}%`;
    sheet.addRow([]);
    const headerRowIdx = sheet.rowCount + 1;
    const headers = ownerDetailHeaders(false);
    sheet.addRow(headers);
    styleHeaderRow(sheet, headers.length);
    sheet.getRow(headerRowIdx).font = { bold: true };

    let totalPrice = 0;
    let totalMaster = 0;
    let totalOwner = 0;
    masterRows.forEach((row, idx) => {
      const { price, masterShare, ownerShare } = rowShares(row);
      totalPrice += price;
      totalMaster += masterShare;
      totalOwner += ownerShare;
      sheet.addRow(ownerDetailRow(row, idx, { showMaster: false }));
    });
    if (masterRows.length) {
      const tr = sheet.addRow(['ИТОГО', '', '', '', '', '', totalPrice, totalMaster, totalOwner]);
      tr.font = { bold: true };
    }
  }

  if (unassigned.length) {
    const sheet = workbook.addWorksheet(safeSheetName('Без мастера', usedNames));
    addOwnerDetailSheet(sheet, unassigned, { showMaster: false });
  }

  return workbook.xlsx.writeBuffer();
}

/** @deprecated use buildTeamRevenueCsv */
function buildRevenueCsv(rows, { profitMode = false } = {}) {
  if (profitMode) return buildTeamRevenueCsv(rows);
  throw new Error('Owner export must use buildOwnerRevenueXlsx');
}

module.exports = {
  getOverviewStats,
  fetchRevenueRows,
  fetchOwnerRevenueRows,
  fetchTeamRevenueRows,
  buildRevenueCsv,
  buildTeamRevenueCsv,
  buildOwnerRevenueXlsx,
  mskMonthBounds
};
