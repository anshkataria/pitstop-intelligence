# ML prediction service

This service is the Python inference and training plane for race position predictions. It exposes
a FastAPI app backed by an XGBoost regressor tracked with MLflow, and is only ever called by
Spring — the browser never talks to it directly.

## Endpoints

- `GET /health` — reports service status and whether a model is currently loaded.
- `POST /predict` — accepts a batch of driver/constructor/circuit entries and returns predicted
  finishing positions with a 90% confidence range. Requires a trained model; returns `503` if none
  is loaded yet. Every prediction is persisted for later accuracy tracking.
- `POST /train` — retrains the model from the current database contents and hot-swaps it into the
  running service. Protected by the `X-Pitstop-Internal-Token` header, which must match
  `ML_INTERNAL_TOKEN`; requests without a matching token get `403`.

## Training

Training pulls historical race data straight from PostgreSQL, so the ingestion pipeline must have
loaded at least `MIN_SEASONS_FOR_TRAINING` seasons first — `train()` raises if fewer than 100 rows
are available. Each run:

- engineers features via `FeatureEngineer` (`ml/features.py`);
- fits an `XGBRegressor` with a fixed hyperparameter set (`ml/trainer.py`);
- logs params, metrics (MAE, RMSE, within-3-positions accuracy, 90th-percentile confidence margin)
  and artifacts to MLflow under the `f1_race_position` experiment;
- writes the booster to `MODEL_PATH` plus a `.metadata.json` sidecar, and saves the fitted feature
  encoder alongside it.

Trigger it manually:

```bash
curl -X POST http://localhost:8000/train \
  -H "X-Pitstop-Internal-Token: <ML_INTERNAL_TOKEN>"
```

MLflow run data is written to `MLFLOW_TRACKING_URI` (defaults to `./mlruns`) and mounted as a
Docker volume in the Compose stack so history survives container restarts.

## Configuration

Settings load from environment variables / the service `.env` file (`config.py`):

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection for fetching training data and storing predictions |
| `MLFLOW_TRACKING_URI` | Where MLflow writes experiment runs |
| `MODEL_PATH` | Where the trained booster and its metadata are saved/loaded |
| `EXPERIMENT_NAME` | MLflow experiment name |
| `MIN_SEASONS_FOR_TRAINING` | Minimum ingested seasons required before training is considered valid |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call this service directly (dev only) |
| `ML_INTERNAL_TOKEN` | Shared secret Spring must present to trigger `/train` |

## Tests

```bash
pytest
```

Covers config loading, observability metrics, prediction storage, the predictor and its schemas,
and both the training flow and its authorization check.
