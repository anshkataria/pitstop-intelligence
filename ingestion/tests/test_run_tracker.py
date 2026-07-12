from unittest.mock import MagicMock, patch

from pitstop.config import DatabaseConfig
from pitstop.loaders import LoadStats
from pitstop.run_tracker import RunOutcome, finish_run, start_run


def config() -> DatabaseConfig:
    return DatabaseConfig("localhost", 5432, "pitstop_test", "pitstop", "test")


def cursor():
    value = MagicMock()
    value.__enter__ = MagicMock(return_value=value)
    value.__exit__ = MagicMock(return_value=False)
    return value


def test_start_run_returns_database_identifier():
    mock_cursor = cursor()
    mock_cursor.fetchone.return_value = {"id": 42}
    with patch("pitstop.run_tracker.get_cursor", return_value=mock_cursor):
        run_id = start_run(config(), [2023, 2024])
    assert run_id == 42


def test_finish_run_marks_partial_and_records_counts():
    mock_cursor = cursor()
    outcome = RunOutcome(LoadStats(inserted=10, updated=5, skipped=2), [2023], ["failed"])
    with patch("pitstop.run_tracker.get_cursor", return_value=mock_cursor):
        status = finish_run(config(), 42, outcome)
    assert status == "PARTIAL"
    parameters = mock_cursor.execute.call_args.args[1]
    assert parameters[1:5] == (10, 5, 2, 1)
