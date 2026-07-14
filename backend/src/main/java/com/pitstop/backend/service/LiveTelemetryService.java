package com.pitstop.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitstop.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LiveTelemetryService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final ReactiveRedisMessageListenerContainer listener;

    public List<Map<String, Object>> sessions() {
        return jdbc.queryForList("""
            SELECT provider_session_key AS "sessionKey", provider, year,
                   country_name AS "countryName", circuit_name AS "circuitName",
                   session_name AS "sessionName", session_type AS "sessionType",
                   starts_at AS "startsAt", ends_at AS "endsAt", status,
                   last_updated_at AS "lastUpdatedAt"
            FROM live_sessions ORDER BY starts_at DESC NULLS LAST LIMIT 50
            """);
    }

    public Map<String, Object> session(String sessionKey) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT provider_session_key AS "sessionKey", provider, year,
                   country_name AS "countryName", circuit_name AS "circuitName",
                   session_name AS "sessionName", session_type AS "sessionType",
                   starts_at AS "startsAt", ends_at AS "endsAt", status,
                   last_updated_at AS "lastUpdatedAt"
            FROM live_sessions WHERE provider_session_key = ?
            """, sessionKey);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Live session", "sessionKey", sessionKey);
        return rows.getFirst();
    }

    public List<Map<String, Object>> timing(String sessionKey) {
        long id = sessionId(sessionKey);
        return jdbc.queryForList("""
            SELECT d.driver_number AS "driverNumber", d.driver_code AS "driverCode",
                   d.full_name AS "fullName", d.team_name AS "teamName", d.team_colour AS "teamColour",
                   (SELECT t.position FROM live_timing t WHERE t.session_id=d.session_id
                       AND t.driver_number=d.driver_number AND t.position IS NOT NULL ORDER BY captured_at DESC LIMIT 1) position,
                   (SELECT t.interval_to_leader FROM live_timing t WHERE t.session_id=d.session_id
                       AND t.driver_number=d.driver_number AND t.interval_to_leader IS NOT NULL ORDER BY captured_at DESC LIMIT 1) AS "intervalToLeader",
                   (SELECT t.gap_to_leader FROM live_timing t WHERE t.session_id=d.session_id
                       AND t.driver_number=d.driver_number AND t.gap_to_leader IS NOT NULL ORDER BY captured_at DESC LIMIT 1) AS "gapToLeader",
                   COALESCE((SELECT MAX(l.lap_number) FROM live_laps l WHERE l.session_id=d.session_id
                       AND l.driver_number=d.driver_number),0) AS "lapNumber"
            FROM live_drivers d WHERE d.session_id=? ORDER BY position NULLS LAST, d.driver_number
            """, id);
    }

    public List<Map<String, Object>> laps(String sessionKey) {
        return jdbc.queryForList("""
            SELECT driver_number AS "driverNumber", lap_number AS "lapNumber", started_at AS "startedAt",
                   lap_duration AS "lapDuration", sector_1_duration AS "sector1Duration",
                   sector_2_duration AS "sector2Duration", sector_3_duration AS "sector3Duration",
                   speed_trap AS "speedTrap", is_pit_out_lap AS "pitOutLap"
            FROM live_laps WHERE session_id=? ORDER BY lap_number, driver_number
            """, sessionId(sessionKey));
    }

    public List<Map<String, Object>> telemetry(String sessionKey, int driverNumber, int requestedLimit) {
        int limit = Math.max(10, Math.min(requestedLimit, 5000));
        return jdbc.queryForList("""
            SELECT captured_at AS "capturedAt", speed, throttle, brake, gear, rpm, drs, x, y, z
            FROM live_telemetry WHERE session_id=? AND driver_number=?
            ORDER BY captured_at DESC LIMIT ?
            """, sessionId(sessionKey), driverNumber, limit).reversed();
    }

    public List<Map<String, Object>> stints(String sessionKey) {
        return jdbc.queryForList("""
            SELECT driver_number AS "driverNumber", stint_number AS "stintNumber",
                   lap_start AS "lapStart", lap_end AS "lapEnd", compound,
                   tyre_age_at_start AS "tyreAgeAtStart"
            FROM live_stints WHERE session_id=? ORDER BY driver_number, stint_number
            """, sessionId(sessionKey));
    }

    public List<Map<String, Object>> pitStops(String sessionKey) {
        return jdbc.queryForList("""
            SELECT driver_number AS "driverNumber", lap_number AS "lapNumber", stopped_at AS "stoppedAt",
                   pit_duration AS "stopDuration", lane_duration AS "laneDuration"
            FROM live_pit_stops WHERE session_id=? ORDER BY stopped_at DESC NULLS LAST
            """, sessionId(sessionKey));
    }

    public List<Map<String, Object>> raceControl(String sessionKey) {
        return jdbc.queryForList("""
            SELECT occurred_at AS "occurredAt", category, flag, scope, sector,
                   lap_number AS "lapNumber", driver_number AS "driverNumber", message
            FROM live_race_control WHERE session_id=? ORDER BY occurred_at DESC LIMIT 100
            """, sessionId(sessionKey));
    }

    public List<Map<String, Object>> weather(String sessionKey) {
        return jdbc.queryForList("""
            SELECT captured_at AS "capturedAt", air_temperature AS "airTemperature",
                   track_temperature AS "trackTemperature", humidity, pressure, rainfall,
                   wind_direction AS "windDirection", wind_speed AS "windSpeed"
            FROM live_weather WHERE session_id=? ORDER BY captured_at
            """, sessionId(sessionKey));
    }

    public List<Map<String, Object>> intelligence(String sessionKey) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT driver_number AS "driverNumber", model_type AS "modelType",
                   model_version AS "modelVersion", generated_at AS "generatedAt",
                   confidence, output::text AS output
            FROM live_intelligence WHERE session_id=? ORDER BY model_type, driver_number
            """, sessionId(sessionKey));
        return rows.stream().map(row -> {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            try {
                copy.put("output", objectMapper.readTree((String) row.get("output")));
            } catch (JsonProcessingException ex) {
                copy.put("output", Map.of());
            }
            return copy;
        }).toList();
    }

    public Flux<String> stream(String sessionKey) {
        sessionId(sessionKey);
        Flux<String> updates = listener.receive(ChannelTopic.of("pitstop:live:" + sessionKey))
                .map(message -> message.getMessage());
        Flux<String> heartbeat = Flux.interval(Duration.ofSeconds(15))
                .map(ignored -> "{\"event\":\"heartbeat\"}");
        return Flux.merge(updates, heartbeat);
    }

    private long sessionId(String sessionKey) {
        List<Long> ids = jdbc.query("SELECT id FROM live_sessions WHERE provider_session_key=?",
                (rs, rowNum) -> rs.getLong(1), sessionKey);
        if (ids.isEmpty()) throw new ResourceNotFoundException("Live session", "sessionKey", sessionKey);
        return ids.getFirst();
    }
}
