import xgboost as xgb
import pandas as pd
import numpy as np
import logging
import json
from pathlib import Path
from dataclasses import dataclass

from mlservice.api.schemas import MAX_GRID_SIZE
from mlservice.ml.features import FeatureEngineer, prepare_features, ENCODERS_PATH

logger = logging.getLogger(__name__)


@dataclass
class PredictionInput:
    driver_ref: str
    constructor_ref: str
    circuit_name: str
    driver_nationality: str
    constructor_nationality: str
    grid_position: int
    season_year: int
    round: int


@dataclass
class PredictionOutput:
    predicted_position: float
    predicted_position_rounded: int
    confidence_range_low: int
    confidence_range_high: int


class RacePredictor:
    def __init__(self, model_path: str):
        self._model_path = Path(model_path)
        self._model: xgb.XGBRegressor | None = None
        self._engineer: FeatureEngineer | None = None
        self._loaded = False
        self._confidence_margin = 3
        self._model_version = "unknown"

    def load(self) -> None:
        if not self._model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {self._model_path}. "
                f"Run training first: python -m mlservice.ml.trainer"
            )

        self._model = xgb.XGBRegressor()
        self._model.load_model(str(self._model_path))

        self._engineer = FeatureEngineer()
        self._engineer.load(ENCODERS_PATH)

        metadata_path = self._model_path.with_suffix(".metadata.json")
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
            self._confidence_margin = int(metadata.get("confidence_margin", 3))
            self._model_version = str(metadata.get("model_version", "unknown"))

        self._loaded = True
        logger.info("Model loaded from %s", self._model_path)

    def predict(self, inputs: list[PredictionInput]) -> list[PredictionOutput]:
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        rows = [
            {
                "grid_position": inp.grid_position,
                "driver_ref": inp.driver_ref,
                "constructor_ref": inp.constructor_ref,
                "circuit_name": inp.circuit_name,
                "driver_nationality": inp.driver_nationality,
                "constructor_nationality": inp.constructor_nationality,
                "season_year": inp.season_year,
                "round": inp.round,
            }
            for inp in inputs
        ]

        df = pd.DataFrame(rows)
        X, _ = prepare_features(df, self._engineer, fit=False)

        raw_predictions = self._model.predict(X)

        outputs = []
        for pred in raw_predictions:
            pred_clipped = float(np.clip(pred, 1, MAX_GRID_SIZE))
            pred_rounded = int(round(pred_clipped))
            margin = self._confidence_margin
            outputs.append(PredictionOutput(
                predicted_position=round(pred_clipped, 2),
                predicted_position_rounded=pred_rounded,
                confidence_range_low=max(1, pred_rounded - margin),
                confidence_range_high=min(MAX_GRID_SIZE, pred_rounded + margin),
            ))

        return outputs

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def model_version(self) -> str:
        return self._model_version
