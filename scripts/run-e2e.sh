#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_PROJECT_NAME=pitstop-e2e
export COMPOSE_PROJECT_NAME

compose() {
  docker compose \
    --env-file "$PROJECT_DIR/scripts/e2e/e2e.env" \
    -f "$PROJECT_DIR/docker-compose.yml" \
    -f "$PROJECT_DIR/docker-compose.e2e.yml" \
    "$@"
}

cleanup() {
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    compose logs --tail=150 frontend backend ml-service postgres redis || true
  fi
  compose down --volumes --remove-orphans || true
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

compose up --build --detach --wait --wait-timeout 240
compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pitstop -d pitstop_e2e \
  < "$PROJECT_DIR/scripts/e2e/seed.sql"

cd "$PROJECT_DIR/frontend"
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:14200 npm run e2e
