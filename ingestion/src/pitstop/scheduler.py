import json
import logging
import os
import signal
import sys
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from time import time
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pitstop.metrics import IngestionMetrics, start_metrics_server
from pitstop.pipeline import PipelineResult, run

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

METRICS = IngestionMetrics()


@dataclass(frozen=True)
class SchedulerConfig:
    minute: int
    hour: int
    weekday: int | None
    timezone: ZoneInfo
    run_on_startup: bool
    metrics_port: int
    alert_webhook_url: str | None


def load_scheduler_config() -> SchedulerConfig:
    cron = os.getenv("INGESTION_CRON", "0 3 * * 1")
    parts = cron.split()
    if len(parts) != 5 or parts[2:4] != ["*", "*"]:
        raise ValueError("INGESTION_CRON must use 'minute hour * * weekday' format")
    try:
        minute = int(parts[0])
        hour = int(parts[1])
        weekday = None if parts[4] == "*" else int(parts[4])
    except ValueError as exc:
        raise ValueError("INGESTION_CRON minute, hour and weekday must be numbers or '*'") from exc
    if not 0 <= minute <= 59 or not 0 <= hour <= 23 or weekday not in (*range(7), None):
        raise ValueError("INGESTION_CRON contains an out-of-range value")
    timezone_name = os.getenv("INGESTION_TIMEZONE", "UTC")
    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown INGESTION_TIMEZONE: {timezone_name}") from exc
    return SchedulerConfig(
        minute=minute,
        hour=hour,
        weekday=weekday,
        timezone=timezone,
        run_on_startup=os.getenv("INGESTION_RUN_ON_STARTUP", "false").lower() in {"1", "true", "yes"},
        metrics_port=int(os.getenv("INGESTION_METRICS_PORT", "9101")),
        alert_webhook_url=os.getenv("INGESTION_ALERT_WEBHOOK_URL") or None,
    )


def next_run_time(config: SchedulerConfig, now: datetime) -> datetime:
    local_now = now.astimezone(config.timezone)
    candidate = local_now.replace(hour=config.hour, minute=config.minute, second=0, microsecond=0)
    if candidate <= local_now:
        candidate += timedelta(days=1)
    if config.weekday is not None:
        # Cron uses Sunday=0; datetime uses Monday=0.
        python_weekday = (config.weekday - 1) % 7
        candidate += timedelta(days=(python_weekday - candidate.weekday()) % 7)
    return candidate


def send_alert(config: SchedulerConfig, event: str, message: str, result: PipelineResult | None = None) -> None:
    if not config.alert_webhook_url:
        return
    payload = {
        "event": event,
        "service": "pitstop-ingestion",
        "message": message,
        "timestamp": datetime.now(config.timezone).isoformat(),
        "runId": result.run_id if result else None,
        "status": result.status if result else "FAILED",
    }
    request = Request(
        config.alert_webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 300:
                logger.error("Alert webhook returned HTTP %d", response.status)
    except Exception:
        logger.exception("Unable to deliver ingestion alert webhook")


def execute_scheduled_run(config: SchedulerConfig, previous_run_failed: bool) -> bool:
    logger.info("Starting scheduled ingestion")
    try:
        result = run()
    except Exception as exc:
        METRICS.record_failure(time())
        logger.exception("Scheduled ingestion failed")
        send_alert(config, "ingestion.failed", f"Ingestion failed: {type(exc).__name__}: {exc}")
        return True

    completed_at = time()
    METRICS.record_result(result, completed_at)
    failed = result.status != "SUCCESS"
    if failed:
        send_alert(
            config,
            "ingestion.partial",
            f"Ingestion completed with failed seasons: {result.failed_seasons}",
            result,
        )
    else:
        if previous_run_failed:
            send_alert(config, "ingestion.recovered", "Ingestion completed successfully again", result)
    return failed


def main() -> None:
    config = load_scheduler_config()
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    start_metrics_server(config.metrics_port, METRICS)
    METRICS.set_started(time())
    logger.info(
        "Scheduler ready: %02d:%02d, weekday=%s, timezone=%s, metrics=:%d",
        config.hour,
        config.minute,
        config.weekday if config.weekday is not None else "daily",
        config.timezone.key,
        config.metrics_port,
    )
    previous_run_failed = False
    if config.run_on_startup:
        previous_run_failed = execute_scheduled_run(config, previous_run_failed)
    while not stop.is_set():
        scheduled_for = next_run_time(config, datetime.now(config.timezone))
        METRICS.set_next_run(scheduled_for.timestamp())
        logger.info("Next ingestion scheduled for %s", scheduled_for.isoformat())
        if stop.wait(max(0, scheduled_for.timestamp() - time())):
            break
        previous_run_failed = execute_scheduled_run(config, previous_run_failed)
    logger.info("Ingestion scheduler stopped")


if __name__ == "__main__":
    main()
