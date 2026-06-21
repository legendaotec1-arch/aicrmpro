#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT/backups}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
WORK="$BACKUP_ROOT/.work-$STAMP"
ARCHIVE="$BACKUP_ROOT/aicrmpro-full-$STAMP.tar.gz"

DB_CONTAINER="${DB_CONTAINER:-aicrmpro-postgres-1}"
DB_NAME="${DB_NAME:-crm_max}"
DB_USER="${DB_USER:-postgres}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-aicrmpro_aicrmpro_uploads_data}"

mkdir -p "$BACKUP_ROOT" "$WORK/database" "$WORK/uploads" "$WORK/env" "$WORK/project" "$WORK/meta"

echo "==> Git revision"
git -C "$ROOT" rev-parse HEAD > "$WORK/meta/git-revision.txt"
git -C "$ROOT" log -1 --format='%H %ci %s' >> "$WORK/meta/git-revision.txt"

echo "==> Docker state"
docker ps -a > "$WORK/meta/docker-ps.txt" 2>&1 || true
docker volume ls > "$WORK/meta/docker-volumes.txt" 2>&1 || true
docker compose -f "$ROOT/docker-compose.prod.yml" config > "$WORK/meta/docker-compose.prod.yml" 2>&1 || true
docker compose -f "$ROOT/docker-compose.yml" config > "$WORK/meta/docker-compose.yml" 2>&1 || true

UPLOADS_COUNT="$(docker run --rm -v "${UPLOADS_VOLUME}:/v:ro" alpine sh -c 'ls -1 /v 2>/dev/null | wc -l')"

echo "==> Database dump ($DB_CONTAINER / $DB_NAME)"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip -9 > "$WORK/database/${DB_NAME}.sql.gz"

echo "==> Uploads volume ($UPLOADS_VOLUME)"
docker run --rm \
  -v "${UPLOADS_VOLUME}:/src:ro" \
  -v "$WORK/uploads:/dest" \
  alpine sh -c 'cp -a /src/. /dest/'

echo "==> Environment"
if [[ -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$WORK/env/.env"
fi

echo "==> Project source (code + .git + node_modules + dist)"
tar -C "$ROOT" \
  --exclude='./backups' \
  --exclude='./backups/*' \
  -cf "$WORK/project/aicrmpro-project.tar" .

DB_SIZE="$(du -h "$WORK/database/${DB_NAME}.sql.gz" | cut -f1)"
UPLOADS_SIZE="$(du -sh "$WORK/uploads" | cut -f1)"
PROJECT_SIZE="$(du -h "$WORK/project/aicrmpro-project.tar" | cut -f1)"

cat > "$WORK/MANIFEST.txt" <<EOF
AICRMPro full backup
Created: $(date -Iseconds)
Host: $(hostname)
Archive: $(basename "$ARCHIVE")
Git: $(git -C "$ROOT" rev-parse --short HEAD)
Database: ${DB_NAME}.sql.gz (${DB_SIZE})
Uploads volume: ${UPLOADS_VOLUME} (${UPLOADS_COUNT} files, ${UPLOADS_SIZE})
Project archive: ${PROJECT_SIZE} (includes .git, node_modules, frontend/dist)
Contents:
  - database/${DB_NAME}.sql.gz
  - uploads/ (all media files)
  - env/.env
  - project/aicrmpro-project.tar
  - meta/ (git, docker, compose config)
Restore hints:
  1. Extract: tar -xzf $(basename "$ARCHIVE")
  2. DB: gunzip -c database/${DB_NAME}.sql.gz | docker exec -i POSTGRES_CONTAINER psql -U postgres -d ${DB_NAME}
  3. Uploads: docker run --rm -v aicrmpro_aicrmpro_uploads_data:/dest -v "\$PWD/uploads:/src" alpine cp -a /src/. /dest/
  4. Project: tar -xf project/aicrmpro-project.tar -C /opt/aicrmpro
  5. Restart: docker compose -f docker-compose.prod.yml up -d
EOF

echo "==> Pack archive"
tar -C "$WORK" -czf "$ARCHIVE" .
rm -rf "$WORK"

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "Done: $ARCHIVE ($SIZE)"
