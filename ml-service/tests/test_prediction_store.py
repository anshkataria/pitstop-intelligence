from unittest.mock import MagicMock, patch

from mlservice.config import Settings
from mlservice.data.prediction_store import save_prediction
from mlservice.ml.predictor import PredictionInput, PredictionOutput


def test_save_prediction_persists_run_and_results():
    connection = MagicMock()
    cursor = MagicMock()
    connection.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.return_value = (42,)
    entry = PredictionInput("norris", "mclaren", "Albert Park", "British", "British", 1, 2024, 3)
    output = PredictionOutput(1.4, 1, 1, 4)

    with patch("mlservice.data.prediction_store.psycopg2.connect", return_value=connection):
        run_id = save_prediction(Settings(), [entry], [output], "model-v1")

    assert run_id == 42
    assert cursor.execute.call_count == 2
    connection.commit.assert_called_once()
    connection.rollback.assert_not_called()
