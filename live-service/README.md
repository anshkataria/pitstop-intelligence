# Live racing intelligence

This service provides the Python data plane for Phase 6. It supports two sources that normalize
into the same PostgreSQL tables and Redis channel:

- **OpenF1** for recent sessions and, with sponsor access, during-session live data;
- **FastF1 3.8.1** for reproducible historical session replay and telemetry backfill.

The browser never calls this service. Spring is the authenticated public API and SSE gateway.

## Run modes

The OpenF1 worker starts with the normal Compose stack. It limits its initial high-frequency query
to `LIVE_LOOKBACK_MINUTES`, polls at `LIVE_POLL_SECONDS`, performs idempotent PostgreSQL upserts and
publishes updates to `pitstop:live:{sessionKey}` in Redis.

True during-session OpenF1 access requires an appropriate OpenF1 access plan and `OPENF1_TOKEN`.
Without it, recent/historical data and FastF1 replay remain usable. See the
[OpenF1 access documentation](https://openf1.org/).

To develop without provider requests:

```dotenv
LIVE_WORKER_ENABLED=false
```

## FastF1 replay

Replay creation is protected twice: Spring requires an administrator account and the live service
requires the private internal-service token. Send this request through Spring:

```http
POST /api/v1/live/replay
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"year": 2024, "event": "Bahrain", "session": "R"}
```

FastF1 loads laps, sectors, car data, positions, tyre stints, pit events, race-control messages and
weather into the same schema used by OpenF1. Open **Live Intelligence** in Angular after the replay
finishes. FastF1 caches downloaded session data in the `fastf1_cache` Docker volume.

## Baseline intelligence models

Five versioned, telemetry-derived baseline models run after provider updates:

- pit window from current lap, tyre age and degradation slope;
- tyre degradation from recent clean-lap linear trend;
- safety-car probability from incidents, flags and rainfall;
- one-stop versus two-stop strategy cost comparison;
- DNF probability from telemetry loss, incident references and pit activity.

They are deliberately labelled `live-baseline-1`. They produce bounded, inspectable outputs and
confidence values, and are suitable for collecting actual-versus-predicted evidence. They should
be retrained and calibrated before being presented as production-grade forecasts.
