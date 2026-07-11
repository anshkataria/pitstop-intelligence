package com.pitstop.backend.controller;

import com.pitstop.backend.dto.PredictionContextDto;
import com.pitstop.backend.service.PredictionContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/predictions")
@RequiredArgsConstructor
public class PredictionContextController {
    private final PredictionContextService service;

    @GetMapping("/context")
    public ResponseEntity<PredictionContextDto> getContext(
            @RequestParam Integer season, @RequestParam Integer round) {
        return ResponseEntity.ok(service.getContext(season, round));
    }
}
