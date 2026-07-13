INSERT INTO seasons (year)
VALUES (2024)
ON CONFLICT (year) DO NOTHING;

INSERT INTO constructors (constructor_ref, name, nationality)
VALUES
    ('mclaren', 'McLaren', 'British'),
    ('red_bull', 'Red Bull Racing', 'Austrian'),
    ('ferrari', 'Ferrari', 'Italian')
ON CONFLICT (constructor_ref) DO UPDATE SET
    name = EXCLUDED.name,
    nationality = EXCLUDED.nationality,
    updated_at = NOW();

INSERT INTO drivers (driver_ref, first_name, last_name, nationality, date_of_birth)
VALUES
    ('norris', 'Lando', 'Norris', 'British', '1999-11-13'),
    ('max_verstappen', 'Max', 'Verstappen', 'Dutch', '1997-09-30'),
    ('leclerc', 'Charles', 'Leclerc', 'Monegasque', '1997-10-16')
ON CONFLICT (driver_ref) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    nationality = EXCLUDED.nationality,
    date_of_birth = EXCLUDED.date_of_birth,
    updated_at = NOW();

INSERT INTO races (season_year, round, name, circuit_name, country, race_date)
VALUES (2024, 1, 'Australian Grand Prix', 'Albert Park Circuit', 'Australia', '2024-03-24')
ON CONFLICT (season_year, round) DO UPDATE SET
    name = EXCLUDED.name,
    circuit_name = EXCLUDED.circuit_name,
    country = EXCLUDED.country,
    race_date = EXCLUDED.race_date,
    updated_at = NOW();

INSERT INTO race_results
    (race_id, driver_id, constructor_id, grid_position, finish_position, points, status)
SELECT
    race.id,
    driver.id,
    constructor.id,
    fixture.grid_position,
    fixture.finish_position,
    fixture.points,
    'Finished'
FROM (
    VALUES
        ('norris', 'mclaren', 2, 1, 25.0),
        ('max_verstappen', 'red_bull', 1, 2, 18.0),
        ('leclerc', 'ferrari', 3, 3, 15.0)
) AS fixture(driver_ref, constructor_ref, grid_position, finish_position, points)
JOIN races race ON race.season_year = 2024 AND race.round = 1
JOIN drivers driver ON driver.driver_ref = fixture.driver_ref
JOIN constructors constructor ON constructor.constructor_ref = fixture.constructor_ref
ON CONFLICT (race_id, driver_id) DO UPDATE SET
    constructor_id = EXCLUDED.constructor_id,
    grid_position = EXCLUDED.grid_position,
    finish_position = EXCLUDED.finish_position,
    points = EXCLUDED.points,
    status = EXCLUDED.status;
