from datetime import datetime, timedelta, timezone

from liveservice.config import Settings
from liveservice.worker import LiveWorker, _parse_provider_timestamp


def _worker(poll_seconds: float = 20.0) -> LiveWorker:
    worker = object.__new__(LiveWorker)
    worker.settings = Settings(
        database_dsn="", redis_url="redis://localhost/0", openf1_base_url="https://api.openf1.org/v1",
        openf1_token=None, poll_seconds=poll_seconds, worker_enabled=True,
        internal_token="token", fastf1_cache="/tmp", lookback_minutes=10,
    )
    return worker


def test_is_live_true_within_session_window():
    now = datetime.now(timezone.utc)
    session = {"date_start": (now - timedelta(minutes=10)).isoformat(), "date_end": (now + timedelta(minutes=50)).isoformat()}
    assert _worker()._is_live(session) is True


def test_is_live_false_after_session_ends():
    now = datetime.now(timezone.utc)
    session = {"date_start": (now - timedelta(hours=3)).isoformat(), "date_end": (now - timedelta(hours=1)).isoformat()}
    assert _worker()._is_live(session) is False


def test_is_live_false_before_session_starts():
    now = datetime.now(timezone.utc)
    session = {"date_start": (now + timedelta(hours=1)).isoformat(), "date_end": None}
    assert _worker()._is_live(session) is False


def test_is_live_falls_back_to_bounded_window_without_end_time():
    now = datetime.now(timezone.utc)
    recent = {"date_start": (now - timedelta(hours=1)).isoformat(), "date_end": None}
    stale = {"date_start": (now - timedelta(hours=8)).isoformat(), "date_end": None}
    assert _worker()._is_live(recent) is True
    assert _worker()._is_live(stale) is False


def test_next_wait_grows_when_idle_and_caps_at_two_minutes():
    worker = _worker(poll_seconds=20.0)
    assert worker._next_wait(idle_streak=0, error_streak=0) == 20.0
    assert worker._next_wait(idle_streak=1, error_streak=0) == 20.0
    assert worker._next_wait(idle_streak=6, error_streak=0) == 120.0
    assert worker._next_wait(idle_streak=50, error_streak=0) == 120.0


def test_next_wait_backs_off_exponentially_on_errors_and_caps_at_five_minutes():
    worker = _worker(poll_seconds=20.0)
    assert worker._next_wait(idle_streak=0, error_streak=1) == 40.0
    assert worker._next_wait(idle_streak=0, error_streak=3) == 160.0
    assert worker._next_wait(idle_streak=0, error_streak=10) == 300.0


def test_laps_endpoint_is_throttled_like_the_other_uncursored_endpoints():
    # "laps" has no incremental cursor, so every poll re-fetches the full lap
    # list; it must be throttled or it hammers OpenF1 every poll interval.
    assert "laps" in LiveWorker.SLOW_ENDPOINTS
    assert LiveWorker.SLOW_ENDPOINTS["laps"] > 0


def test_parse_provider_timestamp_handles_zulu_suffix_and_bad_input():
    assert _parse_provider_timestamp(None) is None
    assert _parse_provider_timestamp("not-a-date") is None
    parsed = _parse_provider_timestamp("2024-03-02T15:00:00Z")
    assert parsed is not None
    assert parsed.tzinfo is not None
