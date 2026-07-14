CREATE TABLE live_sessions (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    provider_session_key VARCHAR(80) NOT NULL UNIQUE,
    meeting_key VARCHAR(80),
    year INTEGER NOT NULL,
    country_name VARCHAR(120),
    circuit_name VARCHAR(180),
    session_name VARCHAR(80) NOT NULL,
    session_type VARCHAR(40),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE live_drivers (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    driver_code VARCHAR(10),
    full_name VARCHAR(120),
    team_name VARCHAR(120),
    team_colour VARCHAR(12),
    PRIMARY KEY (session_id, driver_number)
);

CREATE TABLE live_timing (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    position INTEGER,
    interval_to_leader VARCHAR(30),
    gap_to_leader VARCHAR(30),
    lap_number INTEGER,
    in_pit BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (session_id, driver_number, captured_at)
);

CREATE TABLE live_laps (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    lap_duration DOUBLE PRECISION,
    sector_1_duration DOUBLE PRECISION,
    sector_2_duration DOUBLE PRECISION,
    sector_3_duration DOUBLE PRECISION,
    speed_trap DOUBLE PRECISION,
    is_pit_out_lap BOOLEAN,
    PRIMARY KEY (session_id, driver_number, lap_number)
);

CREATE TABLE live_telemetry (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    speed SMALLINT,
    throttle SMALLINT,
    brake SMALLINT,
    gear SMALLINT,
    rpm INTEGER,
    drs SMALLINT,
    x INTEGER,
    y INTEGER,
    z INTEGER,
    PRIMARY KEY (session_id, driver_number, captured_at)
);

CREATE TABLE live_stints (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    stint_number INTEGER NOT NULL,
    lap_start INTEGER,
    lap_end INTEGER,
    compound VARCHAR(30),
    tyre_age_at_start INTEGER,
    PRIMARY KEY (session_id, driver_number, stint_number)
);

CREATE TABLE live_pit_stops (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    stopped_at TIMESTAMP WITH TIME ZONE,
    pit_duration DOUBLE PRECISION,
    lane_duration DOUBLE PRECISION,
    PRIMARY KEY (session_id, driver_number, lap_number)
);

CREATE TABLE live_race_control (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    provider_event_key VARCHAR(120) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(60),
    flag VARCHAR(30),
    scope VARCHAR(30),
    sector INTEGER,
    lap_number INTEGER,
    driver_number INTEGER,
    message TEXT NOT NULL,
    PRIMARY KEY (session_id, provider_event_key)
);

CREATE TABLE live_weather (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    air_temperature DOUBLE PRECISION,
    track_temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    rainfall BOOLEAN,
    wind_direction INTEGER,
    wind_speed DOUBLE PRECISION,
    PRIMARY KEY (session_id, captured_at)
);

CREATE TABLE live_intelligence (
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    driver_number INTEGER NOT NULL DEFAULT 0,
    model_type VARCHAR(50) NOT NULL,
    model_version VARCHAR(80) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    confidence DOUBLE PRECISION,
    output JSONB NOT NULL,
    PRIMARY KEY (session_id, driver_number, model_type)
);

CREATE INDEX idx_live_timing_latest ON live_timing(session_id, captured_at DESC);
CREATE INDEX idx_live_laps_session_lap ON live_laps(session_id, lap_number);
CREATE INDEX idx_live_telemetry_driver_time ON live_telemetry(session_id, driver_number, captured_at DESC);
CREATE INDEX idx_live_race_control_time ON live_race_control(session_id, occurred_at DESC);
CREATE INDEX idx_live_weather_time ON live_weather(session_id, captured_at DESC);
