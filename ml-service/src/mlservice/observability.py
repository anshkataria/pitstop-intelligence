import json
import logging
import re
from contextvars import ContextVar
from datetime import datetime, timezone
from uuid import uuid4

from prometheus_client import Counter, Gauge, Histogram, Info

REQUEST_ID_HEADER = "X-Request-ID"
request_id_context: ContextVar[str] = ContextVar("request_id", default="-")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

HTTP_REQUESTS = Counter(
    "pitstop_ml_http_requests_total",
    "FastAPI requests by method, route and status",
    ("method", "route", "status"),
)
HTTP_DURATION = Histogram(
    "pitstop_ml_http_request_duration_seconds",
    "FastAPI request duration by method and route",
    ("method", "route"),
)
MODEL_LOADED = Gauge(
    "pitstop_ml_model_loaded",
    "Whether a race prediction model is loaded",
)
MODEL_INFO = Info(
    "pitstop_ml_model",
    "Metadata about the active race prediction model",
)
PREDICTIONS = Counter(
    "pitstop_ml_predictions_total",
    "Prediction runs by outcome",
    ("outcome",),
)
PREDICTED_POSITION = Histogram(
    "pitstop_ml_predicted_position",
    "Distribution of predicted finishing positions",
    buckets=tuple(range(1, 22)),
)


def normalize_request_id(candidate: str | None) -> str:
    if candidate and _SAFE_REQUEST_ID.fullmatch(candidate):
        return candidate
    return str(uuid4())


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        document = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "pitstop-ml-service",
            "logger": record.name,
            "requestId": request_id_context.get(),
            "message": record.getMessage(),
        }
        for name in ("http_method", "http_route", "http_status", "duration_ms"):
            value = getattr(record, name, None)
            if value is not None:
                document[name] = value
        if record.exc_info:
            document["exception"] = self.formatException(record.exc_info)
        return json.dumps(document, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
