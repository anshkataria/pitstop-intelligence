#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-$PROJECT_DIR/.env.production}
BACKUP_DIR=${BACKUP_DIR:-$PROJECT_DIR/backups/postgres}
RETENTION_DAYS=${RETENTION_DAYS:-14}

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" "$@"
}

write_checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

database=$(compose exec -T postgres printenv POSTGRES_DB)
username=$(compose exec -T postgres printenv POSTGRES_USER)
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$BACKUP_DIR/${database}_${timestamp}.dump"
temporary="$backup.partial"

cleanup() {
  rm -f "$temporary"
}
trap cleanup EXIT INT TERM

compose exec -T postgres pg_dump \
  --username "$username" \
  --dbname "$database" \
  --format custom \
  --compress 9 \
  --no-owner \
  --no-privileges > "$temporary"

test -s "$temporary"
compose exec -T postgres pg_restore --list < "$temporary" >/dev/null
mv "$temporary" "$backup"
(cd "$BACKUP_DIR" && write_checksum "$(basename "$backup")" > "$(basename "$backup").sha256")

if [ -n "${BACKUP_S3_URI:-}" ]; then
  command -v aws >/dev/null 2>&1 || {
    echo "BACKUP_S3_URI is set but the AWS CLI is not installed" >&2
    exit 1
  }
  destination=${BACKUP_S3_URI%/}/
  aws s3 cp "$backup" "$destination"
  aws s3 cp "$backup.sha256" "$destination"
fi

find "$BACKUP_DIR" -type f \( -name '*.dump' -o -name '*.dump.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

echo "$backup"
