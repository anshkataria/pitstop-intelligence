# Configuration and security

## Request path

The browser now uses one public API:

```text
Angular -> Spring Boot -> FastAPI
```

Angular never needs the FastAPI address. Prediction, health and training requests use
`/api/v1/ml/*`; Spring forwards them to the private `ML_SERVICE_URL`. This keeps JWT
validation, CORS rules and error handling at the public API boundary.

## Frontend environments

- Development builds use `http://localhost:8080/api`.
- Production builds use the same-origin path `/api`.

Angular CLI swaps `environment.ts` for `environment.development.ts` during `ng serve`.
The production `/api` path is intended for the reverse proxy introduced in Phase 9.

## Runtime variables

| Variable | Service | Purpose |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Spring, FastAPI | PostgreSQL connection |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Spring | Redis connection |
| `JWT_SECRET` | Spring | Signs access tokens; use at least 32 random characters |
| `ML_SERVICE_URL` | Spring | Private FastAPI base URL |
| `CORS_ALLOWED_ORIGINS` | Spring, FastAPI | Comma-separated trusted browser origins |

`application-prod.yml` intentionally has no production database, Redis, ML, CORS or
JWT fallback values. Start Spring with the `prod` profile only after supplying them.

## Secret rules

- Copy `.env.example` to `.env` only for local Docker development.
- Do not commit `.env`, real passwords, token signing keys or cloud credentials.
- Generate a unique production JWT secret and store it in the deployment platform's
  secret manager or Docker secret, not in Compose source.
- Rotate a secret immediately if it appears in Git history or logs.
- PostgreSQL, Redis and FastAPI should remain private in production. The Compose ML
  service now uses `expose` rather than publishing port 8000 to the host.

For local non-Docker FastAPI development, port 8000 can still be started directly by
running Uvicorn. Docker clients should call ML through Spring on port 8080.
