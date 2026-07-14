# Docker and deployment

## Service layout

The containerized request path is:

```text
Browser :4200 (development) or :80 (production)
  -> Nginx /api/*
  -> Spring Boot :8080
  -> FastAPI :8000
```

Nginx serves the compiled Angular files and falls back to `index.html` for Angular
routes such as `/drivers/1`. Only Nginx is public in the production configuration.
Spring Boot, FastAPI, PostgreSQL and Redis communicate through the private Compose
network.

## Local Docker setup

Create the local environment file and replace the example JWT and internal ML token values:

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:4200`. The developer Compose file also publishes Spring Boot,
PostgreSQL and Redis for local debugging. FastAPI remains private and is reached via
Spring at `/api/v1/ml/*`.

## Model-training access

`POST /api/v1/ml/train` is restricted to authenticated accounts with the `ADMIN`
role. Public registration deliberately creates only `USER` accounts. Promote a
trusted account through an audited database operation rather than exposing a public
role-management endpoint:

```sql
UPDATE app_users
SET role = 'ADMIN', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@example.com';
```

Spring reloads the account role while validating each authenticated request, then
attaches `X-Pitstop-Internal-Token` when an administrator calls FastAPI. FastAPI
rejects training requests that do not contain the configured private token, so
clients cannot bypass Spring by calling the internal service directly.

Set the same strong `ML_INTERNAL_TOKEN` value for Spring and FastAPI. It must be
different from `JWT_SECRET` and must never be exposed to Angular or committed to the
repository. Production Compose requires both secrets explicitly.

Run historical ingestion when required:

```bash
docker compose --profile ingestion run --rm ingestion
```

Add Prometheus and Grafana with:

```bash
docker compose --profile monitoring up --build
```

Stop services without deleting data:

```bash
docker compose down
```

Adding `-v` deletes PostgreSQL, Redis, model and MLflow volumes, so use it only when a
full data reset is intended.

## Production Compose setup

### Deployment target

The supported deployment target is one Ubuntu 24.04 LTS VPS with at least 2 vCPU,
4 GB RAM and 40 GB of persistent storage. It can run at any provider that offers a
public IPv4 address. Docker Compose runs the application; Caddy is the only public
container and provisions HTTPS automatically when the domain points to the server.

Prepare the host once:

```bash
sudo adduser --disabled-password --gecos '' pitstop
sudo usermod -aG docker pitstop
sudo install -d -o pitstop -g pitstop -m 750 /opt/pitstop
sudo install -d -o pitstop -g pitstop -m 700 /var/backups/pitstop/postgres
```

Install Docker Engine and the Compose plugin from Docker's Ubuntu repository. Add the
deployment SSH public key to `/home/pitstop/.ssh/authorized_keys`, point the domain's
A/AAAA records at the VPS, and allow inbound TCP 22, 80 and 443 plus UDP 443. Database,
Redis and backend ports stay private.

The GitHub `production` environment requires these secrets:

- `DEPLOY_HOST`: VPS hostname or IP address;
- `DEPLOY_USER`: `pitstop`;
- `DEPLOY_SSH_KEY`: private Ed25519 deployment key;
- `DEPLOY_KNOWN_HOSTS`: pinned `ssh-keyscan` output verified out of band.

If the GHCR packages are private, log the `pitstop` host user into `ghcr.io` once with
a read-only package token. The workflow never transfers registry or application
secrets to the host.

Create a secret environment file that is never committed:

```bash
cp .env.production.example .env.production
```

Replace every placeholder. `PUBLIC_ORIGIN` must be the exact external origin,
including `https://`; `PUBLIC_HOST` is the same hostname without the scheme. Store
this file only at `/opt/pitstop/.env.production`. Set `GHCR_REPOSITORY` to the
lowercase `owner/repository` package prefix and `IMAGE_TAG` to a published commit SHA.
Then validate the VPS configuration:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  config --quiet
```

Run **Release images** from GitHub Actions to publish commit-addressed images. After
all four images are available, its protected deployment job copies only the Compose,
Caddy and operational scripts, takes a database backup, pulls that exact commit SHA,
recreates the services and verifies `https://<PUBLIC_HOST>/healthz`.

The production override:

- exposes Caddy on ports 80 and 443 and keeps Nginx private;
- removes host ports for Spring Boot, PostgreSQL and Redis;
- activates Spring's strict `prod` profile;
- applies container restart policies and resource limits;
- rotates Docker JSON log files;
- retains service health checks and dependency ordering.

If the provider supplies a load balancer instead of direct DNS, forward it to the
gateway container. Do not publish application services around the gateway.

## PostgreSQL backups and restore

Backups use PostgreSQL's custom archive format, compression, restrictive file
permissions, `pg_restore --list` integrity validation and a sidecar SHA-256 checksum.
The script writes atomically and removes archives older than `RETENTION_DAYS` only
after a new backup succeeds.

Create a manual production backup:

```bash
cd /opt/pitstop
export COMPOSE_FILE="$PWD/docker-compose.yml:$PWD/docker-compose.prod.yml"
ENV_FILE="$PWD/.env.production" \
BACKUP_DIR=/var/backups/pitstop/postgres \
./scripts/backup-database.sh
```

Install the daily 03:15 UTC systemd timer:

```bash
sudo install -m 644 deploy/systemd/pitstop-backup.service /etc/systemd/system/
sudo install -m 644 deploy/systemd/pitstop-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pitstop-backup.timer
systemctl list-timers pitstop-backup.timer
journalctl -u pitstop-backup.service
```

The VPS copy protects against database corruption and deployment mistakes, but not
loss of the server. Replicate `/var/backups/pitstop/postgres` to encrypted object
storage or another host and periodically test a restore. Do not treat an untested or
same-disk-only archive as a complete disaster-recovery plan.

Optional S3-compatible replication is built into the backup script. Install AWS CLI
v2, use an instance role or a least-privilege credential, and create the root-owned
`/opt/pitstop/.backup.env` file:

```text
BACKUP_S3_URI=s3://pitstop-production-backups/postgres
AWS_ENDPOINT_URL=https://object-storage.example.com
```

`AWS_ENDPOINT_URL` is only needed for non-AWS S3-compatible providers. Configure
bucket encryption, versioning and a lifecycle retention policy at the provider. The
backup service is marked failed if an explicitly configured upload does not succeed.

Restore is intentionally guarded. It verifies the archive, creates a fresh
pre-restore backup, stops database clients, replaces the database, restores it, and
starts the application again:

```bash
cd /opt/pitstop
export COMPOSE_FILE="$PWD/docker-compose.yml:$PWD/docker-compose.prod.yml"
CONFIRM_RESTORE=pitstop \
ENV_FILE="$PWD/.env.production" \
BACKUP_DIR=/var/backups/pitstop/postgres \
./scripts/restore-database.sh /var/backups/pitstop/postgres/pitstop_YYYYMMDDTHHMMSSZ.dump
```

Use the actual `POSTGRES_DB` value for `CONFIRM_RESTORE`. Record a successful restore
test after initial deployment and at least quarterly.

## Operational checks

```bash
curl --fail http://localhost/healthz
docker compose ps
docker compose logs --tail=100 frontend backend ml-service
```

The Angular image is built in two stages. Node compiles the production bundle, then
only the generated static files and Nginx configuration are copied into the runtime
image. Node, source files and frontend dependencies are not present in that final
image.
