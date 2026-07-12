package com.pitstop.backend.controller;

import com.pitstop.backend.dto.ConstructorDto;
import com.pitstop.backend.dto.ConstructorStandingDto;
import com.pitstop.backend.dto.RaceResultDto;
import com.pitstop.backend.service.ConstructorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/constructors")
@RequiredArgsConstructor
public class ConstructorController {
    private final ConstructorService constructorService;

    @GetMapping
    public ResponseEntity<List<ConstructorDto>> getAll() {
        return ResponseEntity.ok(constructorService.findAll());
    }

    @GetMapping("/standings")
    public ResponseEntity<List<ConstructorStandingDto>> standings(@RequestParam Integer season) {
        return ResponseEntity.ok(constructorService.standings(season));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConstructorDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(constructorService.findById(id));
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<List<RaceResultDto>> results(
        @PathVariable Long id,
        @RequestParam Integer season
    ) {
        return ResponseEntity.ok(constructorService.findResults(id, season));
    }
}
