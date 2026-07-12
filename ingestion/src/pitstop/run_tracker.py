from dataclasses import dataclass

from pitstop.config import DatabaseConfig
from pitstop.db import get_cursor
from pitstop.loaders import LoadStats


@dataclass(frozen=True)
class RunOutcome:
    stats: LoadStats
    failed_seasons: list[int]
    errors: list[str]


def start_run(config: DatabaseConfig, seasons: list[int]) -> int:
    with get_cursor(config) as cursor:
        cursor.execute(
            """
            INSERT INTO ingestion_runs (seasons_requested, status)
            VALUES (%s, 'RUNNING') RETURNING id
            """,
            (seasons,),
        )
        return cursor.fetchone()["id"]


def finish_run(config: DatabaseConfig, run_id: int, outcome: RunOutcome) -> str:
    status = "PARTIAL" if outcome.failed_seasons else "SUCCESS"
    error_summary = "\n".join(outcome.errors) if outcome.errors else None
    with get_cursor(config) as cursor:
        cursor.execute(
            """
            UPDATE ingestion_runs SET
                finished_at = CURRENT_TIMESTAMP,
                failed_seasons = %s,
                records_inserted = %s,
                records_updated = %s,
                records_skipped = %s,
                failure_count = %s,
                status = %s,
                error_summary = %s
            WHERE id = %s
            """,
            (
                outcome.failed_seasons,
                outcome.stats.inserted,
                outcome.stats.updated,
                outcome.stats.skipped,
                len(outcome.failed_seasons),
                status,
                error_summary,
                run_id,
            ),
        )
    return status


def fail_run(config: DatabaseConfig, run_id: int, message: str) -> None:
    with get_cursor(config) as cursor:
        cursor.execute(
            """
            UPDATE ingestion_runs SET
                finished_at = CURRENT_TIMESTAMP,
                failure_count = failure_count + 1,
                status = 'FAILED',
                error_summary = %s
            WHERE id = %s
            """,
            (message, run_id),
        )
