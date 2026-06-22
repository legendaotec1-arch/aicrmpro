#!/bin/bash
# ============================================
# Deploy script for ClientPage redesign
# Builds frontend and copies to docker container
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
CONTAINER_NAME="aicrmpro-backend-1"

echo "========================================"
echo "Building frontend..."
echo "========================================"
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "========================================"
echo "Copying to docker container: $CONTAINER_NAME"
echo "========================================"
docker cp "$FRONTEND_DIR/dist/." "$CONTAINER_NAME:/app/frontend/dist/"

echo ""
echo "========================================"
echo "Verifying deployment..."
echo "========================================"
CSS_FILE=$(curl -s http://localhost:3000/ | grep -oP 'assets/[^"]+\.css' | head -1)
if [ -n "$CSS_FILE" ]; then
  COUNT=$(curl -s "http://localhost:3000/$CSS_FILE" | grep -c "ios-card-client\|ios-cta-btn" || echo "0")
  echo "CSS classes found: $COUNT"
fi

echo ""
echo "========================================"
echo "Done! Changes are live at https://woner.ru"
echo "========================================"