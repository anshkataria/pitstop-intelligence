import json
import hashlib
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from liveservice.intelligence import MODEL_VERSION, ModelOutput


def parse_time(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


class LiveRepository:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn

    @contextmanager
    def cursor(self) -> Iterator[RealDictCursor]:
        connection = psycopg2.connect(self.dsn)
        try:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                yield cursor
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def upsert_session(self, row: dict[str, Any], provider: str = "OPENF1") -> int:
        key = str(row.get("session_key") or row.get("provider_session_key"))
        with self.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO live_sessions(provider, provider_session_key, meeting_key, year,
                    country_name, circuit_name, session_name, session_type, starts_at, ends_at, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(provider_session_key) DO UPDATE SET
                    country_name=EXCLUDED.country_name, circuit_name=EXCLUDED.circuit_name,
                    session_name=EXCLUDED.session_name, session_type=EXCLUDED.session_type,
                    starts_at=EXCLUDED.starts_at, ends_at=EXCLUDED.ends_at,
                    status=EXCLUDED.status, last_updated_at=NOW()
                RETURNING id
                """,
                (provider, key, str(row.get("meeting_key") or ""), int(row.get("year") or datetime.now().year),
                 row.get("country_name"), row.get("circuit_short_name") or row.get("circuit_name"),
                 row.get("session_name") or "Race", row.get("session_type"),
                 row.get("date_start"), row.get("date_end"), row.get("status") or "ACTIVE"),
            )
            return int(cursor.fetchone()["id"])

    def store(self, endpoint: str, session_id: int, rows: list[dict[str, Any]]) -> int:
        method = getattr(self, f"_store_{endpoint}", None)
        return method(session_id, rows) if method else 0

    def _store_drivers(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), r.get("name_acronym"), r.get("full_name"),
                   r.get("team_name"), r.get("team_colour")) for r in rows if r.get("driver_number")]
        return self._values("""INSERT INTO live_drivers VALUES %s ON CONFLICT(session_id,driver_number)
            DO UPDATE SET driver_code=EXCLUDED.driver_code,full_name=EXCLUDED.full_name,
            team_name=EXCLUDED.team_name,team_colour=EXCLUDED.team_colour""", values)

    def _store_position(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), parse_time(r.get("date")), r.get("position"), False)
                  for r in rows if r.get("driver_number")]
        return self._values("""INSERT INTO live_timing(session_id,driver_number,captured_at,position,in_pit) VALUES %s
            ON CONFLICT(session_id,driver_number,captured_at) DO UPDATE SET
            position=EXCLUDED.position""", values)

    def _store_intervals(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), parse_time(r.get("date")),
                   str(r.get("interval")) if r.get("interval") is not None else None,
                   str(r.get("gap_to_leader")) if r.get("gap_to_leader") is not None else None, False)
                  for r in rows if r.get("driver_number")]
        return self._values("""INSERT INTO live_timing(session_id,driver_number,captured_at,
            interval_to_leader,gap_to_leader,in_pit) VALUES %s
            ON CONFLICT(session_id,driver_number,captured_at) DO UPDATE SET
            interval_to_leader=EXCLUDED.interval_to_leader,gap_to_leader=EXCLUDED.gap_to_leader""", values)

    def _store_laps(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), r.get("lap_number"), r.get("date_start"),
                   r.get("lap_duration"), r.get("duration_sector_1"), r.get("duration_sector_2"),
                   r.get("duration_sector_3"), r.get("st_speed"), r.get("is_pit_out_lap"))
                  for r in rows if r.get("driver_number") and r.get("lap_number")]
        return self._values("""INSERT INTO live_laps VALUES %s ON CONFLICT(session_id,driver_number,lap_number)
            DO UPDATE SET started_at=EXCLUDED.started_at,lap_duration=EXCLUDED.lap_duration,
            sector_1_duration=EXCLUDED.sector_1_duration,sector_2_duration=EXCLUDED.sector_2_duration,
            sector_3_duration=EXCLUDED.sector_3_duration,speed_trap=EXCLUDED.speed_trap,
            is_pit_out_lap=EXCLUDED.is_pit_out_lap""", values)

    def _store_car_data(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), parse_time(r.get("date")), r.get("speed"),
                   r.get("throttle"), int(bool(r.get("brake"))) if r.get("brake") is not None else None,
                   r.get("n_gear"), r.get("rpm"), r.get("drs")) for r in rows if r.get("driver_number")]
        return self._values("""INSERT INTO live_telemetry(session_id,driver_number,captured_at,speed,throttle,brake,gear,rpm,drs)
            VALUES %s ON CONFLICT(session_id,driver_number,captured_at) DO UPDATE SET
            speed=EXCLUDED.speed,throttle=EXCLUDED.throttle,brake=EXCLUDED.brake,
            gear=EXCLUDED.gear,rpm=EXCLUDED.rpm,drs=EXCLUDED.drs""", values)

    def _store_location(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), parse_time(r.get("date")), r.get("x"), r.get("y"), r.get("z"))
                  for r in rows if r.get("driver_number")]
        return self._values("""INSERT INTO live_telemetry(session_id,driver_number,captured_at,x,y,z)
            VALUES %s ON CONFLICT(session_id,driver_number,captured_at) DO UPDATE SET
            x=EXCLUDED.x,y=EXCLUDED.y,z=EXCLUDED.z""", values)

    def _store_stints(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, r.get("driver_number"), r.get("stint_number"), r.get("lap_start"),
                   r.get("lap_end"), r.get("compound"), r.get("tyre_age_at_start"))
                  for r in rows if r.get("driver_number") and r.get("stint_number")]
        return self._values("""INSERT INTO live_stints VALUES %s ON CONFLICT(session_id,driver_number,stint_number)
            DO UPDATE SET lap_start=EXCLUDED.lap_start,lap_end=EXCLUDED.lap_end,
            compound=EXCLUDED.compound,tyre_age_at_start=EXCLUDED.tyre_age_at_start""", values)

    def _store_pit(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        # pit_duration = time stationary in the pit box (OpenF1 reports this directly).
        # lane_duration = full pit-lane transit time (what FastF1 can derive from
        # PitInTime/PitOutTime). The two providers don't supply the same measurement,
        # so each row only fills in whichever one its source actually knows.
        values = [(session_id, r.get("driver_number"), r.get("lap_number"), r.get("date"),
                   r.get("pit_duration"), r.get("lane_duration"))
                  for r in rows if r.get("driver_number") and r.get("lap_number")]
        return self._values("""INSERT INTO live_pit_stops VALUES %s ON CONFLICT(session_id,driver_number,lap_number)
            DO UPDATE SET stopped_at=EXCLUDED.stopped_at,pit_duration=EXCLUDED.pit_duration,
            lane_duration=EXCLUDED.lane_duration""", values)

    def _store_race_control(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, _event_key(r), parse_time(r.get("date")),
                   r.get("category"), r.get("flag"), r.get("scope"), r.get("sector"), r.get("lap_number"),
                   r.get("driver_number"), r.get("message") or "Race control update") for r in rows]
        return self._values("""INSERT INTO live_race_control VALUES %s ON CONFLICT DO NOTHING""", values)

    def _store_weather(self, session_id: int, rows: list[dict[str, Any]]) -> int:
        values = [(session_id, parse_time(r.get("date")), r.get("air_temperature"), r.get("track_temperature"),
                   r.get("humidity"), r.get("pressure"), bool(r.get("rainfall")), r.get("wind_direction"),
                   r.get("wind_speed")) for r in rows]
        return self._values("""INSERT INTO live_weather VALUES %s ON CONFLICT(session_id,captured_at)
            DO UPDATE SET air_temperature=EXCLUDED.air_temperature,track_temperature=EXCLUDED.track_temperature,
            humidity=EXCLUDED.humidity,pressure=EXCLUDED.pressure,rainfall=EXCLUDED.rainfall,
            wind_direction=EXCLUDED.wind_direction,wind_speed=EXCLUDED.wind_speed""", values)

    def _values(self, sql: str, values: list[tuple[Any, ...]]) -> int:
        if not values:
            return 0
        with self.cursor() as cursor:
            execute_values(cursor, sql, values, page_size=1000)
        return len(values)

    def model_features(self, session_id: int) -> dict[str, Any]:
        with self.cursor() as cursor:
            cursor.execute("""SELECT d.driver_number, COALESCE(MAX(l.lap_number),0) current_lap,
                ARRAY_REMOVE(ARRAY_AGG(l.lap_duration ORDER BY l.lap_number),NULL) lap_times,
                s.compound, GREATEST(0,COALESCE(MAX(l.lap_number),0)-COALESCE(s.lap_start,0)) tyre_age,
                (SELECT COUNT(*) FROM live_pit_stops p WHERE p.session_id=%s AND p.driver_number=d.driver_number) pit_stops,
                (SELECT COUNT(*) FROM live_telemetry t WHERE t.session_id=%s AND t.driver_number=d.driver_number) telemetry_samples,
                (SELECT COUNT(*) FROM live_race_control rc WHERE rc.session_id=%s AND rc.driver_number=d.driver_number) incident_mentions
                FROM live_drivers d LEFT JOIN live_laps l ON l.session_id=d.session_id AND l.driver_number=d.driver_number
                LEFT JOIN live_stints s ON s.session_id=d.session_id AND s.driver_number=d.driver_number
                    AND s.stint_number=(SELECT MAX(s2.stint_number) FROM live_stints s2 WHERE s2.session_id=d.session_id AND s2.driver_number=d.driver_number)
                WHERE d.session_id=%s GROUP BY d.driver_number,s.compound,s.lap_start""", (session_id, session_id, session_id, session_id))
            drivers = list(cursor.fetchall())
            cursor.execute("""SELECT COUNT(*) FILTER (WHERE category ILIKE '%%incident%%'
                    OR message ILIKE '%%incident%%' OR message ILIKE '%%stopped%%') incidents,
                COUNT(*) FILTER (WHERE flag IN ('YELLOW','DOUBLE YELLOW')) yellows,
                COUNT(*) FILTER (WHERE message ILIKE '%%safety car%%') safety_messages
                FROM live_race_control WHERE session_id=%s""", (session_id,))
            control = dict(cursor.fetchone())
            cursor.execute("SELECT COALESCE(rainfall,false) wet FROM live_weather WHERE session_id=%s ORDER BY captured_at DESC LIMIT 1", (session_id,))
            weather = cursor.fetchone()
        return {"drivers": drivers, "control": control, "wet": bool(weather and weather["wet"])}

    def save_models(self, session_id: int, outputs: list[ModelOutput]) -> None:
        values = [(session_id, output.driver_number, output.model_type, MODEL_VERSION, output.confidence,
                   json.dumps(output.output)) for output in outputs]
        self._values("""INSERT INTO live_intelligence(session_id,driver_number,model_type,model_version,confidence,output)
            VALUES %s ON CONFLICT(session_id,driver_number,model_type) DO UPDATE SET
            model_version=EXCLUDED.model_version,generated_at=NOW(),confidence=EXCLUDED.confidence,output=EXCLUDED.output""", values)


def _event_key(row: dict[str, Any]) -> str:
    raw = f"{row.get('date')}:{row.get('category')}:{row.get('message')}"
    return hashlib.sha1(raw.encode("utf-8"), usedforsecurity=False).hexdigest()
