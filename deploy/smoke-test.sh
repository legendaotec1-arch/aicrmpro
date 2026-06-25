#!/usr/bin/env bash
# Быстрая проверка woner.ru: API, боты, ссылки мастеров, кеш, worker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_URL="${PUBLIC_URL:-https://woner.ru}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3000}"
MAX_BOT_URL="${MAX_BOT_URL:-http://127.0.0.1:3001}"
TG_BOT_URL="${TG_BOT_URL:-http://127.0.0.1:3002}"
FAIL=0

pass() { echo "  OK  $1"; }
fail() { echo "  FAIL $1"; FAIL=1; }

echo "==> Health"
curl -sf "$BACKEND_URL/api/health" >/dev/null && pass "backend /api/health" || fail "backend /api/health"
curl -sf "$MAX_BOT_URL/health" >/dev/null && pass "MAX bot /health" || fail "MAX bot /health"
curl -sf "$TG_BOT_URL/health" >/dev/null && pass "Telegram bot /health" || fail "Telegram bot /health"

echo "==> Notification worker DB"
if docker exec crm_max_notifications node -e "require('./src/config/database').query('SELECT 1').then(()=>process.exit(0)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  pass "crm_max_notifications -> postgres"
else
  fail "crm_max_notifications -> postgres"
fi

echo "==> Master pages & API"
for slug in anna-fomina-kurgan krasota-kurgan; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$PUBLIC_URL/m/$slug")
  [[ "$code" == "200" ]] && pass "GET /m/$slug ($code)" || fail "GET /m/$slug ($code)"
  curl -sf "$PUBLIC_URL/api/master/$slug" | grep -q '"salon_name"' && pass "API /api/master/$slug" || fail "API /api/master/$slug"
done

legacy=YzJkMGZlMmEtZDNjYS00ODk5LWFhNWItNGM0NDQ3NzdlNzgx
loc=$(curl -sSI "$PUBLIC_URL/m/$legacy" | tr -d '\r' | awk '/^Location:/ {print $2}')
[[ "$loc" == "/m/anna-fomina-kurgan" ]] && pass "legacy link 301 -> slug" || fail "legacy link redirect ($loc)"

echo "==> Cache headers (HTML no-store)"
cc=$(curl -sSI "$PUBLIC_URL/m/anna-fomina-kurgan" | tr -d '\r' | awk -F': ' '/^[Cc]ache-[Cc]ontrol:/ {print $2}')
echo "$cc" | grep -qi 'no-store' && pass "master page Cache-Control: $cc" || fail "master page cache ($cc)"

echo "==> MAX webhook"
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$PUBLIC_URL/webhook" -H 'Content-Type: application/json' -d '{}')
[[ "$code" == "200" || "$code" == "400" ]] && pass "POST /webhook ($code)" || fail "POST /webhook ($code)"

echo "==> Notify auth"
SECRET=$(docker exec crm_max_backend printenv INTERNAL_API_SECRET 2>/dev/null || true)
if [[ -n "$SECRET" ]]; then
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$TG_BOT_URL/notify" -H 'Content-Type: application/json' -d '{"telegramUserId":"0","message":"x"}')
  [[ "$code" == "401" ]] && pass "Telegram /notify rejects without secret" || fail "Telegram /notify auth ($code)"
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$TG_BOT_URL/notify" \
    -H 'Content-Type: application/json' -H "X-Internal-Secret: $SECRET" \
    -d '{"telegramUserId":"0","message":"smoke-test"}')
  [[ "$code" == "500" || "$code" == "200" ]] && pass "Telegram /notify accepts secret (delivery $code)" || fail "Telegram /notify ($code)"
else
  fail "INTERNAL_API_SECRET not set in backend container"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo "All smoke tests passed."
else
  echo ""
  echo "Some tests failed."
  exit 1
fi
