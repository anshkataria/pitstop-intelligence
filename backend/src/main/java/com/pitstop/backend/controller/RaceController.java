package com.pitstop.backend.controller;

import com.pitstop.backend.dto.RaceDto;
import com.pitstop.backend.service.RaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/races")
@RequiredArgsConstructor
public class RaceController {

    private final RaceService raceService;

    @GetMapping("/season/{year}")
    public ResponseEntity<List<RaceDto>> getRacesBySeason(@PathVariable Integer year) {
        return ResponseEntity.ok(raceService.findBySeason(year));
    }

    @GetMapping("/season/{year}/round/{round}")
    public ResponseEntity<RaceDto> getRaceBySeasonAndRound(
            @PathVariable Integer year,
            @PathVariable Integer round) {
        return ResponseEntity.ok(raceService.findBySeasonAndRound(year, round));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RaceDto> getRaceById(@PathVariable Long id) {
        return ResponseEntity.ok(raceService.findById(id));
    }
}