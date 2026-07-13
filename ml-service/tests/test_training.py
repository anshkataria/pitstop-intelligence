import pandas as pd
import pytest
from unittest.mock import patch

from mlservice.config import Settings
from mlservice.ml.trainer import train


def test_training_rejects_insufficient_historical_rows():
    data = pd.DataFrame([{"finish_position": 1}] * 99)
    with patch("mlservice.ml.trainer.fetch_training_data", return_value=data):
        with pytest.raises(ValueError, match="Insufficient training data: 99 rows"):
            train(Settings())
