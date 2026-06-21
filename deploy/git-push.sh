#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не найден $ENV_FILE"
  exit 1
fi

read_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)"
  if [[ -z "$line" ]]; then
    echo "Не задано ${key} в .env" >&2
    exit 1
  fi
  echo "${line#*=}"
}

GITHUB_USERNAME="$(read_env GITHUB_USERNAME)"
GITHUB_REPO="$(read_env GITHUB_REPO)"
GITHUB_TOKEN="$(read_env GITHUB_TOKEN)"

if [[ -z "${GITHUB_TOKEN// }" ]]; then
  echo "GITHUB_TOKEN пустой. Вставьте токен в .env и запустите снова."
  exit 1
fi

cd "$ROOT"
BRANCH="$(git branch --show-current)"

git remote set-url origin "https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git"

echo "Push в github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git (${BRANCH})..."

GIT_TERMINAL_PROMPT=0 git \
  -c "credential.helper=!f() { echo username=x-access-token; echo password=${GITHUB_TOKEN}; }; f" \
  push -u origin "${BRANCH}"

echo "Готово."
