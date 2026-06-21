/** Повтор запроса без новых колонок, если миграция ещё не применена (PostgreSQL 42703). */
async function queryWithColumnFallback(db, sqlWithNewCols, sqlFallback, params) {
  try {
    return await db.query(sqlWithNewCols, params);
  } catch (err) {
    if (err.code === '42703' && sqlFallback) {
      return await db.query(sqlFallback, params);
    }
    throw err;
  }
}

module.exports = { queryWithColumnFallback };
