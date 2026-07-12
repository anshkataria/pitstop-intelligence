# Historical ingestion

The ingestion service is a one-shot, repeatable job. Spring Boot must start first so Flyway can
create or update the database schema, including the `ingestion_runs` audit table.

Run it manually from the project root:

```bash
./scripts/run-ingestion.sh
```

`SEASONS_TO_FETCH` in the root `.env` controls the imported seasons. Existing domain rows are
updated through PostgreSQL upserts, so rerunning the same seasons does not create duplicates.

## Scheduling with cron

The wrapper script is suitable for host cron or another scheduler. For example, this runs every
Monday at 03:00 and appends output to a local log:

```cron
0 3 * * 1 cd /absolute/path/to/pitstop-intelligence && ./scripts/run-ingestion.sh >> ingestion.log 2>&1
```

Each invocation creates an `ingestion_runs` record containing timing, requested and failed seasons,
insert/update/skip counts, status, and a concise error summary.
