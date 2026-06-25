const MAX_LOGS = 1000;
const logs = [];

function pushClientLog(entry) {
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  return entry;
}

function getRecentLogs(limit = 100, { ip, event } = {}) {
  let slice = logs;
  if (ip) slice = slice.filter((l) => l.ip === ip);
  if (event) slice = slice.filter((l) => l.event === event);
  return slice.slice(-Math.min(limit, MAX_LOGS));
}

module.exports = { pushClientLog, getRecentLogs, MAX_LOGS };
