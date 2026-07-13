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

## Remaining browser acceptance suite

Add Playwright after the single-origin reverse proxy exists in Phase 9. Its first flows should cover:

- register/sign in, refresh an expired session, and sign out;
- open drivers, search, paginate, and change profile season;
- open a race and move into real race analysis;
- configure a grid, run a prediction, and inspect prediction history;
- show the 404 and backend-unavailable states;
- keyboard-only navigation and automated accessibility checks.

Deferring browser automation until the reverse proxy avoids hard-coding the temporary two-origin
development architecture into long-lived acceptance tests.
