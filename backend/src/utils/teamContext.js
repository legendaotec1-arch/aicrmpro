const { ensureDefaultSalonMaster, getSalonMasterById } = require('./salonMasters');

/** salonId = id аккаунта салона (таблица masters) */
async function resolveTeamMasterId(salonId, teamMasterId) {
  if (teamMasterId) {
    const row = await getSalonMasterById(teamMasterId, salonId);
    if (!row) {
      const err = new Error('Мастер салона не найден');
      err.status = 404;
      throw err;
    }
    return row.id;
  }
  return ensureDefaultSalonMaster(salonId);
}

module.exports = { resolveTeamMasterId };
