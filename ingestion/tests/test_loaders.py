import pytest
from unittest.mock import MagicMock, patch
from datetime import date
from pitstop.loaders import load_drivers, load_constructors, load_races
from pitstop.ergast_client import DriverRecord, ConstructorRecord, RaceRecord
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

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        count = load_drivers(db_config, sample_drivers)

    assert count == 2
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

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        count = load_constructors(db_config, records)

    assert count == 1
    assert mock_cursor.execute.call_count == 1


def test_load_races_returns_count(db_config, sample_races):
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        count = load_races(db_config, sample_races)

    assert count == 1


def test_load_drivers_empty_list_returns_zero(db_config):
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)

    with patch("pitstop.loaders.get_cursor", return_value=mock_cursor):
        count = load_drivers(db_config, [])

    assert count == 0
    mock_cursor.execute.assert_not_called()