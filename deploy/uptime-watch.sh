#!/usr/bin/env bash
# Проверка доступности woner.ru — для cron (каждую минуту) или UptimeRobot.
# Лог: /var/log/woner-uptime.log
set -euo pipefail

LOG="${WONER_UPTIME_LOG:-/var/log/woner-uptime.log}"
DOMAIN="${WONER_DOMAIN:-woner.ru}"
TIMEOUT=20

touch "$LOG" 2>/dev/null || LOG="/opt/aicrmpro/deploy/woner-uptime.log"

check() {
  local url="$1"
  local label="$2"
  local code
  code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    return 0
  fi
  echo "$(date -Iseconds) FAIL $label url=$url http=$code" >> "$LOG"
  return 1
}

ok=0
check "https://${DOMAIN}/api/health" "health" && ok=$((ok + 1)) || true
check "https://${DOMAIN}/dashboard" "dashboard-html" && ok=$((ok + 1)) || true

exit $((ok < 2 ? 1 : 0))
