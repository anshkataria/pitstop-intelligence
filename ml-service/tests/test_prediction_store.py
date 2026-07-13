from unittest.mock import MagicMock, patch

from mlservice.config import Settings
from mlservice.data.prediction_store import save_prediction
from mlservice.ml.predictor import PredictionInput, PredictionOutput
import pytest


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


def test_save_prediction_rolls_back_and_closes_connection_on_failure():
    connection = MagicMock()
    cursor = MagicMock()
    connection.cursor.return_value.__enter__.return_value = cursor
    cursor.execute.side_effect = RuntimeError("database unavailable")
    entry = PredictionInput("norris", "mclaren", "Albert Park", "British", "British", 1, 2024, 3)
    output = PredictionOutput(1.4, 1, 1, 4)

    with patch("mlservice.data.prediction_store.psycopg2.connect", return_value=connection):
        with pytest.raises(RuntimeError, match="database unavailable"):
            save_prediction(Settings(), [entry], [output], "model-v1")

    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()
    connection.close.assert_called_once()
