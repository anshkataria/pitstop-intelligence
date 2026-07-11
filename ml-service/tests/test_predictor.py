import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from mlservice.ml.features import FeatureEngineer, prepare_features, FEATURE_COLS
from mlservice.ml.predictor import RacePredictor, PredictionInput


@pytest.fixture
def sample_df():
    return pd.DataFrame([
        {
            "grid_position": 1,
            "finish_position": 1,
            "driver_ref": "hamilton",
            "constructor_ref": "mercedes",
            "circuit_name": "Bahrain International Circuit",
            "driver_nationality": "British",
            "constructor_nationality": "German",
            "season_year": 2023,
            "round": 1,
        },
        {
            "grid_position": 3,
            "finish_position": 5,
            "driver_ref": "verstappen",
            "constructor_ref": "red_bull",
            "circuit_name": "Bahrain International Circuit",
            "driver_nationality": "Dutch",
            "constructor_nationality": "Austrian",
            "season_year": 2023,
            "round": 1,
        },
        {
            "grid_position": 2,
            "finish_position": 2,
            "driver_ref": "leclerc",
            "constructor_ref": "ferrari",
            "circuit_name": "Monaco Grand Prix Circuit",
            "driver_nationality": "Monegasque",
            "constructor_nationality": "Italian",
            "season_year": 2023,
            "round": 2,
        },
    ])


def test_feature_engineer_fit_transform_produces_expected_columns(sample_df):
    engineer = FeatureEngineer()
    result = engineer.fit_transform(sample_df)
    for col in FEATURE_COLS:
        assert col in result.columns, f"Missing feature column: {col}"


def test_feature_engineer_transform_handles_unseen_values(sample_df):
    engineer = FeatureEngineer()
    engineer.fit_transform(sample_df)
    unseen_df = pd.DataFrame([{
        "grid_position": 10,
        "finish_position": 10,
        "driver_ref": "brand_new_driver",
        "constructor_ref": "new_team",
        "circuit_name": "New Circuit",
        "driver_nationality": "Unknown",
        "constructor_nationality": "Unknown",
        "season_year": 2025,
        "round": 5,
    }])
    result = engineer.transform(unseen_df)
    assert "driver_encoded" in result.columns


def test_prepare_features_returns_correct_shape(sample_df):
    engineer = FeatureEngineer()
    X, y = prepare_features(sample_df, engineer, fit=True)
    assert X.shape == (3, len(FEATURE_COLS))
    assert y is not None
    assert len(y) == 3


def test_prepare_features_columns_match_feature_cols(sample_df):
    engineer = FeatureEngineer()
    X, _ = prepare_features(sample_df, engineer, fit=True)
    assert list(X.columns) == FEATURE_COLS


def test_predictor_raises_when_not_loaded():
    predictor = RacePredictor(model_path="./models/nonexistent.json")
    with pytest.raises(RuntimeError, match="Model not loaded"):
        predictor.predict([])


def test_predictor_is_loaded_false_before_load():
    predictor = RacePredictor(model_path="./models/nonexistent.json")
    assert predictor.is_loaded is False


def test_predictor_load_raises_when_file_missing():
    predictor = RacePredictor(model_path="./models/does_not_exist.json")
    with pytest.raises(FileNotFoundError):
        predictor.load()