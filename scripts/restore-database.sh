#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_RESTORE=<database> $0 <backup.dump>" >&2
  exit 1
fi

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-$PROJECT_DIR/.env.production}
backup=$1

if [ ! -r "$backup" ]; then
  echo "Backup is not readable: $backup" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" "$@"
}

verify_checksum() {
  checksum_file=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$checksum_file"
  else
    shasum -a 256 -c "$checksum_file"
  fi
}

database=$(compose exec -T postgres printenv POSTGRES_DB)
username=$(compose exec -T postgres printenv POSTGRES_USER)

if [ "${CONFIRM_RESTORE:-}" != "$database" ]; then
  echo "Restore refused. Set CONFIRM_RESTORE=$database to replace this database." >&2
  exit 1
fi

if [ -f "$backup.sha256" ]; then
  (cd "$(dirname "$backup")" && verify_checksum "$(basename "$backup").sha256")
fi
compose exec -T postgres pg_restore --list < "$backup" >/dev/null

ENV_FILE="$ENV_FILE" BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/postgres}" \
  "$PROJECT_DIR/scripts/backup-database.sh" >/dev/null

restart_services() {
  compose start backend ml-service frontend >/dev/null 2>&1 || true
}
trap restart_services EXIT INT TERM

compose stop backend ml-service
compose exec -T postgres dropdb --username "$username" --force "$database"
compose exec -T postgres createdb --username "$username" --owner "$username" "$database"
compose exec -T postgres pg_restore \
  --username "$username" \
  --dbname "$database" \
  --no-owner \
  --no-privileges < "$backup"
compose exec -T redis sh -c 'redis-cli -a "$REDIS_PASSWORD" FLUSHDB' >/dev/null

echo "Restored $database from $backup"
