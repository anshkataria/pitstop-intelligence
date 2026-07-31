import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from time import monotonic
from typing import Any

import redis
from prometheus_client import Counter, Gauge

from liveservice.config import Settings
from liveservice.intelligence import compute_models
from liveservice.openf1 import OpenF1Client
from liveservice.repository import LiveRepository

logger = logging.getLogger(__name__)
EVENTS = Counter("pitstop_live_events_total", "Live provider records processed", ["endpoint"])
ERRORS = Counter("pitstop_live_errors_total", "Live worker failures", ["operation"])
LAST_UPDATE = Gauge("pitstop_live_last_update_timestamp_seconds", "Last successful provider update")
ACTIVE_SESSION = Gauge("pitstop_live_active_session", "Whether a live/recent session is available")


class LiveWorker:
    # "laps" has no incremental cursor (OpenF1 rows carry no filterable "date"),
    # so every poll re-fetches the full lap list for the session; throttle it
    # like the other un-cursored endpoints instead of hitting it every 5s.
    SLOW_ENDPOINTS = {"drivers": 120, "stints": 60, "laps": 20}

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
        idle_streak = 0
        error_streak = 0
        while not self.stop_event.is_set():
            try:
                live = self.poll_once()
                self.last_error = None
                error_streak = 0
                idle_streak = 0 if live else idle_streak + 1
            except Exception as exc:
                self.last_error = f"{type(exc).__name__}: {exc}"
                ERRORS.labels("poll").inc()
                logger.exception("Live provider poll failed")
                error_streak += 1
                idle_streak = 0
            self.stop_event.wait(self._next_wait(idle_streak, error_streak))

    def _next_wait(self, idle_streak: int, error_streak: int) -> float:
        base = self.settings.poll_seconds
        if error_streak:
            # Back off exponentially so a broken/rate-limited provider doesn't get
            # hammered every poll interval; caps at 5 minutes between attempts.
            return min(300.0, base * (2 ** min(error_streak, 6)))
        if idle_streak:
            # No live session: check back less often the longer it stays idle,
            # capped at 2 minutes, instead of polling every session_key=latest.
            return min(120.0, base * min(idle_streak, 12))
        return base

    def _is_live(self, session: dict[str, Any]) -> bool:
        now = datetime.now(timezone.utc)
        start = _parse_provider_timestamp(session.get("date_start"))
        if start is None or now < start:
            return False
        end = _parse_provider_timestamp(session.get("date_end"))
        if end is not None:
            return now <= end
        # No known end time yet: only treat it as live within a bounded window
        # after the start, so a session OpenF1 never closes out doesn't get
        # polled as "live" indefinitely.
        return now - start <= timedelta(hours=4)

    def poll_once(self) -> bool:
        session = self.client.latest_session()
        if not session or not self._is_live(session):
            ACTIVE_SESSION.set(0)
            self.session_key = None
            self.session_id = None
            return False
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
        return True

    def _run_models(self) -> None:
        if self.session_id is None:
            return
        features = self.repository.model_features(self.session_id)
        outputs = compute_models(features)
        self.repository.save_models(self.session_id, outputs)
        self._publish("intelligence", [output.__dict__ for output in outputs])

    def _publish(self, event: str, rows: list[dict[str, Any]]) -> None:
        if self.session_key is None:
            return
        publish_live_event(self.redis, self.session_key, event, rows)


def publish_live_event(redis_client: "redis.Redis", session_key: str, event: str, rows: list[dict[str, Any]]) -> None:
    message = json.dumps({"event": event, "sessionKey": session_key, "data": rows}, default=str)
    redis_client.publish(f"pitstop:live:{session_key}", message)


def _parse_provider_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
