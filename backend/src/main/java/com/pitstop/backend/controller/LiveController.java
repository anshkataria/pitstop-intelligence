package com.pitstop.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.pitstop.backend.service.LiveReplayService;
import com.pitstop.backend.service.LiveTelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/live")
@RequiredArgsConstructor
public class LiveController {
    private final LiveTelemetryService service;
    private final LiveReplayService replayService;

    @GetMapping("/sessions") public List<Map<String, Object>> sessions() { return service.sessions(); }
    @GetMapping("/sessions/{key}") public Map<String, Object> session(@PathVariable String key) { return service.session(key); }
    @GetMapping("/sessions/{key}/timing") public List<Map<String, Object>> timing(@PathVariable String key) { return service.timing(key); }
    @GetMapping("/sessions/{key}/laps") public List<Map<String, Object>> laps(@PathVariable String key) { return service.laps(key); }
    @GetMapping("/sessions/{key}/stints") public List<Map<String, Object>> stints(@PathVariable String key) { return service.stints(key); }
    @GetMapping("/sessions/{key}/pit-stops") public List<Map<String, Object>> pitStops(@PathVariable String key) { return service.pitStops(key); }
    @GetMapping("/sessions/{key}/race-control") public List<Map<String, Object>> raceControl(@PathVariable String key) { return service.raceControl(key); }
    @GetMapping("/sessions/{key}/weather") public List<Map<String, Object>> weather(@PathVariable String key) { return service.weather(key); }
    @GetMapping("/sessions/{key}/intelligence") public List<Map<String, Object>> intelligence(@PathVariable String key) { return service.intelligence(key); }

    @GetMapping("/sessions/{key}/drivers/{driverNumber}/telemetry")
    public List<Map<String, Object>> telemetry(@PathVariable String key,
            @PathVariable int driverNumber, @RequestParam(defaultValue = "1000") int limit) {
        return service.telemetry(key, driverNumber, limit);
    }

    @GetMapping(value = "/sessions/{key}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@PathVariable String key) {
        return service.stream(key).map(data -> ServerSentEvent.builder(data).event("live-update").build());
    }

    @PostMapping("/replay")
    public JsonNode replay(@RequestBody JsonNode request) { return replayService.start(request); }
}
