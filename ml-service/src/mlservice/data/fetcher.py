import pandas as pd
import psycopg2
import psycopg2.extras
import logging
from mlservice.config import Settings

logger = logging.getLogger(__name__)

TRAINING_QUERY = """
    SELECT
        rr.grid_position,
        rr.finish_position,
        rr.points,
        d.driver_ref,
        d.nationality                           AS driver_nationality,
        c.constructor_ref,
        c.nationality                           AS constructor_nationality,
        r.circuit_name,
        r.country,
        EXTRACT(YEAR FROM r.race_date)::INTEGER AS season_year,
        r.round
    FROM race_results rr
    JOIN races        r ON r.id = rr.race_id
    JOIN drivers      d ON d.id = rr.driver_id
    JOIN constructors c ON c.id = rr.constructor_id
    WHERE rr.finish_position IS NOT NULL
    AND   rr.grid_position   IS NOT NULL
    ORDER BY r.race_date, r.round
"""


def fetch_training_data(settings: Settings) -> pd.DataFrame:
    conn = psycopg2.connect(settings.db_dsn())
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(TRAINING_QUERY)
            rows = cur.fetchall()
    finally:
        conn.close()

    df = pd.DataFrame(rows)
    logger.info("Fetched %d training rows from database", len(df))
    return df