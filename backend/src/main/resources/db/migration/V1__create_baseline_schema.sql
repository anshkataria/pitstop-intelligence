CREATE TABLE IF NOT EXISTS drivers (
    id          BIGSERIAL PRIMARY KEY,
    driver_ref  VARCHAR(50)  NOT NULL UNIQUE,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    nationality VARCHAR(100),
    date_of_birth DATE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS constructors (
    id               BIGSERIAL PRIMARY KEY,
    constructor_ref  VARCHAR(50)  NOT NULL UNIQUE,
    name             VARCHAR(100) NOT NULL,
    nationality      VARCHAR(100),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasons (
    year        INTEGER PRIMARY KEY,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS races (
    id           BIGSERIAL PRIMARY KEY,
    season_year  INTEGER      NOT NULL REFERENCES seasons(year),
    round        INTEGER      NOT NULL,
    name         VARCHAR(200) NOT NULL,
    circuit_name VARCHAR(200),
    country      VARCHAR(100),
    race_date    DATE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (season_year, round)
);

CREATE INDEX idx_races_season ON races(season_year);
CREATE INDEX idx_drivers_ref  ON drivers(driver_ref);