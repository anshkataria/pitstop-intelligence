from collections import defaultdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock, Thread
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pitstop.pipeline import PipelineResult


class IngestionMetrics:
    def __init__(self) -> None:
        self._lock = Lock()
        self.run_counts: dict[str, int] = defaultdict(int)
        self.last_run = 0.0
        self.last_success = 0.0
        self.last_run_success = 1
        self.last_duration = 0.0
        self.last_records = {"inserted": 0, "updated": 0, "skipped": 0}
        self.scheduler_started = 0.0
        self.next_run = 0.0

    def set_started(self, timestamp: float) -> None:
        with self._lock:
            self.scheduler_started = timestamp

    def set_next_run(self, timestamp: float) -> None:
        with self._lock:
            self.next_run = timestamp

    def record_failure(self, timestamp: float) -> None:
        with self._lock:
            self.run_counts["failed"] += 1
            self.last_run = timestamp
            self.last_run_success = 0

    def record_result(self, result: "PipelineResult", timestamp: float) -> None:
        status = result.status.lower()
        with self._lock:
            self.run_counts[status] += 1
            self.last_run = timestamp
            self.last_run_success = int(result.status == "SUCCESS")
            self.last_duration = result.duration_seconds
            self.last_records = {
                "inserted": result.stats.inserted,
                "updated": result.stats.updated,
                "skipped": result.stats.skipped,
            }
            if result.status == "SUCCESS":
                self.last_success = timestamp

    def render(self) -> str:
        with self._lock:
            lines = [
                "# HELP pitstop_ingestion_runs_total Completed ingestion runs.",
                "# TYPE pitstop_ingestion_runs_total counter",
            ]
            lines.extend(
                f'pitstop_ingestion_runs_total{{status="{status}"}} {count}'
                for status, count in sorted(self.run_counts.items())
            )
            lines.extend([
                "# TYPE pitstop_ingestion_last_run_timestamp_seconds gauge",
                f"pitstop_ingestion_last_run_timestamp_seconds {self.last_run}",
                "# TYPE pitstop_ingestion_last_success_timestamp_seconds gauge",
                f"pitstop_ingestion_last_success_timestamp_seconds {self.last_success}",
                "# TYPE pitstop_ingestion_last_run_success gauge",
                f"pitstop_ingestion_last_run_success {self.last_run_success}",
                "# TYPE pitstop_ingestion_last_run_duration_seconds gauge",
                f"pitstop_ingestion_last_run_duration_seconds {self.last_duration}",
            ])
            lines.extend(
                f'pitstop_ingestion_last_run_records{{operation="{operation}"}} {value}'
                for operation, value in self.last_records.items()
            )
            lines.extend([
                "# TYPE pitstop_ingestion_scheduler_started_timestamp_seconds gauge",
                f"pitstop_ingestion_scheduler_started_timestamp_seconds {self.scheduler_started}",
                "# TYPE pitstop_ingestion_next_run_timestamp_seconds gauge",
                f"pitstop_ingestion_next_run_timestamp_seconds {self.next_run}",
            ])
            return "\n".join(lines) + "\n"


def start_metrics_server(port: int, metrics: IngestionMetrics) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path not in {"/", "/metrics"}:
                self.send_error(404)
                return
            payload = metrics.render().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, *_: object) -> None:
            return

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    Thread(target=server.serve_forever, daemon=True, name="ingestion-metrics").start()
    return server
