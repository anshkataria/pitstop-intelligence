#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-$PROJECT_DIR/.env.production}
: "${GHCR_REPOSITORY:?Set GHCR_REPOSITORY, for example owner/pitstop-intelligence}"
: "${IMAGE_TAG:?Set IMAGE_TAG to the release commit SHA}"

export COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml:$PROJECT_DIR/docker-compose.prod.yml:$PROJECT_DIR/docker-compose.vps.yml"
export GHCR_REPOSITORY IMAGE_TAG

if docker compose --env-file "$ENV_FILE" ps --status running --services | grep -qx postgres; then
  ENV_FILE="$ENV_FILE" "$PROJECT_DIR/scripts/backup-database.sh"
else
  echo "No running database found; skipping the pre-deployment backup."
fi

docker compose --env-file "$ENV_FILE" pull frontend backend ml-service ingestion ingestion-scheduler gateway
docker compose --env-file "$ENV_FILE" up -d --no-build --remove-orphans
docker compose --env-file "$ENV_FILE" ps

public_host=$(docker compose --env-file "$ENV_FILE" exec -T gateway printenv PUBLIC_HOST)
curl --fail --retry 12 --retry-delay 5 "https://$public_host/healthz"
