# Phase 6 live intelligence architecture

```text
OpenF1 live/recent ─┐
                    ├─> live-service ─> PostgreSQL telemetry history
FastF1 replay ──────┘        │
                             ├─> Redis pub/sub ─> Spring SSE ─> Angular
                             └─> five live intelligence models
```

## Stored domains

Flyway migration `V6__add_live_racing_intelligence.sql` adds sessions, drivers, timing, laps,
sector times, car telemetry, positions, stints, compounds, tyre age, pit stops, race control,
weather and versioned intelligence outputs. Telemetry indexes are ordered for latest-driver
queries; API limits prevent accidental unbounded browser responses.

## Spring API

All endpoints require JWT authentication. FastF1 replay additionally requires `ROLE_ADMIN`.

```text
GET  /api/v1/live/sessions
GET  /api/v1/live/sessions/{key}
GET  /api/v1/live/sessions/{key}/timing
GET  /api/v1/live/sessions/{key}/laps
GET  /api/v1/live/sessions/{key}/stints
GET  /api/v1/live/sessions/{key}/pit-stops
GET  /api/v1/live/sessions/{key}/race-control
GET  /api/v1/live/sessions/{key}/weather
GET  /api/v1/live/sessions/{key}/drivers/{number}/telemetry
GET  /api/v1/live/sessions/{key}/intelligence
GET  /api/v1/live/sessions/{key}/stream
POST /api/v1/live/replay
```

The Angular client uses authenticated `fetch` for SSE because native `EventSource` cannot attach
the JWT Authorization header. Snapshot REST calls establish consistent state; Redis events then
trigger small, debounced snapshot refreshes. A 15-second heartbeat exposes broken connections.

## Provider and operational boundaries

OpenF1 documents car data at roughly 3.7 Hz, timing intervals around every four seconds, weather,
pit stops and race-control state. Its free tier is intended for historical use; during-session live
REST/MQTT/WebSocket access requires sponsor access. FastF1 provides replayable timing, telemetry,
position, tyre and weather data. Review both providers' attribution and non-commercial terms before
deployment: [OpenF1](https://openf1.org/) and [FastF1](https://docs.fastf1.dev/).

Prometheus alerts when the live service is down, an active feed is stale, or provider failures
repeat. Use `LIVE_WORKER_ENABLED=false` in deterministic test environments.
