import pytest
from unittest.mock import MagicMock, patch
from datetime import date
from pitstop.loaders import load_drivers, load_constructors, load_races, load_race_results
from pitstop.ergast_client import DriverRecord, ConstructorRecord, RaceRecord, RaceResultRecord
from pitstop.config import DatabaseConfig


@pytest.fixture
def db_config():
    return DatabaseConfig(
        host="localhost",
        port=5432,
        name="pitstop_test",
        user="pitstop",
        password="test",
    )


@pytest.fixture
def sample_drivers():
    return [
        DriverRecord(
            driver_ref="hamilton",
            first_name="Lewis",
            last_name="Hamilton",
            nationality="British",
            date_of_birth=date(1985, 1, 7),
        ),
        DriverRecord(
            driver_ref="verstappen",
            first_name="Max",
            last_name="Verstappen",
            nationality="Dutch",
            date_of_birth=date(1997, 9, 30),
        ),
    ]


@pytest.fixture
def sample_races():
    return [
        RaceRecord(
            season_year=2024,
            round=1,
            name="Bahrain Grand Prix",
            circuit_name="Bahrain International Circuit",
            country="Bahrain",
            race_date=date(2024, 3, 2),
        )
    ]


def test_load_drivers_returns_count(db_config, sample_drivers):
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.side_effect = [{"inserted": True}, {"inserted": False}]

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_drivers(db_config, sample_drivers)

    assert stats.inserted == 1
    assert stats.updated == 1
    assert mock_cursor.execute.call_count == 2


def test_load_constructors_returns_count(db_config):
    records = [
        ConstructorRecord(
            constructor_ref="mercedes",
            name="Mercedes",
            nationality="German",
        )
    ]
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.return_value = {"inserted": True}

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_constructors(db_config, records)

    assert stats.inserted == 1
    assert mock_cursor.execute.call_count == 1


def test_load_races_returns_count(db_config, sample_races):
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.return_value = {"inserted": False}

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_races(db_config, sample_races)

    assert stats.updated == 1


def test_load_drivers_empty_list_returns_zero(db_config):
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_drivers(db_config, [])

    assert stats.processed == 0
    mock_cursor.execute.assert_not_called()


def test_invalid_driver_is_skipped_without_database_write(db_config):
    record = DriverRecord("", "", "", None, None)
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_drivers(db_config, [record])

    assert stats.skipped == 1
    mock_cursor.execute.assert_not_called()


def test_result_with_missing_reference_is_counted_as_skipped(db_config):
    record = RaceResultRecord(2024, 1, "unknown", "unknown", 1, 1, 25, "Finished")
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.return_value = None

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        stats = load_race_results(db_config, [record])

    assert stats.skipped == 1
    assert stats.processed == 0
