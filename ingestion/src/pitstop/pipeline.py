import logging
import sys
import time

from pitstop import loaders
from pitstop.config import load_config
from pitstop.ergast_client import ErgastClient
from pitstop.loaders import LoadStats
from pitstop.run_tracker import RunOutcome, fail_run, finish_run, start_run

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


def run() -> None:
    config = load_config()
    logger.info("Starting ingestion for seasons: %s", config.ergast.seasons)
    run_id = start_run(config.db, config.ergast.seasons)
    client = ErgastClient(config.ergast)
    total = LoadStats()
    failed_seasons: list[int] = []
    errors: list[str] = []

    try:
        for season in config.ergast.seasons:
            try:
                logger.info("--- Season %d ---", season)
                total += loaders.load_season(config.db, season)
                total += loaders.load_drivers(config.db, client.fetch_drivers(season))
                total += loaders.load_constructors(config.db, client.fetch_constructors(season))
                total += loaders.load_races(config.db, client.fetch_races(season))
                total += loaders.load_race_results(config.db, client.fetch_results(season))
                time.sleep(1)
            except Exception as exc:
                message = f"Season {season}: {type(exc).__name__}: {exc}"
                logger.error("%s", message, exc_info=True)
                failed_seasons.append(season)
                errors.append(message)

        outcome = RunOutcome(total, failed_seasons, errors)
        status = finish_run(config.db, run_id, outcome)
        logger.info(
            "Ingestion %s — inserted: %d, updated: %d, skipped: %d, failed seasons: %s",
            status, total.inserted, total.updated, total.skipped, failed_seasons or "none",
        )
        if failed_seasons:
            raise SystemExit(1)
    except SystemExit:
        raise
    except Exception as exc:
        logger.critical("Ingestion run failed: %s", exc, exc_info=True)
        fail_run(config.db, run_id, f"{type(exc).__name__}: {exc}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    run()
