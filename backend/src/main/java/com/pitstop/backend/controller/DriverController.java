package com.pitstop.backend.controller;

import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.dto.PagedResponse;
import com.pitstop.backend.dto.RaceResultDto;
import com.pitstop.backend.dto.DriverSeasonStatsDto;
import com.pitstop.backend.service.DriverService;
import com.pitstop.backend.service.RaceResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;
    private final RaceResultService raceResultService;

    @GetMapping
    public ResponseEntity<PagedResponse<DriverDto>> getAllDrivers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(driverService.search(search, page, size));
        }
        return ResponseEntity.ok(driverService.findAll(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DriverDto> getDriverById(@PathVariable Long id) {
        return ResponseEntity.ok(driverService.findById(id));
    }

    @GetMapping("/ref/{driverRef}")
    public ResponseEntity<DriverDto> getDriverByRef(@PathVariable String driverRef) {
        return ResponseEntity.ok(driverService.findByRef(driverRef));
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<java.util.List<RaceResultDto>> getDriverResults(
            @PathVariable Long id, @RequestParam Integer season) {
        return ResponseEntity.ok(raceResultService.findDriverResults(id, season));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<DriverSeasonStatsDto> getDriverStats(
            @PathVariable Long id, @RequestParam Integer season) {
        return ResponseEntity.ok(raceResultService.getDriverStats(id, season));
    }
}
