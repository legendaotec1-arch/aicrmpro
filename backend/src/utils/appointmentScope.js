function teamAppointmentFilter(req, alias = 'a', startParamIndex = 2) {
  if (req.isTeamMember && req.salonMasterId) {
    return {
      sql: ` AND ${alias}.salon_master_id = $${startParamIndex}`,
      params: [req.salonMasterId]
    };
  }
  return { sql: '', params: [] };
}

module.exports = { teamAppointmentFilter };
