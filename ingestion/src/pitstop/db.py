import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from pitstop.config import DatabaseConfig


@contextmanager
def get_connection(config: DatabaseConfig):
    conn = psycopg2.connect(config.dsn())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def get_cursor(config: DatabaseConfig):
    with get_connection(config) as conn:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield cursor
        finally:
            cursor.close()