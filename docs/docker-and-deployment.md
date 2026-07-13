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

Create the local environment file and replace the example JWT value:

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:4200`. The developer Compose file also publishes Spring Boot,
PostgreSQL and Redis for local debugging. FastAPI remains private and is reached via
Spring at `/api/v1/ml/*`.

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

Create a secret environment file that is never committed:

```bash
cp .env.production.example .env.production
```

Replace every placeholder. `PUBLIC_ORIGIN` must be the exact external origin,
including `https://`. Then validate and start the merged configuration:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  config --quiet

docker compose \
  --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up --build -d
```

The production override:

- exposes Nginx on host port 80;
- removes host ports for Spring Boot, PostgreSQL and Redis;
- activates Spring's strict `prod` profile;
- applies container restart policies and resource limits;
- rotates Docker JSON log files;
- retains service health checks and dependency ordering.

For public deployment, terminate HTTPS at the host load balancer or edge proxy and
forward traffic to the frontend container. Port 80 should not be exposed directly to
the internet without TLS in front of it.

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
