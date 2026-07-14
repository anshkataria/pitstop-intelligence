# Historical ingestion

The ingestion service is a one-shot, repeatable job. Spring Boot must start first so Flyway can
create or update the database schema, including the `ingestion_runs` audit table.

Run it manually from the project root:

```bash
./scripts/run-ingestion.sh
```

`SEASONS_TO_FETCH` in the root `.env` controls the imported seasons. Existing domain rows are
updated through PostgreSQL upserts, so rerunning the same seasons does not create duplicates.

## Container scheduling

The normal Compose stack includes an `ingestion-scheduler` container. By default it runs every
Monday at 03:00 UTC. Configure it in the root `.env`:

```dotenv
INGESTION_CRON=0 3 * * 1
INGESTION_TIMEZONE=Australia/Brisbane
INGESTION_RUN_ON_STARTUP=false
```

The supported cron shape is `minute hour * * weekday`; use `*` for the weekday to run daily.
Cron weekdays follow the usual `0=Sunday` through `6=Saturday` convention. Runs execute in one
thread, so a long-running import cannot overlap the next scheduled invocation.

Set `INGESTION_RUN_ON_STARTUP=true` when a newly deployed scheduler should import immediately.
Manual runs through `./scripts/run-ingestion.sh` remain available independently.

## Metrics and alerts

The scheduler publishes Prometheus metrics internally on port `9101`, including its next run,
last success, duration, status and record counts. The monitoring profile loads alerts for:

- a scheduler that cannot be scraped for ten minutes;
- a failed or partially completed run;
- more than eight days without a successful run.

Set `INGESTION_ALERT_WEBHOOK_URL` to receive immediate generic JSON notifications for failures,
partial runs and recovery. Alert delivery failures are logged but never terminate the scheduler.

Each invocation creates an `ingestion_runs` record containing timing, requested and failed seasons,
insert/update/skip counts, status, and a concise error summary.
