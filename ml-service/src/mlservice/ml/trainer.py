import mlflow
import mlflow.xgboost
import xgboost as xgb
import pandas as pd
import numpy as np
import logging
import sys
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

from mlservice.config import Settings, get_settings
from mlservice.data.fetcher import fetch_training_data
from mlservice.ml.features import FeatureEngineer, prepare_features

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)

MODEL_PARAMS = {
    "n_estimators": 300,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "objective": "reg:squarederror",
    "random_state": 42,
    "n_jobs": -1,
}


def train(settings: Settings) -> dict:
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.experiment_name)

    logger.info("Fetching training data from database")
    df = fetch_training_data(settings)

    if len(df) < 100:
        raise ValueError(
            f"Insufficient training data: {len(df)} rows. "
            f"Run the ingestion pipeline first."
        )

    engineer = FeatureEngineer()
    X, y = prepare_features(df, engineer, fit=True)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    logger.info(
        "Train rows: %d, Val rows: %d, Features: %d",
        len(X_train), len(X_val), X_train.shape[1],
    )

    with mlflow.start_run() as run:
        mlflow.log_params(MODEL_PARAMS)
        mlflow.log_param("train_rows", len(X_train))
        mlflow.log_param("val_rows", len(X_val))
        mlflow.log_param("feature_count", X_train.shape[1])

        model = xgb.XGBRegressor(**MODEL_PARAMS)
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        y_pred = model.predict(X_val)

        mae = mean_absolute_error(y_val, y_pred)
        rmse = float(np.sqrt(mean_squared_error(y_val, y_pred)))
        within_3 = float(np.mean(np.abs(y_pred - y_val) <= 3))
        confidence_margin = max(1, int(np.ceil(np.quantile(np.abs(y_pred - y_val), 0.90))))

        mlflow.log_metric("mae", mae)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("within_3_positions", within_3)
        mlflow.log_metric("confidence_margin_90", confidence_margin)

        logger.info("MAE: %.3f  RMSE: %.3f  Within3: %.3f", mae, rmse, within_3)

        model_path = Path(settings.model_path)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        model.get_booster().save_model(str(model_path))

        metadata = {
            "model_version": run.info.run_id,
            "confidence_level": 0.90,
            "confidence_margin": confidence_margin,
            "mae": float(mae),
            "rmse": rmse,
            "within_3_positions": within_3,
        }
        metadata_path = model_path.with_suffix(".metadata.json")
        metadata_path.write_text(json.dumps(metadata, indent=2))

        engineer.save()

        mlflow.xgboost.log_model(model, artifact_path="model")
        mlflow.log_artifact(str(model_path), artifact_path="artifacts")
        mlflow.log_artifact(str(metadata_path), artifact_path="artifacts")

        logger.info("Model saved to %s", model_path)
        logger.info("MLflow run complete")
        return metadata


if __name__ == "__main__":
    train(get_settings())
