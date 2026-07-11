import logging
from fastapi import APIRouter, HTTPException, Depends

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

logger = logging.getLogger(__name__)

router = APIRouter()


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
):
    if not predictor.is_loaded:
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

    return PredictionResponse(
        predictions=results,
        model_loaded=predictor.is_loaded,
    )


@router.post("/train", response_model=TrainResponse)
def trigger_training(settings: Settings = Depends(get_settings)):
    try:
        train(settings)
        return TrainResponse(
            status="success",
            message="Model trained and saved successfully",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Training failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Training failed")