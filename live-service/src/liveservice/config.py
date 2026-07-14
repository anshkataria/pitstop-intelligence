import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_dsn: str
    redis_url: str
    openf1_base_url: str
    openf1_token: str | None
    poll_seconds: float
    worker_enabled: bool
    internal_token: str
    fastf1_cache: str
    lookback_minutes: int


def load_settings() -> Settings:
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "pitstop")
    user = os.getenv("DB_USER", "pitstop")
    password = os.getenv("DB_PASSWORD", "pitstop_dev_password")
    redis_password = os.getenv("REDIS_PASSWORD", "redis_dev_password")
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = os.getenv("REDIS_PORT", "6379")
    return Settings(
        database_dsn=f"host={host} port={port} dbname={name} user={user} password={password}",
        redis_url=f"redis://:{redis_password}@{redis_host}:{redis_port}/0",
        openf1_base_url=os.getenv("OPENF1_BASE_URL", "https://api.openf1.org/v1").rstrip("/"),
        openf1_token=os.getenv("OPENF1_TOKEN") or None,
        poll_seconds=max(3.0, float(os.getenv("LIVE_POLL_SECONDS", "5"))),
        worker_enabled=os.getenv("LIVE_WORKER_ENABLED", "true").lower() in {"1", "true", "yes"},
        internal_token=os.getenv("ML_INTERNAL_TOKEN", "pitstop-development-ml-internal-token"),
        fastf1_cache=os.getenv("FASTF1_CACHE", "/app/cache"),
        lookback_minutes=max(1, int(os.getenv("LIVE_LOOKBACK_MINUTES", "10"))),
    )
