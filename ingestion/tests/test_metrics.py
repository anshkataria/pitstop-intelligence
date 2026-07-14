from urllib.request import urlopen

from pitstop.loaders import LoadStats
from pitstop.metrics import IngestionMetrics, start_metrics_server
from pitstop.pipeline import PipelineResult


def test_metrics_expose_run_status_counts_and_record_totals():
    metrics = IngestionMetrics()
    metrics.set_started(100)
    metrics.set_next_run(200)
    metrics.record_result(
        PipelineResult(1, "SUCCESS", LoadStats(inserted=8, updated=3, skipped=2), [], 12.5),
        150,
    )

    output = metrics.render()

    assert 'pitstop_ingestion_runs_total{status="success"} 1' in output
    assert "pitstop_ingestion_last_success_timestamp_seconds 150" in output
    assert 'pitstop_ingestion_last_run_records{operation="inserted"} 8' in output
    assert "pitstop_ingestion_next_run_timestamp_seconds 200" in output


def test_metrics_http_endpoint_is_scrapeable():
    metrics = IngestionMetrics()
    server = start_metrics_server(0, metrics)
    try:
        with urlopen(f"http://127.0.0.1:{server.server_port}/metrics", timeout=2) as response:
            payload = response.read().decode("utf-8")
        assert response.status == 200
        assert "pitstop_ingestion_last_run_success 1" in payload
    finally:
        server.shutdown()
        server.server_close()
