import math
from dataclasses import dataclass
from statistics import mean
from typing import Any

MODEL_VERSION = "live-baseline-1"


@dataclass(frozen=True)
class ModelOutput:
    model_type: str
    driver_number: int
    confidence: float
    output: dict[str, Any]


def _linear_slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    xs = list(range(len(values)))
    x_mean, y_mean = mean(xs), mean(values)
    denominator = sum((x - x_mean) ** 2 for x in xs)
    return 0.0 if denominator == 0 else sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values)) / denominator


def tyre_degradation(driver_number: int, lap_times: list[float], compound: str | None) -> ModelOutput:
    clean = [value for value in lap_times[-8:] if 40 < value < 180]
    slope = _linear_slope(clean)
    confidence = min(0.95, 0.35 + len(clean) * 0.075)
    return ModelOutput("TYRE_DEGRADATION", driver_number, confidence, {
        "secondsPerLap": round(slope, 3), "compound": compound or "UNKNOWN",
        "sampleLaps": len(clean), "trend": "HIGH" if slope > 0.12 else "STABLE" if slope > -0.05 else "IMPROVING",
    })


def pit_window(driver_number: int, current_lap: int, tyre_age: int, degradation: float, total_laps: int = 60) -> ModelOutput:
    remaining_safe_laps = max(1, round(18 - tyre_age - max(0.0, degradation) * 18))
    centre = min(total_laps - 1, current_lap + remaining_safe_laps)
    return ModelOutput("PIT_WINDOW", driver_number, 0.62, {
        "windowStart": max(current_lap + 1, centre - 2), "windowEnd": min(total_laps - 1, centre + 2),
        "recommendedLap": centre, "tyreAge": tyre_age,
    })


def safety_car_probability(incident_count: int, yellow_count: int, wet: bool) -> ModelOutput:
    logit = -2.5 + incident_count * 0.28 + yellow_count * 0.42 + (0.8 if wet else 0)
    probability = 1 / (1 + math.exp(-logit))
    return ModelOutput("SAFETY_CAR", 0, 0.58, {
        "probability": round(probability, 3), "risk": "HIGH" if probability >= 0.5 else "MEDIUM" if probability >= 0.25 else "LOW",
        "incidentSignals": incident_count, "yellowSignals": yellow_count,
    })


def dnf_probability(driver_number: int, telemetry_dropouts: int, pit_stops: int, incident_mentions: int) -> ModelOutput:
    logit = -3.2 + telemetry_dropouts * 0.18 + pit_stops * 0.12 + incident_mentions * 0.65
    probability = 1 / (1 + math.exp(-logit))
    return ModelOutput("DNF", driver_number, 0.55, {
        "probability": round(probability, 3), "risk": "HIGH" if probability >= 0.35 else "ELEVATED" if probability >= 0.15 else "LOW",
    })


def compute_models(features: dict[str, Any]) -> list[ModelOutput]:
    outputs = [safety_car_probability(
        int(features["control"].get("incidents") or 0),
        int(features["control"].get("yellows") or 0),
        features["wet"],
    )]
    maximum_samples = max((int(driver.get("telemetry_samples") or 0) for driver in features["drivers"]), default=0)
    for driver in features["drivers"]:
        number = int(driver["driver_number"])
        laps = [float(value) for value in (driver.get("lap_times") or [])]
        degradation = tyre_degradation(number, laps, driver.get("compound"))
        outputs.extend([
            degradation,
            pit_window(number, int(driver.get("current_lap") or 0), int(driver.get("tyre_age") or 0), float(degradation.output["secondsPerLap"])),
            strategy_comparison(number, int(driver.get("current_lap") or 0), float(degradation.output["secondsPerLap"])),
            dnf_probability(
                number,
                max(0, maximum_samples - int(driver.get("telemetry_samples") or 0)) // 100,
                int(driver.get("pit_stops") or 0),
                int(driver.get("incident_mentions") or 0),
            ),
        ])
    return outputs


def strategy_comparison(driver_number: int, current_lap: int, degradation: float, pit_loss: float = 22.0) -> ModelOutput:
    one_stop_cost = pit_loss + max(0, degradation) * 20
    two_stop_cost = pit_loss * 2 + max(0, degradation) * 7
    recommended = "TWO_STOP" if two_stop_cost + 1.5 < one_stop_cost else "ONE_STOP"
    delta = abs(one_stop_cost - two_stop_cost)
    return ModelOutput("STRATEGY", driver_number, 0.6, {
        "recommended": recommended, "oneStopCostSeconds": round(one_stop_cost, 2),
        "twoStopCostSeconds": round(two_stop_cost, 2), "estimatedAdvantageSeconds": round(delta, 2),
        "evaluatedAtLap": current_lap,
    })
