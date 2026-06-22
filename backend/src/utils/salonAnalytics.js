const ExcelJS = require('exceljs');
const db = require('../config/database');
const { listSalonMasters } = require('./salonMasters');
const {
  rowShares,
  mskDayBounds,
  mskMonthBounds,
  fetchOwnerRevenueRows
} = require('./revenueReport');
const { buildDailySeriesForRange } = require('./analytics');

const MSK_OFFSET_MIN = 180;
const COUNTABLE = new Set(['confirmed', 'completed', 'cancelled', 'no_show']);
const COMPLETED = 'completed';
const UNASSIGNED_ID = '__unassigned__';

function inRange(ts, start, end) {
  const t = new Date(ts).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function resolveMonthBounds(monthStr) {
  if (!monthStr || monthStr === 'current') {
    const b = mskMonthBounds();
    const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
    return { ...b, key, isCurrent: true };
  }
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    const b = mskMonthBounds();
    const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
    return { ...b, key, isCurrent: true };
  }
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - MSK_OFFSET_MIN * 60 * 1000);
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999) - MSK_OFFSET_MIN * 60 * 1000);
  const current = mskMonthBounds();
  const isCurrent = y === current.year && m === current.month;
  return { start, end, year: y, month: m, key: monthStr, isCurrent };
}

function initMasterBucket(master) {
  return {
    salon_master_id: master.id,
    name: master.name,
    photo_url: master.photo_url || null,
    commission_percent: Number(master.commission_percent || 0),
    appointments: 0,
    completed: 0,
    confirmed: 0,
    cancelled: 0,
    unique_clients: new Set(),
    gross_revenue: 0,
    master_share: 0,
    salon_share: 0,
    expected_revenue: 0,
    expected_master_share: 0,
    gross_today: 0,
    master_share_today: 0
  };
}

function initUnassignedBucket() {
  return {
    salon_master_id: null,
    name: 'Без мастера',
    photo_url: null,
    commission_percent: 0,
    appointments: 0,
    completed: 0,
    confirmed: 0,
    cancelled: 0,
    unique_clients: new Set(),
    gross_revenue: 0,
    master_share: 0,
    salon_share: 0,
    expected_revenue: 0,
    expected_master_share: 0,
    gross_today: 0,
    master_share_today: 0
  };
}

function serializeMasterBucket(bucket) {
  const clients = bucket.unique_clients.size;
  const shareOfClients =
    bucket._totalClients > 0 ? Math.round((clients / bucket._totalClients) * 100) : 0;
  return {
    salon_master_id: bucket.salon_master_id,
    name: bucket.name,
    photo_url: bucket.photo_url,
    commission_percent: bucket.commission_percent,
    appointments: bucket.appointments,
    completed: bucket.completed,
    confirmed: bucket.confirmed,
    cancelled: bucket.cancelled,
    unique_clients: clients,
    client_share_percent: shareOfClients,
    gross_revenue: bucket.gross_revenue,
    master_share: bucket.master_share,
    salon_share: bucket.salon_share,
    payout: bucket.master_share,
    expected_revenue: bucket.expected_revenue,
    expected_master_share: bucket.expected_master_share,
    gross_today: bucket.gross_today,
    master_share_today: bucket.master_share_today
  };
}

function getMasterBucket(map, row, mastersById) {
  const id = row.salon_master_id || UNASSIGNED_ID;
  if (!map.has(id)) {
    if (id !== UNASSIGNED_ID && mastersById.has(id)) {
      map.set(id, initMasterBucket(mastersById.get(id)));
    } else {
      map.set(id, initUnassignedBucket());
    }
  }
  return map.get(id);
}

function applyRowToBucket(bucket, row, { todayStart, todayEnd, isCurrentMonth }) {
  if (!COUNTABLE.has(row.status)) return;

  bucket.appointments += 1;
  if (row.status === COMPLETED) bucket.completed += 1;
  if (row.status === 'confirmed') bucket.confirmed += 1;
  if (row.status === 'cancelled' || row.status === 'no_show') bucket.cancelled += 1;
  if (row.client_id) bucket.unique_clients.add(row.client_id);

  if (row.status === COMPLETED) {
    const shares = rowShares(row);
    bucket.gross_revenue += shares.price;
    bucket.master_share += shares.masterShare;
    bucket.salon_share += shares.ownerShare;

    if (isCurrentMonth && inRange(row.appointment_time, todayStart, todayEnd)) {
      bucket.gross_today += shares.price;
      bucket.master_share_today += shares.masterShare;
    }
  }

  if (row.status === 'confirmed') {
    const shares = rowShares(row);
    bucket.expected_revenue += shares.price;
    bucket.expected_master_share += shares.masterShare;
  }
}

