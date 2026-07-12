package com.pitstop.backend.controller;

import com.pitstop.backend.dto.ConstructorStandingDto;
import com.pitstop.backend.dto.DriverStandingDto;
import com.pitstop.backend.service.StandingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/standings")
@RequiredArgsConstructor
public class StandingsController {
    private final StandingsService standingsService;

    @GetMapping("/drivers")
    public ResponseEntity<List<DriverStandingDto>> drivers(@RequestParam Integer season) {
        return ResponseEntity.ok(standingsService.driverStandings(season));
    }

    @GetMapping("/constructors")
    public ResponseEntity<List<ConstructorStandingDto>> constructors(@RequestParam Integer season) {
        return ResponseEntity.ok(standingsService.constructorStandings(season));
    }
}
