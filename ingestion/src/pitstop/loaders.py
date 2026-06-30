import logging
import psycopg2
from pitstop.config import DatabaseConfig
from pitstop.db import get_cursor
from pitstop.ergast_client import DriverRecord, ConstructorRecord, RaceRecord

logger = logging.getLogger(__name__)


def load_season(config: DatabaseConfig, year: int) -> None:
    sql = """
        INSERT INTO seasons (year)
        VALUES (%s)
        ON CONFLICT (year) DO NOTHING
    """
    with get_cursor(config) as cursor:
        cursor.execute(sql, (year,))
    logger.info("Upserted season %d", year)


def load_drivers(config: DatabaseConfig, records: list[DriverRecord]) -> int:
    sql = """
        INSERT INTO drivers (driver_ref, first_name, last_name, nationality, date_of_birth)
        VALUES (%(driver_ref)s, %(first_name)s, %(last_name)s, %(nationality)s, %(date_of_birth)s)
        ON CONFLICT (driver_ref) DO UPDATE SET
            first_name    = EXCLUDED.first_name,
            last_name     = EXCLUDED.last_name,
            nationality   = EXCLUDED.nationality,
            date_of_birth = EXCLUDED.date_of_birth,
            updated_at    = NOW()
    """
    count = 0
    with get_cursor(config) as cursor:
        for record in records:
            cursor.execute(sql, {
                "driver_ref":    record.driver_ref,
                "first_name":    record.first_name,
                "last_name":     record.last_name,
                "nationality":   record.nationality,
                "date_of_birth": record.date_of_birth,
            })
            count += 1
    logger.info("Upserted %d drivers", count)
    return count


def load_constructors(config: DatabaseConfig, records: list[ConstructorRecord]) -> int:
    sql = """
        INSERT INTO constructors (constructor_ref, name, nationality)
        VALUES (%(constructor_ref)s, %(name)s, %(nationality)s)
        ON CONFLICT (constructor_ref) DO UPDATE SET
            name        = EXCLUDED.name,
            nationality = EXCLUDED.nationality,
            updated_at  = NOW()
    """
    count = 0
    with get_cursor(config) as cursor:
        for record in records:
            cursor.execute(sql, {
                "constructor_ref": record.constructor_ref,
                "name":            record.name,
                "nationality":     record.nationality,
            })
            count += 1
    logger.info("Upserted %d constructors", count)
    return count


def load_races(config: DatabaseConfig, records: list[RaceRecord]) -> int:
    sql = """
        INSERT INTO races (season_year, round, name, circuit_name, country, race_date)
        VALUES (%(season_year)s, %(round)s, %(name)s, %(circuit_name)s, %(country)s, %(race_date)s)
        ON CONFLICT (season_year, round) DO UPDATE SET
            name         = EXCLUDED.name,
            circuit_name = EXCLUDED.circuit_name,
            country      = EXCLUDED.country,
            race_date    = EXCLUDED.race_date,
            updated_at   = NOW()
    """
    count = 0
    with get_cursor(config) as cursor:
        for record in records:
            cursor.execute(sql, {
                "season_year":  record.season_year,
                "round":        record.round,
                "name":         record.name,
                "circuit_name": record.circuit_name,
                "country":      record.country,
                "race_date":    record.race_date,
            })
            count += 1
    logger.info("Upserted %d races", count)
    return count


def load_race_results(config: DatabaseConfig, records: list) -> int:
    lookup_race_sql = """
        SELECT r.id FROM races r WHERE r.season_year = %s AND r.round = %s
    """
    lookup_driver_sql = """
        SELECT d.id FROM drivers d WHERE d.driver_ref = %s
    """
    lookup_constructor_sql = """
        SELECT c.id FROM constructors c WHERE c.constructor_ref = %s
    """
    insert_sql = """
        INSERT INTO race_results
            (race_id, driver_id, constructor_id, grid_position,
             finish_position, points, status, laps_completed)
        VALUES
            (%(race_id)s, %(driver_id)s, %(constructor_id)s, %(grid_position)s,
             %(finish_position)s, %(points)s, %(status)s, %(laps_completed)s)
        ON CONFLICT (race_id, driver_id) DO UPDATE SET
            grid_position   = EXCLUDED.grid_position,
            finish_position = EXCLUDED.finish_position,
            points          = EXCLUDED.points,
            status          = EXCLUDED.status,
            laps_completed  = EXCLUDED.laps_completed
    """
    count = 0
    with get_cursor(config) as cursor:
        for record in records:
            cursor.execute(lookup_race_sql, (record.season_year, record.round))
            race_row = cursor.fetchone()
            if not race_row:
                logger.warning("Race not found: %s/%s — skipping", record.season_year, record.round)
                continue

            cursor.execute(lookup_driver_sql, (record.driver_ref,))
            driver_row = cursor.fetchone()
            if not driver_row:
                logger.warning("Driver not found: %s — skipping", record.driver_ref)
                continue

            cursor.execute(lookup_constructor_sql, (record.constructor_ref,))
            constructor_row = cursor.fetchone()
            if not constructor_row:
                logger.warning("Constructor not found: %s — skipping", record.constructor_ref)
                continue

            cursor.execute(insert_sql, {
                "race_id":         race_row["id"],
                "driver_id":       driver_row["id"],
                "constructor_id":  constructor_row["id"],
                "grid_position":   record.grid_position,
                "finish_position": record.finish_position,
                "points":          record.points,
                "status":          record.status,
                "laps_completed":  record.laps_completed,
            })
            count += 1

    logger.info("Upserted %d race results", count)
    return count


def load_race_results(config: DatabaseConfig, records: list) -> int:
    sql = """
        INSERT INTO race_results (race_id, driver_id, constructor_id,
                                  grid_position, finish_position, points, status)
        SELECT r.id, d.id, c.id,
               %(grid_position)s, %(finish_position)s, %(points)s, %(status)s
        FROM   races r
        JOIN   drivers d      ON d.driver_ref      = %(driver_ref)s
        JOIN   constructors c ON c.constructor_ref  = %(constructor_ref)s
        WHERE  r.season_year = %(season_year)s
        AND    r.round       = %(round)s
        ON CONFLICT (race_id, driver_id) DO UPDATE SET
            grid_position   = EXCLUDED.grid_position,
            finish_position = EXCLUDED.finish_position,
            points          = EXCLUDED.points,
            status          = EXCLUDED.status
    """
    count = 0
    with get_cursor(config) as cursor:
        for record in records:
            cursor.execute(sql, {
                "season_year":    record.season_year,
                "round":          record.round,
                "driver_ref":     record.driver_ref,
                "constructor_ref": record.constructor_ref,
                "grid_position":  record.grid_position,
                "finish_position": record.finish_position,
                "points":         record.points,
                "status":         record.status,
            })
            count += 1
    logger.info("Upserted %d race results", count)
    return count