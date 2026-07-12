import logging
from dataclasses import dataclass

from pitstop.config import DatabaseConfig
from pitstop.db import get_cursor
from pitstop.ergast_client import ConstructorRecord, DriverRecord, RaceRecord, RaceResultRecord

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LoadStats:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0

    @property
    def processed(self) -> int:
        return self.inserted + self.updated

    def __add__(self, other: "LoadStats") -> "LoadStats":
        return LoadStats(
            inserted=self.inserted + other.inserted,
            updated=self.updated + other.updated,
            skipped=self.skipped + other.skipped,
        )


def _outcome(row) -> LoadStats:
    if not row:
        return LoadStats(skipped=1)
    return LoadStats(inserted=1) if row["inserted"] else LoadStats(updated=1)


def load_season(config: DatabaseConfig, year: int) -> LoadStats:
    sql = """
        INSERT INTO seasons (year) VALUES (%s)
        ON CONFLICT (year) DO UPDATE SET year = EXCLUDED.year
        RETURNING (xmax = 0) AS inserted
    """
    with get_cursor(config) as cursor:
        cursor.execute(sql, (year,))
        stats = _outcome(cursor.fetchone())
    logger.info("Season %d — inserted: %d, updated: %d", year, stats.inserted, stats.updated)
    return stats


def load_drivers(config: DatabaseConfig, records: list[DriverRecord]) -> LoadStats:
    sql = """
        INSERT INTO drivers (driver_ref, first_name, last_name, nationality, date_of_birth)
        VALUES (%(driver_ref)s, %(first_name)s, %(last_name)s, %(nationality)s, %(date_of_birth)s)
        ON CONFLICT (driver_ref) DO UPDATE SET
            first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
            nationality = EXCLUDED.nationality, date_of_birth = EXCLUDED.date_of_birth,
            updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
    """
    stats = LoadStats()
    with get_cursor(config) as cursor:
        for record in records:
            if not record.driver_ref or not record.first_name or not record.last_name:
                logger.warning("Skipping invalid driver record: %s", record)
                stats += LoadStats(skipped=1)
                continue
            cursor.execute(sql, record.__dict__)
            stats += _outcome(cursor.fetchone())
    logger.info("Drivers — inserted: %d, updated: %d, skipped: %d", stats.inserted, stats.updated, stats.skipped)
    return stats


def load_constructors(config: DatabaseConfig, records: list[ConstructorRecord]) -> LoadStats:
    sql = """
        INSERT INTO constructors (constructor_ref, name, nationality)
        VALUES (%(constructor_ref)s, %(name)s, %(nationality)s)
        ON CONFLICT (constructor_ref) DO UPDATE SET
            name = EXCLUDED.name, nationality = EXCLUDED.nationality, updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
    """
    stats = LoadStats()
    with get_cursor(config) as cursor:
        for record in records:
            if not record.constructor_ref or not record.name:
                logger.warning("Skipping invalid constructor record: %s", record)
                stats += LoadStats(skipped=1)
                continue
            cursor.execute(sql, record.__dict__)
            stats += _outcome(cursor.fetchone())
    logger.info("Constructors — inserted: %d, updated: %d, skipped: %d", stats.inserted, stats.updated, stats.skipped)
    return stats


def load_races(config: DatabaseConfig, records: list[RaceRecord]) -> LoadStats:
    sql = """
        INSERT INTO races (season_year, round, name, circuit_name, country, race_date)
        VALUES (%(season_year)s, %(round)s, %(name)s, %(circuit_name)s, %(country)s, %(race_date)s)
        ON CONFLICT (season_year, round) DO UPDATE SET
            name = EXCLUDED.name, circuit_name = EXCLUDED.circuit_name,
            country = EXCLUDED.country, race_date = EXCLUDED.race_date, updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
    """
    stats = LoadStats()
    with get_cursor(config) as cursor:
        for record in records:
            if record.season_year <= 0 or record.round <= 0 or not record.name:
                logger.warning("Skipping invalid race record: %s", record)
                stats += LoadStats(skipped=1)
                continue
            cursor.execute(sql, record.__dict__)
            stats += _outcome(cursor.fetchone())
    logger.info("Races — inserted: %d, updated: %d, skipped: %d", stats.inserted, stats.updated, stats.skipped)
    return stats


def load_race_results(config: DatabaseConfig, records: list[RaceResultRecord]) -> LoadStats:
    sql = """
        INSERT INTO race_results (race_id, driver_id, constructor_id,
                                  grid_position, finish_position, points, status)
        SELECT r.id, d.id, c.id,
               %(grid_position)s, %(finish_position)s, %(points)s, %(status)s
        FROM races r
        JOIN drivers d ON d.driver_ref = %(driver_ref)s
        JOIN constructors c ON c.constructor_ref = %(constructor_ref)s
        WHERE r.season_year = %(season_year)s AND r.round = %(round)s
        ON CONFLICT (race_id, driver_id) DO UPDATE SET
            constructor_id = EXCLUDED.constructor_id,
            grid_position = EXCLUDED.grid_position,
            finish_position = EXCLUDED.finish_position,
            points = EXCLUDED.points,
            status = EXCLUDED.status
        RETURNING (xmax = 0) AS inserted
    """
    stats = LoadStats()
    with get_cursor(config) as cursor:
        for record in records:
            if not record.driver_ref or not record.constructor_ref or record.round <= 0:
                logger.warning("Skipping invalid result record: %s", record)
                stats += LoadStats(skipped=1)
                continue
            cursor.execute(sql, record.__dict__)
            outcome = _outcome(cursor.fetchone())
            if outcome.skipped:
                logger.warning(
                    "Missing race, driver, or constructor for %s season %d round %d — skipping",
                    record.driver_ref, record.season_year, record.round,
                )
            stats += outcome
    logger.info("Results — inserted: %d, updated: %d, skipped: %d", stats.inserted, stats.updated, stats.skipped)
    return stats
