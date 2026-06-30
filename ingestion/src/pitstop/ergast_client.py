import requests
import logging
from dataclasses import dataclass
from datetime import date
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from pitstop.config import ErgastConfig

logger = logging.getLogger(__name__)


@dataclass
class DriverRecord:
    driver_ref: str
    first_name: str
    last_name: str
    nationality: str | None
    date_of_birth: date | None


@dataclass
class ConstructorRecord:
    constructor_ref: str
    name: str
    nationality: str | None


@dataclass
class RaceRecord:
    season_year: int
    round: int
    name: str
    circuit_name: str | None
    country: str | None
    race_date: date | None


class ErgastClient:
    def __init__(self, config: ErgastConfig):
        self._base_url = config.base_url
        self._session = requests.Session()
        self._session.headers.update({"Accept": "application/json"})

    @retry(
        retry=retry_if_exception_type(requests.RequestException),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=4, max=30),
    )
    def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{self._base_url}/{path}.json"
        logger.debug("GET %s params=%s", url, params)
        response = self._session.get(url, params=params or {}, timeout=30)
        response.raise_for_status()
        return response.json()

    def fetch_drivers(self, season: int) -> list[DriverRecord]:
        data = self._get(f"{season}/drivers", params={"limit": 100})
        drivers = data["MRData"]["DriverTable"]["Drivers"]
        records = []
        for d in drivers:
            dob = None
            if d.get("dateOfBirth"):
                try:
                    dob = date.fromisoformat(d["dateOfBirth"])
                except ValueError:
                    pass
            records.append(DriverRecord(
                driver_ref=d["driverId"],
                first_name=d.get("givenName", ""),
                last_name=d.get("familyName", ""),
                nationality=d.get("nationality"),
                date_of_birth=dob,
            ))
        logger.info("Fetched %d drivers for season %d", len(records), season)
        return records

    def fetch_constructors(self, season: int) -> list[ConstructorRecord]:
        data = self._get(f"{season}/constructors", params={"limit": 100})
        constructors = data["MRData"]["ConstructorTable"]["Constructors"]
        records = [
            ConstructorRecord(
                constructor_ref=c["constructorId"],
                name=c.get("name", ""),
                nationality=c.get("nationality"),
            )
            for c in constructors
        ]
        logger.info("Fetched %d constructors for season %d", len(records), season)
        return records

    def fetch_races(self, season: int) -> list[RaceRecord]:
        data = self._get(f"{season}", params={"limit": 100})
        races = data["MRData"]["RaceTable"]["Races"]
        records = []
        for r in races:
            race_date = None
            if r.get("date"):
                try:
                    race_date = date.fromisoformat(r["date"])
                except ValueError:
                    pass
            records.append(RaceRecord(
                season_year=int(r["season"]),
                round=int(r["round"]),
                name=r.get("raceName", ""),
                circuit_name=r.get("Circuit", {}).get("circuitName"),
                country=r.get("Circuit", {}).get("Location", {}).get("country"),
                race_date=race_date,
            ))
        logger.info("Fetched %d races for season %d", len(records), season)
        return records

    def fetch_results(self, season: int) -> list["RaceResultRecord"]:
        records: list[RaceResultRecord] = []
        offset = 0
        page_size = 100

        while True:
            data = self._get(
                f"{season}/results",
                params={"limit": page_size, "offset": offset},
            )
            mrdata = data["MRData"]
            total = int(mrdata.get("total", 0))
            races = mrdata["RaceTable"]["Races"]

            for race in races:
                round_num = int(race["round"])
                for r in race.get("Results", []):
                    grid = r.get("grid")
                    pos = r.get("position")
                    records.append(RaceResultRecord(
                        season_year=season,
                        round=round_num,
                        driver_ref=r["Driver"]["driverId"],
                        constructor_ref=r["Constructor"]["constructorId"],
                        grid_position=int(grid) if grid and grid != "0" else None,
                        finish_position=int(pos) if pos else None,
                        points=float(r.get("points", 0)),
                        status=r.get("status", ""),
                    ))

            offset += page_size
            if offset >= total or not races:
                break

        logger.info("Fetched %d results for season %d", len(records), season)
        return records

    def close(self):
        self._session.close()


@dataclass
class RaceResultRecord:
    season_year: int
    round: int
    driver_ref: str
    constructor_ref: str
    grid_position: int | None
    finish_position: int | None
    points: float
    status: str