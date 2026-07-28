from datetime import datetime, timezone
from typing import Any


class FastF1Replay:
    def __init__(self, cache_path: str) -> None:
        import fastf1
        fastf1.Cache.enable_cache(cache_path)
        self.fastf1 = fastf1

    def load(self, year: int, event: str | int, session_name: str) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
        session = self.fastf1.get_session(year, event, session_name)
        session.load(telemetry=True, weather=True, messages=True)
        session_key = f"fastf1-{year}-{event}-{session_name}".lower().replace(" ", "-")
        event_name = str(session.event.get("EventName", event))
        session_row = {
            "provider_session_key": session_key,
            "year": year,
            "country_name": session.event.get("Country"),
            "circuit_name": session.event.get("Location"),
            "session_name": session_name,
            "session_type": session_name,
            "date_start": _iso(session.date),
            "status": "REPLAY",
            "meeting_key": event_name,
        }
        data: dict[str, list[dict[str, Any]]] = {name: [] for name in (
            "drivers", "position", "laps", "car_data", "location", "stints", "pit", "race_control", "weather"
        )}
        for driver in session.drivers:
            info = session.get_driver(driver)
            data["drivers"].append({
                "driver_number": int(driver), "name_acronym": info.get("Abbreviation"),
                "full_name": info.get("FullName"), "team_name": info.get("TeamName"),
                "team_colour": info.get("TeamColor"),
            })
        for _, lap in session.laps.iterrows():
            number = _integer(lap.get("DriverNumber"))
            lap_number = _integer(lap.get("LapNumber"))
            if number is None or lap_number is None:
                continue
            data["laps"].append({
                "driver_number": number, "lap_number": lap_number,
                "date_start": _absolute(session.date, lap.get("LapStartTime")),
                "lap_duration": _seconds(lap.get("LapTime")),
                "duration_sector_1": _seconds(lap.get("Sector1Time")),
                "duration_sector_2": _seconds(lap.get("Sector2Time")),
                "duration_sector_3": _seconds(lap.get("Sector3Time")),
                "st_speed": _number(lap.get("SpeedST")), "is_pit_out_lap": _present(lap.get("PitOutTime")),
            })
            data["position"].append({
                "driver_number": number, "date": _absolute(session.date, lap.get("LapStartTime")),
                "position": _integer(lap.get("Position")),
            })
            if lap.get("PitInTime") is not None and lap.get("PitInTime") == lap.get("PitInTime"):
                data["pit"].append({
                    "driver_number": number, "lap_number": lap_number,
                    "date": _absolute(session.date, lap.get("PitInTime")),
                    "pit_duration": _seconds(lap.get("PitOutTime") - lap.get("PitInTime"))
                        if lap.get("PitOutTime") is not None and lap.get("PitOutTime") == lap.get("PitOutTime") else None,
                })
        for driver, frame in session.car_data.items():
            sampled = frame.iloc[::5]
            for _, row in sampled.iterrows():
                data["car_data"].append({
                    "driver_number": int(driver), "date": _absolute(session.date, row.get("Time")),
                    "speed": _integer(row.get("Speed")), "throttle": _integer(row.get("Throttle")),
                    "brake": bool(row.get("Brake")), "n_gear": _integer(row.get("nGear")),
                    "rpm": _integer(row.get("RPM")), "drs": _integer(row.get("DRS")),
                })
        for driver, frame in session.pos_data.items():
            for _, row in frame.iloc[::5].iterrows():
                data["location"].append({
                    "driver_number": int(driver), "date": _absolute(session.date, row.get("Time")),
                    "x": _integer(row.get("X")), "y": _integer(row.get("Y")), "z": _integer(row.get("Z")),
                })
        for (driver, stint), group in session.laps.groupby(["DriverNumber", "Stint"]):
            if stint != stint:
                continue
            data["stints"].append({
                "driver_number": int(driver), "stint_number": int(stint),
                "lap_start": int(group["LapNumber"].min()), "lap_end": int(group["LapNumber"].max()),
                "compound": str(group["Compound"].dropna().iloc[-1]) if group["Compound"].notna().any() else None,
                "tyre_age_at_start": int(group["TyreLife"].dropna().iloc[0]) if group["TyreLife"].notna().any() else 0,
            })
        if session.race_control_messages is not None:
            for _, row in session.race_control_messages.iterrows():
                # Unlike laps/weather, race control message timestamps are already
                # absolute wall-clock time, not an offset from session start.
                data["race_control"].append({
                    "date": _absolute_timestamp(row.get("Time")), "category": row.get("Category"),
                    "flag": row.get("Flag"), "scope": row.get("Scope"), "sector": _integer(row.get("Sector")),
                    "lap_number": _integer(row.get("Lap")), "message": str(row.get("Message") or "Race control update"),
                })
        if session.weather_data is not None:
            for _, row in session.weather_data.iterrows():
                data["weather"].append({
                    "date": _absolute(session.date, row.get("Time")), "air_temperature": _number(row.get("AirTemp")),
                    "track_temperature": _number(row.get("TrackTemp")), "humidity": _number(row.get("Humidity")),
                    "pressure": _number(row.get("Pressure")), "rainfall": bool(row.get("Rainfall")),
                    "wind_direction": _integer(row.get("WindDirection")), "wind_speed": _number(row.get("WindSpeed")),
                })
        return session_row, data


def _seconds(value: Any) -> float | None:
    return None if value is None or value != value else float(value.total_seconds())


def _number(value: Any) -> float | None:
    return None if value is None or value != value else float(value)


def _integer(value: Any) -> int | None:
    number = _number(value)
    return None if number is None else int(number)


def _present(value: Any) -> bool:
    return value is not None and value == value


def _absolute(start: Any, delta: Any) -> str | None:
    if start is None or delta is None or delta != delta:
        return None
    return _iso(start + delta)


def _absolute_timestamp(value: Any) -> str | None:
    if value is None or value != value:
        return None
    return _iso(value)


def _iso(value: Any) -> str:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime) and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()
