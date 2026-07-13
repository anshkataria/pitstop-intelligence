from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from mlservice.api.routes import get_predictor, router
from mlservice.config import Settings, get_settings


class StubPredictor:
    model_version = "model-test"

    def load(self):
        pass


def client() -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/v1")
    app.dependency_overrides[get_settings] = lambda: Settings(
        ml_internal_token="expected-private-token"
    )
    app.dependency_overrides[get_predictor] = lambda: StubPredictor()
    return TestClient(app)


def test_training_rejects_a_missing_internal_token():
    response = client().post("/v1/train", json={})

    assert response.status_code == 403
    assert response.json()["detail"] == "Model training is not permitted"


def test_training_rejects_an_invalid_internal_token():
    response = client().post(
        "/v1/train",
        json={},
        headers={"X-Pitstop-Internal-Token": "wrong-token"},
    )

    assert response.status_code == 403


def test_training_accepts_the_configured_internal_token():
    metadata = {"model_version": "model-test", "confidence_margin": 3}

    with patch("mlservice.api.routes.train", return_value=metadata) as train:
        response = client().post(
            "/v1/train",
            json={},
            headers={"X-Pitstop-Internal-Token": "expected-private-token"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    train.assert_called_once()
