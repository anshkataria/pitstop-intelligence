import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from time import monotonic
from typing import Any

import redis
from prometheus_client import Counter, Gauge

from liveservice.config import Settings
from liveservice.intelligence import (
    dnf_probability,
    pit_window,
    safety_car_probability,
    strategy_comparison,
    tyre_degradation,
)
from liveservice.openf1 import OpenF1Client
from liveservice.repository import LiveRepository

logger = logging.getLogger(__name__)
EVENTS = Counter("pitstop_live_events_total", "Live provider records processed", ["endpoint"])
ERRORS = Counter("pitstop_live_errors_total", "Live worker failures", ["operation"])
LAST_UPDATE = Gauge("pitstop_live_last_update_timestamp_seconds", "Last successful provider update")
ACTIVE_SESSION = Gauge("pitstop_live_active_session", "Whether a live/recent session is available")


class LiveWorker:
    SLOW_ENDPOINTS = {"drivers": 120, "stints": 60}

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = OpenF1Client(settings.openf1_base_url, settings.openf1_token)
        self.repository = LiveRepository(settings.database_dsn)
        self.redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.cursors: dict[str, datetime] = {}
        self.last_fetch: dict[str, float] = {}
        self.session_key: str | None = None
        self.session_id: int | None = None
        self.last_error: str | None = None
        self.last_model_run = 0.0

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return
        self.thread = threading.Thread(target=self._loop, daemon=True, name="openf1-live-worker")
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=10)

    def health(self) -> dict[str, Any]:
        return {
            "running": bool(self.thread and self.thread.is_alive()),
            "sessionKey": self.session_key,
            "lastError": self.last_error,
        }

    def _loop(self) -> None:
        while not self.stop_event.is_set():
            try:
                self.poll_once()
                self.last_error = None
            except Exception as exc:
                self.last_error = f"{type(exc).__name__}: {exc}"
                ERRORS.labels("poll").inc()
                logger.exception("Live provider poll failed")
            self.stop_event.wait(self.settings.poll_seconds)

    def poll_once(self) -> None:
        session = self.client.latest_session()
        if not session:
            ACTIVE_SESSION.set(0)
            return
        next_session_key = str(session["session_key"])
        if next_session_key != self.session_key:
            self.cursors.clear()
            self.last_fetch.clear()
            bootstrap = datetime.now(timezone.utc) - timedelta(minutes=self.settings.lookback_minutes)
            for endpoint in ("position", "intervals", "car_data", "location", "pit", "race_control", "weather"):
                self.cursors[endpoint] = bootstrap
        self.session_key = next_session_key
        self.session_id = self.repository.upsert_session(session)
        ACTIVE_SESSION.set(1)
        now = monotonic()
        for endpoint in self.client.ENDPOINTS:
            interval = self.SLOW_ENDPOINTS.get(endpoint, self.settings.poll_seconds)
            if now - self.last_fetch.get(endpoint, 0) < interval:
                continue
            rows = self.client.session_data(endpoint, self.session_key, self.cursors.get(endpoint))
            self.last_fetch[endpoint] = now
            if not rows:
                continue
            stored = self.repository.store(endpoint, self.session_id, rows)
            EVENTS.labels(endpoint).inc(stored)
            dated = [row.get("date") for row in rows if row.get("date")]
            if dated:
                self.cursors[endpoint] = max(datetime.fromisoformat(value.replace("Z", "+00:00")) for value in dated)
            self._publish(endpoint, rows[-100:])
        if now - self.last_model_run >= 60:
            self._run_models()
            self.last_model_run = now
        LAST_UPDATE.set(datetime.now(timezone.utc).timestamp())

    def _run_models(self) -> None:
        if self.session_id is None:
            return
        features = self.repository.model_features(self.session_id)
        outputs = [safety_car_probability(
            int(features["control"].get("incidents") or 0),
            int(features["control"].get("yellows") or 0),
            features["wet"],
        )]
        maximum_samples = max((int(driver.get("telemetry_samples") or 0) for driver in features["drivers"]), default=0)
        for driver in features["drivers"]:
            number = int(driver["driver_number"])
            laps = [float(value) for value in (driver.get("lap_times") or [])]
            degradation = tyre_degradation(number, laps, driver.get("compound"))
            outputs.extend([
                degradation,
                pit_window(number, int(driver.get("current_lap") or 0), int(driver.get("tyre_age") or 0), float(degradation.output["secondsPerLap"])),
                strategy_comparison(number, int(driver.get("current_lap") or 0), float(degradation.output["secondsPerLap"])),
                dnf_probability(
                    number,
                    max(0, maximum_samples - int(driver.get("telemetry_samples") or 0)) // 100,
                    int(driver.get("pit_stops") or 0),
                    int(driver.get("incident_mentions") or 0),
                ),
            ])
        self.repository.save_models(self.session_id, outputs)
        self._publish("intelligence", [output.__dict__ for output in outputs])

    def _publish(self, event: str, rows: list[dict[str, Any]]) -> None:
        if self.session_key is None:
            return
        message = json.dumps({"event": event, "sessionKey": self.session_key, "data": rows}, default=str)
        self.redis.publish(f"pitstop:live:{self.session_key}", message)
