from liveservice.intelligence import (
    dnf_probability,
    pit_window,
    safety_car_probability,
    strategy_comparison,
    tyre_degradation,
)


def test_tyre_model_uses_recent_lap_time_slope():
    result = tyre_degradation(4, [90.0, 90.1, 90.25, 90.4, 90.55], "MEDIUM")
    assert result.model_type == "TYRE_DEGRADATION"
    assert result.output["secondsPerLap"] > 0.1
    assert result.output["trend"] == "HIGH"


def test_pit_window_moves_earlier_for_old_degrading_tyres():
    healthy = pit_window(4, current_lap=20, tyre_age=4, degradation=0.02)
    worn = pit_window(4, current_lap=20, tyre_age=14, degradation=0.25)
    assert worn.output["recommendedLap"] < healthy.output["recommendedLap"]


def test_safety_car_probability_responds_to_flags_incidents_and_rain():
    calm = safety_car_probability(0, 0, False)
    disrupted = safety_car_probability(5, 3, True)
    assert disrupted.output["probability"] > calm.output["probability"]


def test_strategy_and_dnf_outputs_are_bounded_and_actionable():
    strategy = strategy_comparison(1, current_lap=30, degradation=0.4)
    dnf = dnf_probability(1, telemetry_dropouts=3, pit_stops=2, incident_mentions=1)
    assert strategy.output["recommended"] in {"ONE_STOP", "TWO_STOP"}
    assert 0 <= dnf.output["probability"] <= 1
