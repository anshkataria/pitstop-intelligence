import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, Header

from mlservice.api.schemas import (
    PredictionRequest,
    PredictionResponse,
    PredictionResult,
    HealthResponse,
    TrainResponse,
)
from mlservice.ml.predictor import RacePredictor, PredictionInput
from mlservice.ml.trainer import train
from mlservice.config import Settings, get_settings
from mlservice.data.prediction_store import save_prediction
from mlservice.observability import (
    MODEL_INFO,
    MODEL_LOADED,
    PREDICTED_POSITION,
    PREDICTIONS,
)

logger = logging.getLogger(__name__)

router = APIRouter()

TRAINING_TOKEN_HEADER = "X-Pitstop-Internal-Token"


def require_training_token(
    token: Annotated[str | None, Header(alias=TRAINING_TOKEN_HEADER)] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    if token is None or not secrets.compare_digest(token, settings.ml_internal_token):
        raise HTTPException(status_code=403, detail="Model training is not permitted")


def get_predictor(settings: Settings = Depends(get_settings)) -> RacePredictor:
    from mlservice.api.main import predictor
    return predictor


@router.get("/health", response_model=HealthResponse)
def health(predictor: RacePredictor = Depends(get_predictor)):
    return HealthResponse(
        status="UP",
        model_loaded=predictor.is_loaded,
    )


@router.post("/predict", response_model=PredictionResponse)
def predict(
    request: PredictionRequest,
    predictor: RacePredictor = Depends(get_predictor),
    settings: Settings = Depends(get_settings),
):
    if not predictor.is_loaded:
        PREDICTIONS.labels("model_unavailable").inc()
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. POST /train first.",
        )

    inputs = [
        PredictionInput(
            driver_ref=e.driver_ref,
            constructor_ref=e.constructor_ref,
            circuit_name=e.circuit_name,
            driver_nationality=e.driver_nationality,
            constructor_nationality=e.constructor_nationality,
            grid_position=e.grid_position,
            season_year=e.season_year,
            round=e.round,
        )
        for e in request.entries
    ]

    try:
        outputs = predictor.predict(inputs)
    except Exception as exc:
        PREDICTIONS.labels("inference_error").inc()
        logger.error("Prediction failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed")

    results = [
        PredictionResult(
            driver_ref=entry.driver_ref,
            constructor_ref=entry.constructor_ref,
            grid_position=entry.grid_position,
            predicted_position=output.predicted_position,
            predicted_position_rounded=output.predicted_position_rounded,
            confidence_range_low=output.confidence_range_low,
            confidence_range_high=output.confidence_range_high,
        )
        for entry, output in zip(request.entries, outputs)
    ]

    try:
        run_id = save_prediction(settings, inputs, outputs, predictor.model_version)
    except Exception as exc:
        PREDICTIONS.labels("storage_error").inc()
        logger.error("Could not save prediction history: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction succeeded but history could not be saved")

    PREDICTIONS.labels("success").inc()
    for output in outputs:
        PREDICTED_POSITION.observe(output.predicted_position)

    return PredictionResponse(
        prediction_run_id=run_id,
        predictions=results,
        model_loaded=predictor.is_loaded,
        model_version=predictor.model_version,
    )


@router.post("/train", response_model=TrainResponse)
def trigger_training(
    _: None = Depends(require_training_token),
    settings: Settings = Depends(get_settings),
    predictor: RacePredictor = Depends(get_predictor),
):
    try:
        metadata = train(settings)
        predictor.load()
        MODEL_LOADED.set(1)
        MODEL_INFO.info({"version": predictor.model_version or "unknown"})
        return TrainResponse(
            status="success",
            message="Model trained and saved successfully",
            model_version=metadata["model_version"],
            confidence_margin=metadata["confidence_margin"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Training failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Training failed")
