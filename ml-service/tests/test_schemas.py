import pytest
from pydantic import ValidationError
from mlservice.api.schemas import PredictionRequest, DriverEntry


def make_entry(**overrides):
    base = {
        "driver_ref": "hamilton",
        "constructor_ref": "mercedes",
        "circuit_name": "Bahrain International Circuit",
        "driver_nationality": "British",
        "constructor_nationality": "German",
        "grid_position": 1,
        "season_year": 2024,
        "round": 1,
    }
    return {**base, **overrides}


def test_valid_prediction_request_is_accepted():
    req = PredictionRequest(entries=[DriverEntry(**make_entry())])
    assert len(req.entries) == 1


def test_grid_position_out_of_range_raises():
    with pytest.raises(ValidationError):
        DriverEntry(**make_entry(grid_position=0))

    with pytest.raises(ValidationError):
        DriverEntry(**make_entry(grid_position=21))


def test_empty_entries_raises():
    with pytest.raises(ValidationError):
        PredictionRequest(entries=[])


def test_duplicate_driver_refs_raises():
    entry1 = DriverEntry(**make_entry(driver_ref="hamilton"))
    entry2 = DriverEntry(**make_entry(driver_ref="hamilton"))
    with pytest.raises(ValidationError, match="Duplicate driver_ref"):
        PredictionRequest(entries=[entry1, entry2])


def test_multiple_unique_drivers_accepted():
    entry1 = DriverEntry(**make_entry(driver_ref="hamilton"))
    entry2 = DriverEntry(**make_entry(driver_ref="verstappen", grid_position=2))
    req = PredictionRequest(entries=[entry1, entry2])
    assert len(req.entries) == 2