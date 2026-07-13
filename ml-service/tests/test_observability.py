import json
import logging

from mlservice.observability import JsonLogFormatter, normalize_request_id, request_id_context


def test_request_id_validation_preserves_safe_values_and_replaces_unsafe_values():
    assert normalize_request_id("nginx-request_42") == "nginx-request_42"
    assert normalize_request_id("unsafe value") != "unsafe value"


def test_json_formatter_includes_service_and_request_id():
    token = request_id_context.set("request-7")
    try:
        record = logging.LogRecord("test", logging.INFO, __file__, 1, "ready", (), None)
        document = json.loads(JsonLogFormatter().format(record))
    finally:
        request_id_context.reset(token)

    assert document["service"] == "pitstop-ml-service"
    assert document["requestId"] == "request-7"
    assert document["message"] == "ready"
