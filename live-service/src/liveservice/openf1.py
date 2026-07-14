from datetime import datetime, timezone
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class OpenF1Client:
    ENDPOINTS = ("drivers", "position", "intervals", "laps", "car_data", "location", "stints", "pit", "race_control", "weather")

    def __init__(self, base_url: str, token: str | None = None) -> None:
        self.base_url = base_url
        self.session = requests.Session()
        retry = Retry(total=3, backoff_factor=0.5, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=("GET",))
        self.session.mount("https://", HTTPAdapter(max_retries=retry))
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    def get(self, endpoint: str, **filters: Any) -> list[dict[str, Any]]:
        response = self.session.get(f"{self.base_url}/{endpoint}", params=filters, timeout=20)
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError(f"OpenF1 {endpoint} response was not a list")
        return payload

    def latest_session(self) -> dict[str, Any] | None:
        sessions = self.get("sessions", session_key="latest")
        return sessions[-1] if sessions else None

    def session_data(self, endpoint: str, session_key: int | str, since: datetime | None = None) -> list[dict[str, Any]]:
        if endpoint not in self.ENDPOINTS:
            raise ValueError(f"Unsupported OpenF1 endpoint: {endpoint}")
        filters: dict[str, Any] = {"session_key": session_key}
        if since and endpoint not in {"drivers", "stints", "laps"}:
            filters["date>"] = since.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        return self.get(endpoint, **filters)
