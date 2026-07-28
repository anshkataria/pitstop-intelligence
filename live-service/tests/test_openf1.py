import responses

from liveservice.openf1 import OpenF1Client


@responses.activate
def test_latest_session_uses_openf1_latest_filter():
    responses.get(
        "https://api.openf1.org/v1/sessions?session_key=latest",
        json=[{"session_key": 9999, "session_name": "Race"}],
    )
    session = OpenF1Client("https://api.openf1.org/v1").latest_session()
    assert session["session_key"] == 9999


@responses.activate
def test_session_data_returns_empty_list_on_404():
    responses.get(
        "https://api.openf1.org/v1/position?session_key=9999",
        status=404,
    )
    client = OpenF1Client("https://api.openf1.org/v1")
    assert client.session_data("position", 9999) == []


def test_rejects_unknown_provider_endpoint():
    client = OpenF1Client("https://api.openf1.org/v1")
    try:
        client.session_data("unknown", 1)
        assert False, "unknown endpoint should fail"
    except ValueError as exc:
        assert "Unsupported OpenF1 endpoint" in str(exc)
