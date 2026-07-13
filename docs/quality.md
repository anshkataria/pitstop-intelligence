# Quality strategy

The fast local suites cover Spring business and security rules, Angular authentication behavior,
ML feature/prediction boundaries, and ingestion idempotency. Run them with:

```bash
cd backend && ./mvnw test
cd frontend && npm test -- --watch=false
cd ml-service && PYTHONPATH=src .venv/bin/pytest -q
cd ingestion && PYTHONPATH=src .venv/bin/pytest -q
```

The complete Spring context test uses Testcontainers and therefore requires a running Docker daemon.
It starts a disposable PostgreSQL 16 container, applies every Flyway migration, validates Hibernate
mappings, and removes the database after the suite.

## Browser acceptance suite

Playwright exercises the real Nginx, Spring, FastAPI, PostgreSQL and Redis containers against an
isolated Compose project. The runner creates fresh volumes, applies Flyway migrations, seeds a
deterministic 2024 race, creates a user through the API and removes the E2E volumes afterward.

The full suite requires Docker Desktop (or another running Docker Engine). Install Chromium once:

```bash
cd frontend
npx playwright install chromium
```

Run the complete isolated suite from the repository root:

```bash
./scripts/run-e2e.sh
```

The suite covers:

- public landing and 404 routes;
- protected-route redirects and invalid credentials;
- real sign-in and sign-out through Spring Security;
- dashboard aggregation from seeded PostgreSQL data;
- driver roster and season statistics;
- race calendar, classification and race-analysis navigation;
- constructor standings;
- prediction context and model-readiness behavior.

Use `npm run e2e:ui` from `frontend` when the isolated stack is already running if you want the
interactive Playwright debugger. Failed CI runs upload traces, screenshots, videos and the HTML
report as a GitHub Actions artifact.
