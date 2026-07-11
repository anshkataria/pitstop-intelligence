CREATE TABLE IF NOT EXISTS prediction_runs (
    id            BIGSERIAL PRIMARY KEY,
    season_year   INTEGER NOT NULL,
    round         INTEGER NOT NULL,
    circuit_name  VARCHAR(200) NOT NULL,
    model_version VARCHAR(100),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_results (
    id                         BIGSERIAL PRIMARY KEY,
    prediction_run_id          BIGINT NOT NULL REFERENCES prediction_runs(id) ON DELETE CASCADE,
    driver_ref                 VARCHAR(50) NOT NULL,
    constructor_ref            VARCHAR(50) NOT NULL,
    grid_position              INTEGER NOT NULL,
    predicted_position         NUMERIC(5,2) NOT NULL,
    predicted_position_rounded INTEGER NOT NULL,
    confidence_range_low       INTEGER NOT NULL,
    confidence_range_high      INTEGER NOT NULL
);

CREATE INDEX idx_prediction_runs_season_round ON prediction_runs(season_year, round);
CREATE INDEX idx_prediction_results_run ON prediction_results(prediction_run_id);
