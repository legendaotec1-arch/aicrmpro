function buildStats(rows) {
  const nonCancelled = rows.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show');
  const completed = rows.filter((a) => a.status === 'completed');
  const revenue = completed.reduce((s, a) => s + Number(a.service_price || 0), 0);

  const serviceCounts = {};
  nonCancelled.forEach((a) => {
    serviceCounts[a.service_name] = (serviceCounts[a.service_name] || 0) + 1;
  });
  const favoriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const times = nonCancelled.map((a) => new Date(a.appointment_time).getTime()).filter(Boolean);
  const firstVisit = times.length ? new Date(Math.min(...times)).toISOString() : null;
  const lastVisit = times.length ? new Date(Math.max(...times)).toISOString() : null;

  const upcoming = rows.filter(
    (a) => a.status === 'confirmed' && new Date(a.appointment_time) >= new Date()
  ).length;

  return {
    total_visits: nonCancelled.length,
    completed_visits: completed.length,
    cancelled_visits: rows.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length,
    upcoming_visits: upcoming,
    total_revenue: revenue,
    average_check: completed.length ? Math.round(revenue / completed.length) : 0,
    first_visit: firstVisit,
    last_visit: lastVisit,
    favorite_service: favoriteService
  };
}

module.exports = { buildStats };
