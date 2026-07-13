# CI/CD and observability

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

- Spring Boot tests on Java 21, including Testcontainers when Docker is available;
- Angular unit tests and the production build on Node 22;
- FastAPI and ingestion pytest suites on Python 3.11;
- Docker Compose validation and image builds after the test jobs pass.

`.github/workflows/security.yml` performs dependency review on pull requests and
scheduled CodeQL analysis for Java, TypeScript and Python.

`.github/workflows/release-images.yml` is a manual release workflow. After approval by
the protected `production` GitHub environment, it builds and publishes versioned
frontend, backend, ML and ingestion images to GitHub Container Registry. Configure the
environment's required reviewers before using it. Deploying those images to a host is
intentionally separate because no cloud or server target has been selected yet.

## Correlation IDs

Nginx creates an `X-Request-ID` for API requests. Spring validates it, returns it in
the response, stores it in the logging MDC and forwards it to FastAPI. FastAPI stores
the same value in request-local context and returns it in its response.

```text
Nginx request ID -> Spring requestId -> FastAPI requestId
```

Unsafe or excessively long incoming values are replaced with UUIDs. Search for the
same `requestId` across Spring and FastAPI JSON logs to follow one prediction request
through both services.

## Metrics

Spring exposes Micrometer metrics at:

```text
http://backend:8080/api/actuator/prometheus
```

FastAPI exposes:

```text
http://ml-service:8000/metrics
```

FastAPI metrics include request counts, request duration, prediction outcomes,
predicted-position distribution, active model version and whether a model is loaded.
Spring contributes HTTP, JVM, database-pool, cache and process metrics through
Actuator. Health details are no longer returned to anonymous callers.

## Running monitoring locally

Start the application and the optional monitoring profile:

```bash
docker compose --profile monitoring up --build
```

Open:

- Application: `http://localhost:4200`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

Grafana provisions the Prometheus datasource and the **PitStop Intelligence Overview**
dashboard automatically. Local credentials come from `.env`; change the default
Grafana password even on shared development machines.

Prometheus and Grafana bind to `127.0.0.1`, so they are not reachable from other hosts.
For a remote production environment, use a VPN, SSH tunnel or authenticated operations
gateway instead of publishing monitoring ports publicly.

## Current monitoring boundary

This phase monitors service availability, request errors, latency, JVM resources and
model-loaded state. Accuracy, drift, circuit performance and actual-versus-predicted
results require completed races and the later model-monitoring work. Live telemetry
metrics remain part of Phase 6, which is intentionally scheduled after the historical
platform and production foundation.
