/** Публикация: ровно 2 статьи в день. */

const ARTICLES_PER_DAY = 2;

function startOfDayUtc(date) {
  const d = new Date(date);
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

function buildSchedule(slugs, startDate = new Date()) {
  const schedule = new Map();
  let dayIndex = 0;
  let slotInDay = 0;
  let cursor = startOfDayUtc(startDate);

  for (const slug of slugs) {
    if (slotInDay >= ARTICLES_PER_DAY) {
      dayIndex += 1;
      slotInDay = 0;
      cursor = startOfDayUtc(startDate);
      cursor.setUTCDate(cursor.getUTCDate() + dayIndex);
    }

    const publishedAt = new Date(cursor);
    publishedAt.setUTCHours(8 + slotInDay * 5, (slotInDay * 17) % 60, 0, 0);
    schedule.set(slug, publishedAt.toISOString());
    slotInDay += 1;
  }

  return schedule;
}

/** Расписание для новых slug с даты после последней запланированной статьи */
function buildScheduleAfter(slugs, afterDate) {
  const start = new Date(afterDate);
  start.setUTCDate(start.getUTCDate() + 1);
  return buildSchedule(slugs, start);
}

async function getLastScheduledDate(client) {
  const res = await client.query(
    `SELECT MAX(published_at) AS last FROM seo_articles WHERE published = TRUE`
  );
  const last = res.rows[0]?.last;
  if (!last) return null;
  return new Date(last);
}

async function needsReschedule(client) {
  const res = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT DATE(published_at AT TIME ZONE 'UTC'))::int AS distinct_days
    FROM seo_articles
    WHERE published = TRUE
  `);
  const { total, distinct_days: days } = res.rows[0];
  if (total < 20) return true;
  const expectedDays = Math.ceil(total / ARTICLES_PER_DAY);
  return days < Math.min(expectedDays * 0.4, 10);
}

async function applySchedule(client, schedule) {
  for (const [slug, publishedAt] of schedule) {
    await client.query(
      `UPDATE seo_articles SET published_at = $1::timestamptz WHERE slug = $2`,
      [publishedAt, slug]
    );
  }
  return schedule.size;
}

async function scheduleNewSlugs(client, newSlugs) {
  if (!newSlugs.length) return 0;
  const last = await getLastScheduledDate(client);
  const startFrom = last || new Date();
  const schedule = last
    ? buildScheduleAfter(newSlugs, startFrom)
    : buildSchedule(newSlugs, startFrom);
  return applySchedule(client, schedule);
}

async function ensurePublicationSchedule(client, { force = false } = {}) {
  const res = await client.query(
    `SELECT slug FROM seo_articles WHERE published = TRUE ORDER BY category, slug`
  );
  const slugs = res.rows.map((r) => r.slug);
  if (!slugs.length) return { rescheduled: 0 };

  const should = force || (await needsReschedule(client));
  if (!should) return { rescheduled: 0, skipped: true };

  const schedule = buildSchedule(slugs, new Date());
  const count = await applySchedule(client, schedule);
  return { rescheduled: count, articlesPerDay: ARTICLES_PER_DAY };
}

function getScheduledPublishedAt(slug, allSlugs, startDate = new Date()) {
  const schedule = buildSchedule(allSlugs, startDate);
  return schedule.get(slug) || new Date().toISOString();
}

module.exports = {
  ARTICLES_PER_DAY,
  buildSchedule,
  buildScheduleAfter,
  ensurePublicationSchedule,
  getScheduledPublishedAt,
  scheduleNewSlugs,
  getLastScheduledDate,
};
