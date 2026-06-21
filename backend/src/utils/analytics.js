function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function toDateKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const COUNTABLE_STATUSES = new Set(['confirmed', 'completed']);

function buildDailySeries(rows, days = 30) {
  const start = daysAgo(days - 1);
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map[toDateKey(d)] = { date: toDateKey(d), appointments: 0, revenue: 0 };
  }
  rows.forEach((r) => {
    const key = toDateKey(r.appointment_time);
    if (!map[key]) return;
    if (COUNTABLE_STATUSES.has(r.status)) {
      map[key].appointments += 1;
    }
    if (r.status === 'completed') {
      map[key].revenue += Number(r.service_price || 0);
    }
  });
  return Object.values(map);
}

module.exports = { daysAgo, buildDailySeries };
