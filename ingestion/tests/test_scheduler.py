from datetime import datetime
import json
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from pitstop.loaders import LoadStats
from pitstop.metrics import IngestionMetrics
from pitstop.pipeline import PipelineResult
from pitstop.scheduler import SchedulerConfig, execute_scheduled_run, next_run_time, send_alert


def scheduler_config(weekday: int | None = 1) -> SchedulerConfig:
    return SchedulerConfig(
        minute=0,
        hour=3,
        weekday=weekday,
        timezone=ZoneInfo("Australia/Brisbane"),
        run_on_startup=False,
        metrics_port=9101,
        alert_webhook_url=None,
    )


def test_next_run_uses_cron_weekday_and_timezone():
    now = datetime(2026, 7, 14, 12, 0, tzinfo=ZoneInfo("Australia/Brisbane"))

    scheduled = next_run_time(scheduler_config(), now)

    assert scheduled.isoformat() == "2026-07-20T03:00:00+10:00"


def test_daily_schedule_moves_to_tomorrow_after_run_time():
    now = datetime(2026, 7, 14, 4, 0, tzinfo=ZoneInfo("Australia/Brisbane"))

    scheduled = next_run_time(scheduler_config(weekday=None), now)

    assert scheduled.isoformat() == "2026-07-15T03:00:00+10:00"


def test_successful_run_updates_metrics_and_sends_recovery_alert():
    result = PipelineResult(7, "SUCCESS", LoadStats(inserted=3), [], 4.2)
    metrics = IngestionMetrics()
    with (
        patch("pitstop.scheduler.run", return_value=result),
        patch("pitstop.scheduler.METRICS", metrics),
        patch("pitstop.scheduler.send_alert") as send_alert,
    ):
        failed = execute_scheduled_run(scheduler_config(), previous_run_failed=True)

    assert failed is False
    assert 'pitstop_ingestion_runs_total{status="success"} 1' in metrics.render()
    send_alert.assert_called_once()
    assert send_alert.call_args.args[1] == "ingestion.recovered"


def test_failed_run_updates_failure_metric_without_crashing_scheduler():
    metrics = IngestionMetrics()
    with (
        patch("pitstop.scheduler.run", side_effect=RuntimeError("source offline")),
        patch("pitstop.scheduler.METRICS", metrics),
        patch("pitstop.scheduler.send_alert") as send_alert,
    ):
        failed = execute_scheduled_run(scheduler_config(), previous_run_failed=False)

    assert failed is True
    assert 'pitstop_ingestion_runs_total{status="failed"} 1' in metrics.render()
    assert "pitstop_ingestion_last_run_success 0" in metrics.render()
    send_alert.assert_called_once()
    assert send_alert.call_args.args[1] == "ingestion.failed"


def test_webhook_receives_structured_failure_payload():
    config = SchedulerConfig(
        **{**scheduler_config().__dict__, "alert_webhook_url": "https://alerts.example.test/ingestion"}
    )
    response = MagicMock(status=202)
    response.__enter__.return_value = response
    response.__exit__.return_value = False

    with patch("pitstop.scheduler.urlopen", return_value=response) as urlopen:
        send_alert(config, "ingestion.failed", "source offline")

    request = urlopen.call_args.args[0]
    payload = json.loads(request.data)
    assert payload["event"] == "ingestion.failed"
    assert payload["service"] == "pitstop-ingestion"
    assert payload["message"] == "source offline"
