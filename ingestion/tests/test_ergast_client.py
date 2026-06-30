import pytest
import responses as responses_lib
from pitstop.ergast_client import ErgastClient, DriverRecord, RaceRecord
from pitstop.config import ErgastConfig


@pytest.fixture
def config():
    return ErgastConfig(
        base_url="http://ergast.com/api/f1",
        seasons=[2024],
    )


@pytest.fixture
def client(config):
    return ErgastClient(config)


@responses_lib.activate
def test_fetch_drivers_returns_records(client):
    responses_lib.add(
        responses_lib.GET,
        "http://ergast.com/api/f1/2024/drivers.json",
        json={
            "MRData": {
                "DriverTable": {
                    "Drivers": [
                        {
                            "driverId": "hamilton",
                            "givenName": "Lewis",
                            "familyName": "Hamilton",
                            "nationality": "British",
                            "dateOfBirth": "1985-01-07",
                        }
                    ]
                }
            }
        },
        status=200,
    )

    records = client.fetch_drivers(2024)

    assert len(records) == 1
    assert records[0].driver_ref == "hamilton"
    assert records[0].first_name == "Lewis"
    assert records[0].last_name == "Hamilton"
    assert records[0].nationality == "British"


@responses_lib.activate
def test_fetch_drivers_handles_missing_dob(client):
    responses_lib.add(
        responses_lib.GET,
        "http://ergast.com/api/f1/2024/drivers.json",
        json={
            "MRData": {
                "DriverTable": {
                    "Drivers": [
                        {
                            "driverId": "test_driver",
                            "givenName": "Test",
                            "familyName": "Driver",
                        }
                    ]
                }
            }
        },
        status=200,
    )

    records = client.fetch_drivers(2024)

    assert records[0].date_of_birth is None
    assert records[0].nationality is None


@responses_lib.activate
def test_fetch_races_returns_records(client):
    responses_lib.add(
        responses_lib.GET,
        "http://ergast.com/api/f1/2024.json",
        json={
            "MRData": {
                "RaceTable": {
                    "Races": [
                        {
                            "season": "2024",
                            "round": "1",
                            "raceName": "Bahrain Grand Prix",
                            "date": "2024-03-02",
                            "Circuit": {
                                "circuitName": "Bahrain International Circuit",
                                "Location": {"country": "Bahrain"},
                            },
                        }
                    ]
                }
            }
        },
        status=200,
    )

    records = client.fetch_races(2024)

    assert len(records) == 1
    assert records[0].season_year == 2024
    assert records[0].round == 1
    assert records[0].name == "Bahrain Grand Prix"
    assert records[0].country == "Bahrain"


@responses_lib.activate
def test_fetch_races_handles_missing_date(client):
    responses_lib.add(
        responses_lib.GET,
        "http://ergast.com/api/f1/2024.json",
        json={
            "MRData": {
                "RaceTable": {
                    "Races": [
                        {
                            "season": "2024",
                            "round": "1",
                            "raceName": "Test Race",
                            "Circuit": {
                                "circuitName": "Test Circuit",
                                "Location": {"country": "Testland"},
                            },
                        }
                    ]
                }
            }
        },
        status=200,
    )

    records = client.fetch_races(2024)

    assert records[0].race_date is None