import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import pickle
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CATEGORICAL_COLS = [
    "driver_ref",
    "constructor_ref",
    "circuit_name",
    "driver_nationality",
    "constructor_nationality",
]

# Mapping from raw categorical columns to encoded feature names
ENCODED_COL_NAMES = {
    "driver_ref": "driver_encoded",
    "constructor_ref": "constructor_encoded",
    "circuit_name": "circuit_encoded",
    "driver_nationality": "driver_nationality_encoded",
    "constructor_nationality": "constructor_nationality_encoded",
}

FEATURE_COLS = [
    "grid_position",
    "driver_encoded",
    "constructor_encoded",
    "circuit_encoded",
    "driver_nationality_encoded",
    "constructor_nationality_encoded",
    "season_year",
    "round",
]

TARGET_COL = "finish_position"

ENCODERS_PATH = Path("./models/encoders.pkl")


class FeatureEngineer:
    def __init__(self):
        self._encoders: dict[str, LabelEncoder] = {}

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        result = df.copy()

        for col in CATEGORICAL_COLS:
            encoder = LabelEncoder()

            result[ENCODED_COL_NAMES[col]] = encoder.fit_transform(
                result[col].fillna("unknown").astype(str)
            )

            self._encoders[col] = encoder

        logger.info("Fitted encoders for columns: %s", CATEGORICAL_COLS)
        return result

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        result = df.copy()

        for col in CATEGORICAL_COLS:
            encoder = self._encoders.get(col)

            if encoder is None:
                raise ValueError(
                    f"Encoder for '{col}' not fitted. Call fit_transform first."
                )

            known_classes = set(encoder.classes_)

            result[col] = result[col].fillna("unknown").astype(str)
            result[col] = result[col].apply(
                lambda x: x if x in known_classes else "unknown"
            )

            if "unknown" not in known_classes:
                encoder.classes_ = np.append(encoder.classes_, "unknown")

            result[ENCODED_COL_NAMES[col]] = encoder.transform(result[col])

        return result

    def save(self, path: Path = ENCODERS_PATH) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "wb") as f:
            pickle.dump(self._encoders, f)

        logger.info("Saved encoders to %s", path)

    def load(self, path: Path = ENCODERS_PATH) -> None:
        with open(path, "rb") as f:
            self._encoders = pickle.load(f)

        logger.info("Loaded encoders from %s", path)


def prepare_features(
    df: pd.DataFrame,
    engineer: FeatureEngineer,
    fit: bool = False,
) -> tuple[pd.DataFrame, pd.Series | None]:
    if fit:
        df = engineer.fit_transform(df)
    else:
        df = engineer.transform(df)

    X = df[FEATURE_COLS].copy()
    y = df[TARGET_COL].copy() if TARGET_COL in df.columns else None

    return X, y