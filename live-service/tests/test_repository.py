from liveservice.repository import LiveRepository


def _repo() -> LiveRepository:
    return object.__new__(LiveRepository)


def test_store_pit_keeps_openf1_box_time_and_fastf1_lane_time_separate():
    # OpenF1's "pit_duration" is time stationary in the box; FastF1 can only
    # derive full pit-lane transit time from PitIn/PitOutTime. They must land
    # in the right DB column instead of being swapped or conflated.
    repo = _repo()
    captured: dict = {}
    def fake_values(sql, values):
        captured["values"] = values
        return len(values)

    repo._values = fake_values

    repo._store_pit(1, [{"driver_number": 44, "lap_number": 12,
                          "date": "2024-01-01T00:00:00Z", "pit_duration": 2.4}])
    _, _, _, _, pit_duration, lane_duration = captured["values"][0]
    assert pit_duration == 2.4
    assert lane_duration is None

    repo._store_pit(1, [{"driver_number": 44, "lap_number": 13,
                          "date": "2024-01-01T00:01:00Z", "lane_duration": 23.1}])
    _, _, _, _, pit_duration, lane_duration = captured["values"][0]
    assert pit_duration is None
    assert lane_duration == 23.1
