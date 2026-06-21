function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function toDateKey(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

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
    if (r.status !== 'cancelled') {
      map[key].appointments += 1;
      map[key].revenue += Number(r.service_price || 0);
    }
  });
  return Object.values(map);
}

module.exports = { daysAgo, buildDailySeries };
