CREATE TABLE IF NOT EXISTS race_results (
    id               BIGSERIAL PRIMARY KEY,
    race_id          BIGINT  NOT NULL REFERENCES races(id),
    driver_id        BIGINT  NOT NULL REFERENCES drivers(id),
    constructor_id   BIGINT  NOT NULL REFERENCES constructors(id),
    grid_position    INTEGER,
    finish_position  INTEGER,
    points           NUMERIC(5,2),
    status           VARCHAR(100),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (race_id, driver_id)
);

CREATE INDEX idx_race_results_race     ON race_results(race_id);
CREATE INDEX idx_race_results_driver   ON race_results(driver_id);