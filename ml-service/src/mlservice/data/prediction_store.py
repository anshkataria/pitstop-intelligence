import psycopg2

from mlservice.config import Settings
from mlservice.ml.predictor import PredictionInput, PredictionOutput


def save_prediction(
    settings: Settings,
    inputs: list[PredictionInput],
    outputs: list[PredictionOutput],
    model_version: str,
) -> int:
    first = inputs[0]
    connection = psycopg2.connect(settings.db_dsn())
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO prediction_runs (season_year, round, circuit_name, model_version)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (first.season_year, first.round, first.circuit_name, model_version),
            )
            run_id = cursor.fetchone()[0]
            for entry, output in zip(inputs, outputs):
                cursor.execute(
                    """
                    INSERT INTO prediction_results
                        (prediction_run_id, driver_ref, constructor_ref, grid_position,
                         predicted_position, predicted_position_rounded,
                         confidence_range_low, confidence_range_high)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (run_id, entry.driver_ref, entry.constructor_ref, entry.grid_position,
                     output.predicted_position, output.predicted_position_rounded,
                     output.confidence_range_low, output.confidence_range_high),
                )
        connection.commit()
        return run_id
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