async function fetchAnalyticsRowsForRange(salonId, start, end) {
  const result = await db.query(
    `SELECT a.appointment_time, a.service_name, a.service_price, a.status, a.client_id,
            sm.name AS salon_master_name, sm.id AS salon_master_id, sm.photo_url,
            COALESCE(sm.commission_percent, 0) AS commission_percent
     FROM appointments a
     LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id
     WHERE a.master_id = $1
       AND a.appointment_time >= $2
       AND a.appointment_time <= $3`,
    [salonId, start, end]
  );
  return result.rows;
}

function enrichLeader(master, metricLabel, metricValue) {
  if (!master) return null;
  return { ...master, metric_label: metricLabel, metric_value: metricValue };
}

async function buildSalonAnalytics(salonId, { month = null } = {}) {
  const bounds = resolveMonthBounds(month);
  const { start: monthStart, end: monthEnd, year, month: monthNum, key, isCurrent } = bounds;
  const { start: todayStart, end: todayEnd } = mskDayBounds();

  const [rows, masters] = await Promise.all([
    fetchAnalyticsRowsForRange(salonId, monthStart, monthEnd),
    listSalonMasters(salonId, { activeOnly: true })
  ]);

  const mastersById = new Map(masters.map((m) => [m.id, m]));
  const masterMap = new Map();
  masters.forEach((m) => masterMap.set(m.id, initMasterBucket(m)));

  const active = rows.filter((r) => COUNTABLE.has(r.status));
  const completed = rows.filter((r) => r.status === COMPLETED);
  const confirmed = rows.filter((r) => r.status === 'confirmed');
  const cancelled = rows.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length;

  let grossRevenue = 0;
  let salonShare = 0;
  let mastersShare = 0;
  let expectedRevenue = 0;
  let expectedMastersShare = 0;

  completed.forEach((r) => {
    const s = rowShares(r);
    grossRevenue += s.price;
    salonShare += s.ownerShare;
    mastersShare += s.masterShare;
  });

  confirmed.forEach((r) => {
    const s = rowShares(r);
    expectedRevenue += s.price;
    expectedMastersShare += s.masterShare;
  });

  const clientIds = new Set(active.map((r) => r.client_id).filter(Boolean));

  const newClients = await db.query(
    `SELECT COUNT(DISTINCT c.id)::int AS cnt
     FROM clients c
     JOIN appointments a ON a.client_id = c.id AND a.master_id = $1
     WHERE c.created_at >= $2 AND c.created_at <= $3`,
    [salonId, monthStart, monthEnd]
  );

  active.forEach((r) => {
    const bucket = getMasterBucket(masterMap, r, mastersById);
    applyRowToBucket(bucket, r, { todayStart, todayEnd, isCurrentMonth: isCurrent });
  });

  const totalClients = clientIds.size || 1;
  const byMaster = Array.from(masterMap.values())
    .map((b) => {
      b._totalClients = totalClients;
      return serializeMasterBucket(b);
    })
    .filter((m) => m.appointments > 0 || m.gross_revenue > 0)
    .sort((a, b) => b.master_share - a.master_share || b.appointments - a.appointments);

  const allMasterPayouts = masters
    .map((m) => {
      const stats = byMaster.find((b) => b.salon_master_id === m.id);
      if (stats) return stats;
      return serializeMasterBucket({
        ...initMasterBucket(m),
        _totalClients: totalClients,
        unique_clients: new Set()
      });
    })
    .sort((a, b) => b.master_share - a.master_share || a.name.localeCompare(b.name, 'ru'));

  const serviceMap = {};
  active.forEach((r) => {
    serviceMap[r.service_name] = serviceMap[r.service_name] || { count: 0, revenue: 0 };
    serviceMap[r.service_name].count += 1;
  });
  completed.forEach((r) => {
    if (!serviceMap[r.service_name]) {
      serviceMap[r.service_name] = { count: 0, revenue: 0 };
    }
    serviceMap[r.service_name].revenue += Number(r.service_price || 0);
  });
  const topServices = Object.entries(serviceMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const payoutsToday = isCurrent
    ? (() => {
        const todayCompleted = completed.filter((r) =>
          inRange(r.appointment_time, todayStart, todayEnd)
        );
        let gross = 0;
        let masters = 0;
        todayCompleted.forEach((r) => {
          const s = rowShares(r);
          gross += s.price;
          masters += s.masterShare;
        });
        return {
          gross,
          masters_share: masters,
          salon_share: gross - masters,
          appointments: todayCompleted.length
        };
      })()
    : null;

  const payoutsMonth = {
    gross: grossRevenue,
    masters_share: mastersShare,
    salon_share: salonShare,
    appointments: completed.length,
    label: `${String(monthNum).padStart(2, '0')}.${year}`
  };

  const topByAppointments = [...byMaster].sort((a, b) => b.appointments - a.appointments)[0] || null;
  const topByClients = [...byMaster].sort((a, b) => b.unique_clients - a.unique_clients)[0] || null;
  const topByRevenue = [...byMaster].sort((a, b) => b.gross_revenue - a.gross_revenue)[0] || null;
  const topByPayout = byMaster[0] || null;

  return {
    month: key,
    month_label: payoutsMonth.label,
    is_current_month: isCurrent,
    summary: {
      appointments: active.length,
      completed: completed.length,
      confirmed_pending: confirmed.length,
      cancelled,
      revenue: grossRevenue,
      salon_share: salonShare,
      masters_share: mastersShare,
      expected_revenue: expectedRevenue,
      expected_masters_share: expectedMastersShare,
      unique_clients: clientIds.size,
      new_clients: newClients.rows[0]?.cnt || 0,
      cancellation_rate: rows.length ? Math.round((cancelled / rows.length) * 100) : 0
    },
    payouts: {
      today: payoutsToday,
      month: payoutsMonth
    },
    leaders: {
      by_appointments: enrichLeader(topByAppointments, 'записей', topByAppointments?.appointments),
      by_clients: enrichLeader(topByClients, 'клиентов', topByClients?.unique_clients),
      by_revenue: enrichLeader(topByRevenue, 'выручка', topByRevenue?.gross_revenue),
      by_payout: enrichLeader(topByPayout, 'к выплате', topByPayout?.master_share)
    },
    master_payouts: allMasterPayouts,
    by_master: byMaster,
    daily: buildDailySeriesForRange(rows, monthStart, monthEnd),
    top_services: topServices
  };
}

async function buildAnalyticsExportXlsx({ salonId, month = null, salonMasterId = null }) {
  const analytics = await buildSalonAnalytics(salonId, { month });
  const bounds = resolveMonthBounds(month || analytics.month);
  const rows = (await fetchOwnerRevenueRows({ salonId, month: bounds.key })).filter(
    (r) => !salonMasterId || r.salon_master_id === salonMasterId
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Woner.ru CRM';

  const summary = workbook.addWorksheet('Сводка');
  summary.addRow(['Аналитика салона — Woner.ru']);
  summary.addRow(['Месяц', analytics.month_label]);
  summary.addRow(['Выручка (завершённые)', analytics.summary.revenue]);
  summary.addRow(['Доля салона', analytics.summary.salon_share]);
  summary.addRow(['К выплате мастерам', analytics.summary.masters_share]);
  summary.addRow(['Ожидается (подтверждённые)', analytics.summary.expected_revenue]);
  summary.addRow([]);
  summary.addRow([
    'Мастер',
    'Записей',
    'Клиентов',
    '% мастера',
    'Выручка',
    'К выплате',
    'Салону',
    'Сегодня мастеру'
  ]);
  summary.getRow(summary.rowCount).font = { bold: true };

  const mastersList = salonMasterId
    ? analytics.master_payouts.filter((m) => m.salon_master_id === salonMasterId)
    : analytics.master_payouts;

  mastersList.forEach((m) => {
    summary.addRow([
      m.name,
      m.appointments,
      m.unique_clients,
      m.commission_percent,
      m.gross_revenue,
      m.master_share,
      m.salon_share,
      m.master_share_today
    ]);
  });

  const detail = workbook.addWorksheet('Записи');
  detail.addRow([
    'Дата',
    'Время',
    'Мастер',
    '%',
    'Клиент',
    'Услуга',
    'Сумма',
    'Мастеру',
    'Салону',
    'Статус'
  ]);
  detail.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    const s = rowShares(row);
    const d = new Date(row.appointment_time);
    detail.addRow([
      d.toLocaleDateString('ru-RU'),
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      row.salon_master_name || '—',
      s.pct,
      row.client_name || '—',
      row.service_name || '—',
      s.price,
      s.masterShare,
      s.ownerShare,
      row.status
    ]);
  });

  summary.getColumn(1).width = 22;
  for (let c = 2; c <= 8; c += 1) summary.getColumn(c).width = 16;
  detail.columns.forEach((col) => {
    col.width = 14;
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildSalonAnalytics,
  buildAnalyticsExportXlsx,
  resolveMonthBounds
};
