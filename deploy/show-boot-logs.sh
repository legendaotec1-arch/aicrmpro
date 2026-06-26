#!/usr/bin/env bash
# Последние этапы boot-трейса booking (TG/MAX WebView)
set -euo pipefail
LIMIT="${1:-80}"
docker logs crm_max_backend 2>&1 | grep '\[client-boot\]' | tail -n "$LIMIT"
