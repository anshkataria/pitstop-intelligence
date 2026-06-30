import logging
import sys
import time
from pitstop.config import load_config
from pitstop.ergast_client import ErgastClient
from pitstop import loaders

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


def run() -> None:
    config = load_config()
    client = ErgastClient(config.ergast)

    logger.info("Starting ingestion for seasons: %s", config.ergast.seasons)

    total_drivers = 0
    total_constructors = 0
    total_races = 0
    total_results = 0
    failed_seasons = []

    try:
        for season in config.ergast.seasons:
            try:
                logger.info("--- Season %d ---", season)

                loaders.load_season(config.db, season)

                drivers = client.fetch_drivers(season)
                total_drivers += loaders.load_drivers(config.db, drivers)

                constructors = client.fetch_constructors(season)
                total_constructors += loaders.load_constructors(config.db, constructors)

                races = client.fetch_races(season)
                total_races += loaders.load_races(config.db, races)

                results = client.fetch_results(season)
                total_results += loaders.load_race_results(config.db, results)

                time.sleep(1)

            except Exception as exc:
                logger.error("Season %d failed: %s", season, exc, exc_info=True)
                failed_seasons.append(season)
                continue

    finally:
        client.close()

    logger.info(
        "Ingestion complete — drivers: %d, constructors: %d, races: %d, results: %d",
        total_drivers, total_constructors, total_races, total_results,
    )

    if failed_seasons:
        logger.warning("Failed seasons (re-run to retry): %s", failed_seasons)
        sys.exit(1)


if __name__ == "__main__":
    run()